#!/usr/bin/env python3
"""
verify_license.py
-----------------
Queries the Israeli Ministry of Health Health Professions Registry
(https://practitioners.health.gov.il) using Selenium + Headless Chrome
to verify that a given license number exists, is valid, and is active.

Usage:
    python verify_license.py --license <LICENSE_NUMBER> --name <FULL_NAME>

Output:
    JSON to stdout — consumed by the C# LicenseVerificationService.

Exit codes:
    0 = ran successfully (check isValid / isActive in output JSON)
    1 = script-level error (output contains failureReason)

Dependencies (install once):
    pip install selenium webdriver-manager
"""

import sys
import json
import argparse
import time
import logging
from dataclasses import dataclass, asdict

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException

# webdriver-manager auto-downloads the correct ChromeDriver version
try:
    from webdriver_manager.chrome import ChromeDriverManager
    USE_DRIVER_MANAGER = True
except ImportError:
    USE_DRIVER_MANAGER = False

# Write logs to stderr so they don't pollute the JSON stdout
logging.basicConfig(level=logging.INFO, stream=sys.stderr,
                    format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────

REGISTRY_URL      = "https://practitioners.health.gov.il/Practitioners/Search"
PAGE_LOAD_TIMEOUT = 30
ELEMENT_TIMEOUT   = 20
POST_SUBMIT_WAIT  = 3.0   # seconds to wait after submitting the form

# ── Data model ────────────────────────────────────────────────────────────────

@dataclass
class VerificationResult:
    isValid:        bool
    isActive:       bool
    registeredName: str
    licenseNumber:  str
    failureReason:  str


# ── Driver factory ────────────────────────────────────────────────────────────

def create_driver() -> webdriver.Chrome:
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--window-size=1920,1080")
    opts.add_argument("--lang=he-IL")
    opts.add_argument("--disable-blink-features=AutomationControlled")
    opts.add_experimental_option("excludeSwitches", ["enable-automation"])
    opts.add_experimental_option("useAutomationExtension", False)

    if USE_DRIVER_MANAGER:
        logger.info("Using webdriver-manager to resolve ChromeDriver")
        service = Service(ChromeDriverManager().install())
        driver  = webdriver.Chrome(service=service, options=opts)
    else:
        logger.warning("webdriver-manager not installed — using system ChromeDriver")
        driver = webdriver.Chrome(options=opts)

    driver.set_page_load_timeout(PAGE_LOAD_TIMEOUT)
    driver.execute_cdp_cmd(
        "Page.addScriptToEvaluateOnNewDocument",
        {"source": "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"}
    )
    return driver


# ── Core verification ─────────────────────────────────────────────────────────

def verify_license(license_number: str, full_name: str) -> VerificationResult:
    driver = None
    try:
        driver = create_driver()
        wait   = WebDriverWait(driver, ELEMENT_TIMEOUT)

        logger.info("Navigating to %s", REGISTRY_URL)
        driver.get(REGISTRY_URL)

        # ── 1. Enter license number ───────────────────────────────────────────
        license_input = _find_first(wait, [
            "input[name='LicenseNumber']",
            "#licenseNumber",
            "input[placeholder*='רישיון']",
            "input[placeholder*='מספר']",
            "input[id*='icense']",
            "input[id*='License']",
            "input[type='text']",   # last-resort: first text input on page
        ], "license input")

        if license_input is None:
            # Dump page source to stderr for debugging
            logger.error("Could not find license input. Page title: %s", driver.title)
            logger.debug("Page source (first 2000 chars):\n%s", driver.page_source[:2000])
            return _fail(license_number, "Could not locate the license number input field. The government site may have changed its layout.")

        license_input.clear()
        license_input.send_keys(license_number)
        logger.info("Typed license number: %s", license_number)

        # ── 2. Enter name if field exists ─────────────────────────────────────
        name_input = _find_first(
            WebDriverWait(driver, 4), [
                "input[name='FullName']",
                "input[name='Name']",
                "#fullName",
                "input[placeholder*='שם']",
                "input[placeholder*='Name']",
            ],
            "name input",
            required=False
        )
        if name_input:
            name_input.clear()
            name_input.send_keys(full_name)
            logger.info("Typed full name: %s", full_name)

        # ── 3. Submit ─────────────────────────────────────────────────────────
        submit = _find_first(wait, [
            "button[type='submit']",
            "input[type='submit']",
            "button.search-btn",
            "button.btn-search",
            ".search-button",
            "[data-testid='search-btn']",
            "button:contains('חיפוש')",
        ], "submit button")

        if submit is None:
            logger.error("Submit button not found. Page title: %s", driver.title)
            return _fail(license_number, "Could not locate the search submit button.")

        submit.click()
        logger.info("Submitted. Waiting %.1fs for results…", POST_SUBMIT_WAIT)
        time.sleep(POST_SUBMIT_WAIT)

        # ── 4. Look for result rows ───────────────────────────────────────────
        row_selectors = [
            "tr.result-row",
            ".practitioner-row",
            "tbody > tr",
            ".search-result-item",
            ".practitioner-card",
            "li.result",
        ]
        rows = _find_all(wait, row_selectors, timeout=ELEMENT_TIMEOUT)

        if not rows:
            logger.warning("No result rows found for license %s", license_number)
            logger.debug("Page after submit (first 3000):\n%s", driver.page_source[:3000])
            return VerificationResult(
                isValid=False, isActive=False,
                registeredName="", licenseNumber=license_number,
                failureReason=f"License {license_number!r} was not found in the Ministry of Health registry."
            )

        logger.info("Found %d result row(s)", len(rows))

        # ── 5. Parse rows ─────────────────────────────────────────────────────
        for row in rows:
            text = row.text.strip()
            if not text or license_number not in text:
                continue

            name = _cell_text(row, [
                ".name-cell", "td:first-child", ".practitioner-name",
                "[data-label='שם']", "[data-label='Name']",
            ])
            status_raw = _cell_text(row, [
                ".status-cell", "td.status", ".license-status",
                "[data-label='סטטוס']", "[data-label='Status']",
            ])
            status = status_raw.lower()
            is_active = any(kw in status for kw in ("פעיל", "active", "valid", "בתוקף"))

            logger.info("Match: name=%r status=%r active=%s", name, status_raw, is_active)
            return VerificationResult(
                isValid=True, isActive=is_active,
                registeredName=name, licenseNumber=license_number,
                failureReason="" if is_active else f"License found but status is: {status_raw!r}"
            )

        logger.warning("License %s not found in any row text", license_number)
        return VerificationResult(
            isValid=False, isActive=False,
            registeredName="", licenseNumber=license_number,
            failureReason=f"License {license_number!r} was not matched in the registry results."
        )

    except WebDriverException as exc:
        logger.error("WebDriver error: %s", exc)
        return _fail(license_number, f"Browser automation error: {exc}")
    except Exception as exc:
        logger.exception("Unexpected error")
        return _fail(license_number, f"Unexpected error: {exc}")
    finally:
        if driver:
            try:
                driver.quit()
            except Exception:
                pass
            logger.info("Browser closed.")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _find_first(wait: WebDriverWait, selectors: list, label: str, required: bool = True):
    """Return the first element matched by any selector, or None if not found."""
    for sel in selectors:
        try:
            return wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, sel)))
        except TimeoutException:
            continue
    if required:
        logger.warning("Element not found: %s (tried %d selectors)", label, len(selectors))
    return None


def _find_all(wait: WebDriverWait, selectors: list, timeout: int = 15) -> list:
    """Return the first non-empty list of elements matched by any selector."""
    for sel in selectors:
        try:
            elements = wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, sel)))
            if elements:
                return elements
        except TimeoutException:
            continue
    return []


def _cell_text(row, selectors: list) -> str:
    for sel in selectors:
        try:
            return row.find_element(By.CSS_SELECTOR, sel).text.strip()
        except NoSuchElementException:
            continue
    # Fallback: return full row text (will be cleaned by caller)
    return ""


def _fail(license_number: str, reason: str) -> VerificationResult:
    return VerificationResult(
        isValid=False, isActive=False,
        registeredName="", licenseNumber=license_number,
        failureReason=reason
    )


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--license", required=True)
    parser.add_argument("--name",    required=True)
    args = parser.parse_args()

    result = verify_license(args.license.strip(), args.name.strip())
    print(json.dumps(asdict(result), ensure_ascii=False))


if __name__ == "__main__":
    main()
