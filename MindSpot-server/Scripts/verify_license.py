#!/usr/bin/env python3
"""
verify_license.py
-----------------
Queries the Israeli Ministry of Health Health Professions Registry
(https://practitioners.health.gov.il) using Selenium + Headless Chrome
to verify that a given license number exists, is valid, and is active.

Usage:
    python3 verify_license.py --license <LICENSE_NUMBER> --name <FULL_NAME>

Output:
    JSON to stdout — consumed by the C# LicenseVerificationService.

Exit codes:
    0 = ran successfully (check isValid / isActive in output JSON)
    1 = script-level error (output contains failureReason)
"""

import sys
import json
import argparse
import time
import logging
from dataclasses import dataclass, asdict

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException

# Write logs to stderr so they don't pollute the JSON stdout output
logging.basicConfig(level=logging.INFO, stream=sys.stderr,
                    format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────

REGISTRY_URL = "https://practitioners.health.gov.il/Practitioners/Search"
PAGE_LOAD_TIMEOUT = 25   # seconds
ELEMENT_TIMEOUT   = 15   # seconds
POST_CLICK_DELAY  = 2.5  # seconds to wait for AJAX results

# ── Data model ────────────────────────────────────────────────────────────────

@dataclass
class VerificationResult:
    isValid:        bool
    isActive:       bool
    registeredName: str
    licenseNumber:  str
    failureReason:  str


# ── Driver factory ────────────────────────────────────────────────────────────

def create_headless_driver() -> webdriver.Chrome:
    """Return a configured, stealthy headless Chrome driver."""
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--window-size=1920,1080")
    opts.add_argument("--lang=he-IL")
    # Reduce automation fingerprint
    opts.add_argument("--disable-blink-features=AutomationControlled")
    opts.add_experimental_option("excludeSwitches", ["enable-automation"])
    opts.add_experimental_option("useAutomationExtension", False)

    driver = webdriver.Chrome(options=opts)
    driver.set_page_load_timeout(PAGE_LOAD_TIMEOUT)
    # Remove the "webdriver" navigator property
    driver.execute_cdp_cmd(
        "Page.addScriptToEvaluateOnNewDocument",
        {"source": "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"}
    )
    return driver


# ── Core verification logic ───────────────────────────────────────────────────

def verify_license(license_number: str, full_name: str) -> VerificationResult:
    """
    Navigate to the Ministry of Health registry, search for the license,
    and return a structured result.

    NOTE: The CSS selectors below target the current structure of
    https://practitioners.health.gov.il — update them if the page changes.
    """
    driver = None
    try:
        driver = create_headless_driver()
        wait = WebDriverWait(driver, ELEMENT_TIMEOUT)

        logger.info("Navigating to registry: %s", REGISTRY_URL)
        driver.get(REGISTRY_URL)

        # ── 1. Enter license number ───────────────────────────────────────────
        # Try several common selector patterns; adjust to the live page.
        license_input_selectors = [
            "input[name='LicenseNumber']",
            "#licenseNumber",
            "input[placeholder*='רישיון']",
            "input[placeholder*='license']",
            "input[id*='icense']",
        ]
        license_input = _find_element_by_selectors(wait, license_input_selectors, "license number input")
        license_input.clear()
        license_input.send_keys(license_number)
        logger.info("Entered license number: %s", license_number)

        # ── 2. (Optional) Enter name to narrow results ────────────────────────
        name_input_selectors = [
            "input[name='FullName']",
            "#fullName",
            "input[placeholder*='שם']",
            "input[placeholder*='name']",
        ]
        try:
            name_input = _find_element_by_selectors(
                WebDriverWait(driver, 3), name_input_selectors, "name input", raise_on_miss=False
            )
            if name_input:
                name_input.clear()
                name_input.send_keys(full_name)
                logger.info("Entered full name: %s", full_name)
        except Exception:
            logger.info("Name field not found — skipping.")

        # ── 3. Submit search ──────────────────────────────────────────────────
        submit_selectors = [
            "button[type='submit']",
            "input[type='submit']",
            ".search-button",
            "[data-testid='search-btn']",
        ]
        submit_btn = _find_element_by_selectors(wait, submit_selectors, "submit button")
        submit_btn.click()
        logger.info("Search submitted, waiting for results...")
        time.sleep(POST_CLICK_DELAY)

        # ── 4. Wait for results table / list ─────────────────────────────────
        result_selectors = [
            ".result-row",
            "tr.practitioner-row",
            ".search-result-item",
            "tbody tr",
            ".practitioner-card",
        ]
        try:
            result_rows = _wait_for_any_elements(wait, result_selectors)
        except TimeoutException:
            logger.warning("No result rows found for license %s", license_number)
            return VerificationResult(
                isValid=False, isActive=False,
                registeredName="", licenseNumber=license_number,
                failureReason=f"License {license_number!r} not found in the Ministry of Health registry."
            )

        logger.info("Found %d result row(s)", len(result_rows))

        # ── 5. Parse each row ─────────────────────────────────────────────────
        for row in result_rows:
            row_text = row.text.strip()
            if not row_text:
                continue

            # Match on the exact license number string
            if license_number not in row_text:
                continue

            registered_name = _extract_cell(row, [
                ".name-cell", "td:nth-child(1)", ".practitioner-name",
                "[data-label='שם']", "[data-label='Name']",
            ])

            status_text = _extract_cell(row, [
                ".status-cell", "td.status", ".license-status",
                "[data-label='סטטוס']", "[data-label='Status']",
            ]).lower()

            is_active = any(kw in status_text for kw in ("פעיל", "active", "valid", "בתוקף"))
            failure = "" if is_active else f"License found but status is: {status_text!r}"

            logger.info("Match found — name: %r, status: %r, active: %s", registered_name, status_text, is_active)
            return VerificationResult(
                isValid=True, isActive=is_active,
                registeredName=registered_name, licenseNumber=license_number,
                failureReason=failure
            )

        # No row contained the license number
        logger.warning("License number %s not found in any result row", license_number)
        return VerificationResult(
            isValid=False, isActive=False,
            registeredName="", licenseNumber=license_number,
            failureReason=f"License {license_number!r} was not found in the registry results."
        )

    except WebDriverException as exc:
        logger.error("WebDriver error: %s", exc)
        return VerificationResult(
            isValid=False, isActive=False,
            registeredName="", licenseNumber=license_number,
            failureReason=f"Browser automation error: {exc}"
        )
    except Exception as exc:
        logger.exception("Unexpected error during license verification")
        return VerificationResult(
            isValid=False, isActive=False,
            registeredName="", licenseNumber=license_number,
            failureReason=f"Unexpected error: {exc}"
        )
    finally:
        if driver:
            driver.quit()
            logger.info("Browser closed.")


# ── Selector helpers ──────────────────────────────────────────────────────────

def _find_element_by_selectors(wait: WebDriverWait, selectors: list[str],
                                label: str, raise_on_miss: bool = True):
    """Try each CSS selector in order; return the first element found."""
    for selector in selectors:
        try:
            return wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, selector)))
        except TimeoutException:
            continue
    if raise_on_miss:
        raise TimeoutException(f"Could not locate element: {label!r}. Selectors tried: {selectors}")
    return None


def _wait_for_any_elements(wait: WebDriverWait, selectors: list[str]) -> list:
    """Return the first non-empty list of elements matched by any selector."""
    for selector in selectors:
        try:
            elements = wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, selector)))
            if elements:
                return elements
        except TimeoutException:
            continue
    raise TimeoutException(f"No result elements found. Selectors tried: {selectors}")


def _extract_cell(row, selectors: list[str]) -> str:
    """Extract text from the first matching child element; empty string if none."""
    for selector in selectors:
        try:
            return row.find_element(By.CSS_SELECTOR, selector).text.strip()
        except NoSuchElementException:
            continue
    return ""


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Verify a therapist license against the Ministry of Health registry."
    )
    parser.add_argument("--license", required=True, help="License number to verify")
    parser.add_argument("--name",    required=True, help="Full name claimed by the therapist")
    args = parser.parse_args()

    result = verify_license(args.license.strip(), args.name.strip())

    # Print JSON to stdout — this is what the C# process reads
    print(json.dumps(asdict(result), ensure_ascii=False))


if __name__ == "__main__":
    main()
