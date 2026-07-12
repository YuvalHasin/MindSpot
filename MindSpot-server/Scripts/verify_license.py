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

import os
import sys
import json
import argparse
import time
import logging
import urllib.parse
from dataclasses import dataclass, asdict

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException

try:
    from webdriver_manager.chrome import ChromeDriverManager
    USE_DRIVER_MANAGER = True
except ImportError:
    USE_DRIVER_MANAGER = False

logging.basicConfig(level=logging.INFO, stream=sys.stderr,
                    format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

REGISTRY_BASE     = "https://practitioners.health.gov.il/Practitioners/search"
PAGE_LOAD_TIMEOUT = 30
ANGULAR_BOOT_WAIT = 4    # seconds for initial Angular render before scrolling
ELEMENT_TIMEOUT   = 15

# ── Hebrew character range (Unicode block) ────────────────────────────────────
_HEB_START = 'א'
_HEB_END   = 'ת'


def _is_hebrew(text: str) -> bool:
    """Return True if the string contains at least one Hebrew letter."""
    return any(_HEB_START <= ch <= _HEB_END for ch in text)


def ensure_hebrew(name: str) -> str:
    """
    If *name* is written in Latin script (English), translate it to Hebrew
    using Google Translate via deep-translator before the registry lookup.
    Hebrew names are returned as-is.
    """
    if _is_hebrew(name):
        return name                          # already Hebrew (or mixed)

    logger.info("Name '%s' appears to be in Latin script — translating to Hebrew…", name)
    try:
        from deep_translator import GoogleTranslator          # pip install deep-translator
        translated = GoogleTranslator(source="auto", target="iw").translate(name)
        logger.info("Translated '%s' → '%s'", name, translated)
        return translated
    except ImportError:
        logger.warning("deep-translator not installed (pip install deep-translator). "
                       "Searching with original name.")
        return name
    except Exception as exc:
        logger.warning("Translation failed (%s) — falling back to original name.", exc)
        return name


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

    # Run headless when CHROME_HEADLESS=1 (set automatically by Docker / the
    # production deployment).  In local dev the env var is absent so a real
    # browser window opens, which makes debugging easier.
    if os.environ.get("CHROME_HEADLESS", "0") == "1":
        opts.add_argument("--headless=new")

    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--window-size=1920,1080")
    opts.add_argument("--lang=he-IL")
    opts.add_argument("--disable-blink-features=AutomationControlled")
    opts.add_experimental_option("excludeSwitches", ["enable-automation"])
    opts.add_experimental_option("useAutomationExtension", False)

    # CHROMEDRIVER_PATH lets Docker (or CI) point at a pre-installed system
    # chromedriver so webdriver-manager doesn't try to download it at runtime.
    chromedriver_path = os.environ.get("CHROMEDRIVER_PATH", "")
    if chromedriver_path:
        logger.info("Using system ChromeDriver at %s", chromedriver_path)
        service = Service(chromedriver_path)
        driver  = webdriver.Chrome(service=service, options=opts)
    elif USE_DRIVER_MANAGER:
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

        # ── המרת שם מלטינית לעברית אם נדרש ─────────────────────────────────
        hebrew_name = ensure_hebrew(full_name)

        # ── ניווט ישיר ל-URL עם query params ────────────────────────────────
        # האתר תומך ב: /Practitioners/search?name=...&license=...
        # (lowercase 'search' — uppercase 'Search' מפנה לדף ריק)
        params = urllib.parse.urlencode({"name": hebrew_name, "license": license_number})
        search_url = f"{REGISTRY_BASE}?{params}"
        logger.info("Navigating directly to: %s", search_url)
        driver.get(search_url)

        # ── המתנה קצרה ל-Angular לטעון את ה-component ──────────────────────
        logger.info("Waiting for Angular initial render...")
        time.sleep(4)

        logger.info("Page title: %s | URL: %s", driver.title, driver.current_url)

        # ── גלילה למטה לחשיפת אזור התוצאות לפני שמחפשים שורות ──────────────
        logger.info("Scrolling down to reveal results area...")
        driver.execute_script("window.scrollBy(0, 400);")
        time.sleep(1)
        driver.execute_script("window.scrollBy(0, 400);")
        time.sleep(1)

        # ── 6. המתנה נוספת ואז JS scan ישיר על ה-DOM ────────────────────────
        # CSS selectors לא אמינים ב-Angular — נשתמש ב-JS שסורק את כל הדף
        time.sleep(2)

        logger.info("Scanning page via JavaScript...")
        js_result = driver.execute_script("""
            var licenseTarget = arguments[0];

            // --- ניסיון 1: חיפוש ב-mat-row / tr ב-DOM ---
            var rowSelectors = ['mat-row', 'tr', '[role="row"]', '.mat-row'];
            for (var s = 0; s < rowSelectors.length; s++) {
                var rows = document.querySelectorAll(rowSelectors[s]);
                for (var i = 0; i < rows.length; i++) {
                    var txt = (rows[i].textContent || '').trim();
                    if (!txt || !txt.includes(licenseTarget)) continue;

                    var cells = rows[i].querySelectorAll('mat-cell, td, [role="gridcell"], [role="cell"]');
                    var cellTexts = Array.from(cells).map(function(c){ return c.textContent.trim(); });

                    // חיפוש שם (תא ראשון עם תוכן)
                    var firstName = cellTexts.find(function(t){ return t.length > 1; }) || '';
                    // חיפוש סטטוס (תא עם מילת מפתח)
                    var statusKeywords = ['בתוקף','מורשה','פעיל','מוקפא','לא פעיל','active','inactive','valid'];
                    var statusCell = '';
                    for (var k = 0; k < statusKeywords.length; k++) {
                        var found = cellTexts.find(function(t){ return t.includes(statusKeywords[k]); });
                        if (found) { statusCell = found; break; }
                    }
                    // fallback: התא האחרון עם תוכן
                    if (!statusCell) {
                        for (var j = cellTexts.length-1; j >= 0; j--) {
                            if (cellTexts[j].length > 1) { statusCell = cellTexts[j]; break; }
                        }
                    }

                    return { rowText: txt.substring(0,300), firstName: firstName,
                             statusCell: statusCell, cellTexts: cellTexts };
                }
            }

            // --- ניסיון 2: חיפוש ב-innerText של כל body ---
            var bodyText = document.body.innerText || '';
            if (bodyText.includes(licenseTarget)) {
                // מציאת הקטע שמכיל את מספר הרישיון
                var idx = bodyText.indexOf(licenseTarget);
                var snippet = bodyText.substring(Math.max(0, idx-100), idx+200);
                return { rowText: snippet, firstName: '', statusCell: '', bodyFallback: true };
            }

            return null;
        """, license_number)

        if not js_result:
            # בדיקה מפורשת אם יש "0 תוצאות"
            page_text = driver.page_source
            no_result_phrases = ["נמצאו 0 תוצאות", "לא נמצאו תוצאות", "0 results"]
            if any(p in page_text for p in no_result_phrases):
                return VerificationResult(
                    isValid=False, isActive=False,
                    registeredName="", licenseNumber=license_number,
                    failureReason=f"License {license_number!r} was not found in the Ministry of Health registry."
                )
            logger.debug("Page source:\n%s", page_text[:5000])
            return _fail(license_number, "License not found in page after scroll and JS scan.")

        logger.info("JS scan result: %s", json.dumps(js_result, ensure_ascii=False))

        if js_result.get("bodyFallback"):
            # מצאנו את הרישיון בטקסט הדף אבל לא בתוך שורת טבלה מוגדרת
            snippet = js_result.get("rowText", "")
            status_raw = ""
            for kw in ("בתוקף", "מורשה", "פעיל", "active", "valid"):
                if kw in snippet:
                    # חלץ את המשפט שמכיל את מילת המפתח
                    for part in snippet.split("\n"):
                        if kw in part:
                            status_raw = part.strip()
                            break
                    break
            is_active = bool(status_raw)
            return VerificationResult(
                isValid=True, isActive=is_active,
                registeredName=full_name, licenseNumber=license_number,
                failureReason="" if is_active else "License found but status unclear."
            )

        status_raw   = js_result.get("statusCell", "")
        status_lower = status_raw.lower()
        is_active    = any(kw in status_lower for kw in
                           ("בתוקף", "מורשה", "פעיל", "active", "valid"))

        registered_name = js_result.get("firstName", full_name) or full_name

        logger.info("Match: name=%r status=%r active=%s", registered_name, status_raw, is_active)
        return VerificationResult(
            isValid=True,
            isActive=is_active,
            registeredName=registered_name,
            licenseNumber=license_number,
            failureReason="" if is_active else f"License found but status is: {status_raw!r}"
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


# ── JS-based input discovery ──────────────────────────────────────────────────

def _log_all_buttons(driver):
    """לוג לכל הכפתורים שנמצאו — לאבחון."""
    result = driver.execute_script("""
        return Array.from(document.querySelectorAll('button')).map(function(el) {
            return {
                type:      el.type || '',
                text:      el.textContent.trim().substring(0, 60),
                className: el.className.substring(0, 100),
                disabled:  el.disabled,
                visible:   el.offsetParent !== null,
                attrs:     Array.from(el.attributes).map(function(a){
                               return a.name + '=' + a.value.substring(0,30);
                           }).join(' | ')
            };
        });
    """)
    logger.info("=== ALL BUTTONS ON PAGE (%d found) ===", len(result))
    for i, btn in enumerate(result):
        logger.info("  button[%d]: visible=%s disabled=%s text=%r class=%r attrs=%r",
                    i, btn['visible'], btn['disabled'],
                    btn['text'], btn['className'][:80], btn['attrs'][:120])


def _log_all_inputs(driver):
    """לוג לכל ה-inputs שנמצאו — שימושי לאבחון."""
    result = driver.execute_script("""
        var inputs = document.querySelectorAll('input');
        return Array.from(inputs).map(function(el) {
            return {
                id:               el.id || '',
                name:             el.name || '',
                type:             el.type || '',
                placeholder:      el.placeholder || '',
                formcontrolname:  el.getAttribute('formcontrolname') || '',
                ngReflectName:    el.getAttribute('ng-reflect-name') || '',
                ariaLabel:        el.getAttribute('aria-label') || '',
                className:        el.className.substring(0, 80)
            };
        });
    """)
    logger.info("=== ALL INPUTS ON PAGE (%d found) ===", len(result))
    for i, inp in enumerate(result):
        filtered = {k: v for k, v in inp.items() if v}
        logger.info("  input[%d]: %s", i, json.dumps(filtered, ensure_ascii=False))


def _get_visible_text_inputs(driver) -> list:
    """מחזיר את כל ה-inputs הנראים מסוג text/number לפי סדר ה-DOM."""
    return driver.execute_script("""
        return Array.from(document.querySelectorAll('input')).filter(function(el) {
            return (el.type === 'text' || el.type === 'number' || el.type === '') &&
                   el.offsetParent !== null;
        });
    """)


def _find_input_by_js(driver, license_number: str):
    """
    מחפש את שדה מספר הרישיון.
    ב-Angular Material ה-label הוא <mat-label> ולא placeholder על ה-input —
    לכן מחפשים את ה-mat-form-field שה-mat-label שלו מכיל 'רישיון'.
    """
    el = driver.execute_script("""
        // priority 1: formcontrolname / ng-reflect-name על ה-input עצמו
        var inputs = Array.from(document.querySelectorAll('input'));
        var byFcn = inputs.find(function(el) {
            var fcn = (el.getAttribute('formcontrolname') || '').toLowerCase();
            var ngr = (el.getAttribute('ng-reflect-name') || '').toLowerCase();
            return fcn.includes('license') || fcn.includes('רישיון') ||
                   ngr.includes('license') || ngr.includes('רישיון');
        });
        if (byFcn) return byFcn;

        // priority 2: placeholder רגיל על ה-input
        var byPh = inputs.find(function(el) {
            var ph = (el.placeholder || '').toLowerCase();
            return ph.includes('רישיון') || ph.includes('license');
        });
        if (byPh) return byPh;

        // priority 3: mat-label בתוך אותו mat-form-field
        // (Angular Material שם את ה-label ב-<mat-label> ולא כ-placeholder)
        var fields = Array.from(document.querySelectorAll('mat-form-field'));
        for (var i = 0; i < fields.length; i++) {
            var label = fields[i].querySelector('mat-label, label');
            if (label) {
                var txt = label.textContent.toLowerCase();
                if (txt.includes('רישיון') || txt.includes('license') || txt.includes('מספר רישיון')) {
                    var inp = fields[i].querySelector('input');
                    if (inp) return inp;
                }
            }
        }

        // priority 4: aria-label
        var byAria = inputs.find(function(el) {
            var al = (el.getAttribute('aria-label') || '').toLowerCase();
            return al.includes('רישיון') || al.includes('license');
        });
        if (byAria) return byAria;

        // priority 5: input הנראה ה-2 (שם=1, רישיון=2, מומחיות=3)
        var visible = inputs.filter(function(el) {
            return (el.type === 'text' || el.type === 'number' || el.type === '') &&
                   el.offsetParent !== null;
        });
        return visible.length >= 2 ? visible[1] : (visible[0] || null);
    """)
    return el


def _find_name_input(driver):
    """
    מחפש שדה שם — mat-label 'שם' תחילה, אחרת ה-input הנראה הראשון.
    """
    return driver.execute_script("""
        var inputs = Array.from(document.querySelectorAll('input'));

        // priority 1: formcontrolname / ng-reflect-name
        var byAttr = inputs.find(function(el) {
            var fcn = (el.getAttribute('formcontrolname') || '').toLowerCase();
            var ngr = (el.getAttribute('ng-reflect-name') || '').toLowerCase();
            var ph  = (el.placeholder || '').toLowerCase();
            var al  = (el.getAttribute('aria-label') || '').toLowerCase();
            return fcn.includes('name') || fcn.includes('שם') ||
                   ngr.includes('name') || ngr.includes('שם') ||
                   ph.includes('שם')   || ph.includes('name') ||
                   al.includes('שם')   || al.includes('name');
        });
        if (byAttr) return byAttr;

        // priority 2: mat-label 'שם'
        var fields = Array.from(document.querySelectorAll('mat-form-field'));
        for (var i = 0; i < fields.length; i++) {
            var label = fields[i].querySelector('mat-label, label');
            if (label) {
                var txt = label.textContent.trim();
                if (txt === 'שם' || txt.toLowerCase().includes('name')) {
                    var inp = fields[i].querySelector('input');
                    if (inp) return inp;
                }
            }
        }

        // priority 3: ראשון נראה (שדה השם ראשון בדף)
        return inputs.find(function(el) {
            return (el.type === 'text' || el.type === '') &&
                   el.offsetParent !== null;
        }) || null;
    """)


def _angular_fill(driver, element, value: str):
    """
    מזין ערך לשדה mat-autocomplete-trigger של Angular.
    שלבים: לחיצה → ניקוי → הקלדה → סגירת ה-autocomplete dropdown → אירועי Angular.
    """
    # 1. לחיצה להפעלת ה-focus
    element.click()
    time.sleep(0.3)

    # 2. ניקוי תוכן קיים
    element.send_keys(Keys.CONTROL + "a")
    element.send_keys(Keys.DELETE)
    time.sleep(0.2)

    # 3. הקלדה תו-תו (מפעיל keydown/keypress/keyup — Angular מאזין לכולם)
    element.send_keys(value)
    time.sleep(0.4)

    # 4. Escape — סוגר את ה-mat-autocomplete dropdown בלי לאבד את מה שהוקלד
    element.send_keys(Keys.ESCAPE)
    time.sleep(0.2)

    # 5. dispatch ידני של אירועי Angular reactive-forms
    driver.execute_script("""
        var el = arguments[0];
        var val = arguments[1];

        // כתיבה ישירה לתכונת value דרך ה-native setter
        var setter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, val);

        // אירועים שAngular's ReactiveFormsModule מאזין להם
        el.dispatchEvent(new Event('input',  { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur',   { bubbles: true }));
    """, element, value)
    time.sleep(0.3)


# ── Submit button ─────────────────────────────────────────────────────────────

def _find_submit(driver):
    """מחפש כפתור חיפוש — CSS לפני XPath."""
    css_selectors = [
        # הכפתור הספציפי של אתר משרד הבריאות
        "button.icon-search",
        "button[aria-label='חיפוש']",
        "button[aria-label='Search']",
        # type=submit רגיל
        "button[type='submit']",
        "input[type='submit']",
        # Angular Material FAB
        "button[mat-fab]",
        "button[mat-mini-fab]",
        "button.mat-fab",
        "button.mat-mini-fab",
        "button.mdc-fab",
        # Angular Material רגיל
        "button[mat-raised-button]",
        "button[mat-flat-button]",
        "button[mat-icon-button]",
        "button.mat-raised-button",
        "button.mat-flat-button",
        "button.mat-primary",
    ]
    for sel in css_selectors:
        try:
            return WebDriverWait(driver, 3).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, sel))
            )
        except TimeoutException:
            continue

    # XPath — aria-label ואיקון עדשה
    for xpath in [
        "//button[@aria-label='חיפוש']",
        "//button[@aria-label='Search']",
        "//button[contains(@class,'icon-search')]",
        "//button[.//mat-icon[contains(text(),'search')]]",
        "//button[contains(., 'חיפוש') and not(@style[contains(.,'display:none')])]",
        "//input[@value='חיפוש']",
        "//input[@value='Search']",
    ]:
        try:
            return WebDriverWait(driver, 3).until(
                EC.element_to_be_clickable((By.XPATH, xpath))
            )
        except TimeoutException:
            continue

    # אחרון: כל כפתור נראה שיש לו mat-icon בתוכו (כפתורי אייקון)
    try:
        buttons = driver.find_elements(By.CSS_SELECTOR, "button")
        for btn in buttons:
            if btn.is_displayed() and btn.is_enabled():
                icon = None
                try:
                    icon = btn.find_element(By.TAG_NAME, "mat-icon")
                except Exception:
                    pass
                if icon is not None:
                    logger.info("Found icon button: class=%s text=%r",
                                btn.get_attribute("class"), btn.text.strip())
                    return btn
    except Exception:
        pass

    return None


# ── Generic helpers ───────────────────────────────────────────────────────────

def _extract_column(row, selectors: list) -> str:
    for sel in selectors:
        try:
            el = row.find_element(By.CSS_SELECTOR, sel)
            text = el.text.strip()
            if text:
                return text
        except NoSuchElementException:
            continue
    return ""


def _digits_exact_match(target: str, row_digits: str) -> bool:
    """בדיקה שהמספר מופיע כמספר עצמאי ולא כחלק ממספר אחר."""
    idx = row_digits.find(target)
    while idx != -1:
        before = (idx == 0) or not row_digits[idx - 1].isdigit()
        after  = (idx + len(target) == len(row_digits)) or not row_digits[idx + len(target)].isdigit()
        if before and after:
            return True
        idx = row_digits.find(target, idx + 1)
    return False


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
