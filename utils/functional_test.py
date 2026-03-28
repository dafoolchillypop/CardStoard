#!/usr/bin/env python3
"""
utils/functional_test.py
--------------------------
CardStoard Full Functional Test Suite

Covers 41 tests across all inventory types and auth flows:
  AUTH (5)  — gating checks, login, /auth/me, logout
  CARDS (9) — full CRUD + validate-csv + export + count
  BALLS (5) — full CRUD
  WAX (5)   — full CRUD (wax boxes)
  PACKS (5) — full CRUD (wax packs)
  BOXES (5) — full CRUD (boxes/binders)
  DICT (3)  — list, count, search
  ANALYTICS (1) — summary
  SETTINGS (2)  — get + update roundtrip

Usage:
  python3 utils/functional_test.py --local           # http://localhost:8000
  python3 utils/functional_test.py --url URL         # custom base URL
  python3 utils/functional_test.py --log PATH        # custom log path

Credentials: set CARDSTOARD_EMAIL / CARDSTOARD_PASSWORD in ~/.cardstoard.env
or as env vars.  Defaults to smoketest@cardstoard.dev / SmokeTest999.

Seed strategy: creates test items, tracks their IDs, deletes them in a
`finally` block — DB is left clean regardless of pass/fail.

Exit code: 0 = all pass, 1 = any failure.
"""
import argparse
import json
import os
import shutil
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from http.cookiejar import CookieJar

# ─── Defaults ────────────────────────────────────────────────────────────────
DEFAULT_EMAIL    = "smoketest@cardstoard.dev"
DEFAULT_PASSWORD = os.getenv("CARDSTOARD_PASSWORD", "SmokeTest999")
DEFAULT_LOCAL    = "http://localhost:8000"
LOG_DIR          = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")

# ─── ANSI colours ────────────────────────────────────────────────────────────
GRN = "\033[0;32m"
RED = "\033[0;31m"
CYN = "\033[1;36m"
BLD = "\033[1m"
NC  = "\033[0m"

# ─── Table layout — adaptive to terminal width ────────────────────────────────
# Overhead per row: "| " + " | " + " | " + " |" = 10 chars of borders/spaces
_TERM_COLS = shutil.get_terminal_size(fallback=(80, 24)).columns
W_RESULT   = 7          # fixed: "✓ PASS " or "✗ FAIL "
_REMAINING = _TERM_COLS - 10 - W_RESULT
W_TEST     = max(28, min(46, _REMAINING - 22))   # test name column
W_DETAIL   = max(16, min(32, _REMAINING - W_TEST))  # detail column

_SEP = (
    "+" + "-" * (W_TEST + 2)
    + "+" + "-" * (W_RESULT + 2)
    + "+" + "-" * (W_DETAIL + 2)
    + "+"
)


def _fmt_row(label: str, result: str, detail: str, color: str = "") -> str:
    nc = NC if color else ""
    return (
        f"| {label:<{W_TEST}} "
        f"| {color}{result:<{W_RESULT}}{nc} "
        f"| {detail:<{W_DETAIL}} |"
    )


# ─── Helpers ─────────────────────────────────────────────────────────────────

def load_env():
    """Source ~/.cardstoard.env key=value pairs into os.environ (no clobber)."""
    env_path = os.path.expanduser("~/.cardstoard.env")
    if not os.path.isfile(env_path):
        return
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            os.environ.setdefault(key, val)


def parse_args():
    p = argparse.ArgumentParser(description="CardStoard Functional Test Suite")
    p.add_argument("--local", action="store_true",
                   help="Target http://localhost:8000 (default)")
    p.add_argument("--url",   default=None,
                   help="Custom base URL (overrides --local)")
    p.add_argument("--log",   default=None,
                   help="Custom log file path")
    return p.parse_args()


def _multipart_body(file_name: str, file_content, content_type: str = "text/csv"):
    """Build a minimal multipart/form-data body for a single file field."""
    boundary = b"----FuncTestBoundary7788"
    if isinstance(file_content, str):
        file_content = file_content.encode("utf-8")
    body = (
        b"--" + boundary + b"\r\n"
        + b'Content-Disposition: form-data; name="file"; filename="'
        + file_name.encode()
        + b'"\r\n'
        + b"Content-Type: "
        + content_type.encode()
        + b"\r\n\r\n"
        + file_content
        + b"\r\n--"
        + boundary
        + b"--\r\n"
    )
    ct = "multipart/form-data; boundary=" + boundary.decode()
    return body, ct


# ─── TestRunner ──────────────────────────────────────────────────────────────

class TestRunner:
    def __init__(self, base_url: str, email: str, password: str):
        self.base_url = base_url.rstrip("/")
        self.email    = email
        self.password = password
        self.results  = []   # list of (suite, name, ok, detail)
        self.ids      = {}   # created item IDs for cleanup

        self._cookie_jar = CookieJar()
        self._opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self._cookie_jar)
        )

    # ── Core primitives ──────────────────────────────────────────────────────

    def record(self, suite: str, name: str, ok: bool, detail: str = ""):
        self.results.append((suite, name, ok, detail))
        # Stream each row to stdout immediately — no scrolling surprises
        label    = f"[{suite}] {name}"[:W_TEST]
        result   = "✓ PASS" if ok else "✗ FAIL"
        color    = GRN if ok else RED
        detail_s = (detail or "")[:W_DETAIL]
        print(_fmt_row(label, result, detail_s, color), flush=True)

    def api(self, method: str, path: str, *, json_body=None, multipart=None,
            params=None):
        """Make an HTTP request. Returns (status_code, parsed_body_or_dict)."""
        url = self.base_url + path
        if params:
            url += "?" + urllib.parse.urlencode(params)

        data    = None
        headers = {}

        if json_body is not None:
            data = json.dumps(json_body).encode("utf-8")
            headers["Content-Type"] = "application/json"
        elif multipart is not None:
            file_name, file_content = multipart
            data, ct = _multipart_body(file_name, file_content)
            headers["Content-Type"] = ct

        req = urllib.request.Request(url, data=data, headers=headers, method=method)

        try:
            resp = self._opener.open(req)
            status = resp.status
            body   = resp.read()
        except urllib.error.HTTPError as e:
            status = e.code
            body   = e.read()
        except Exception as e:
            return 0, {"_error": str(e)}

        try:
            parsed = json.loads(body)
        except Exception:
            parsed = {"_raw": body.decode("utf-8", errors="replace")}

        return status, parsed

    # ── Orchestration ─────────────────────────────────────────────────────────

    def run_all(self):
        self.suite_auth_open()
        self.suite_auth_login()
        self.suite_cards()
        self.suite_balls()
        self.suite_wax()
        self.suite_packs()
        self.suite_boxes()
        self.suite_dictionary()
        self.suite_analytics()
        self.suite_settings()
        self.suite_auth_logout()

    def cleanup(self):
        """DELETE any items that were created but not yet deleted (best-effort)."""
        cleanup_map = [
            ("card_id", "DELETE", "/cards/"),
            ("ball_id", "DELETE", "/balls/"),
            ("wax_id",  "DELETE", "/wax/"),
            ("pack_id", "DELETE", "/packs/"),
            ("box_id",  "DELETE", "/boxes/"),
        ]
        for key, method, prefix in cleanup_map:
            item_id = self.ids.get(key)
            if item_id:
                try:
                    self.api(method, f"{prefix}{item_id}")
                except Exception:
                    pass

    # ── Reporting ─────────────────────────────────────────────────────────────

    def report(self, log_path: str = None) -> int:
        """Print closing footer to stdout, write full log file, return 0=pass 1=fail.

        Each test row is already printed in real-time by record(), so this
        method only needs to close the table and persist the log.
        """
        total  = len(self.results)
        passed = sum(1 for _, _, ok, _ in self.results if ok)
        failed = total - passed

        # Close the streaming table
        summary_color = GRN if failed == 0 else RED
        print(_SEP)
        print(_fmt_row("RESULTS", f"{passed}/{total}", f"{failed} failed", summary_color))
        print(_SEP)

        # Write the full plain-text table to the log file
        log_lines = [_SEP, _fmt_row("Test", "Result", "Detail"), _SEP]
        for suite, name, ok, detail in self.results:
            label    = f"[{suite}] {name}"[:W_TEST]
            result   = "PASS" if ok else "FAIL"
            detail_s = (detail or "")[:W_DETAIL]
            log_lines.append(_fmt_row(label, result, detail_s))
        log_lines += [
            _SEP,
            _fmt_row("RESULTS", f"{passed}/{total}", f"{failed} failed"),
            _SEP,
        ]

        if log_path:
            os.makedirs(os.path.dirname(log_path), exist_ok=True)
            with open(log_path, "w") as f:
                f.write(
                    f"CardStoard Functional Test — "
                    f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
                )
                f.write(f"Target: {self.base_url}\n")
                f.write(f"User:   {self.email}\n\n")
                for line in log_lines:
                    f.write(line + "\n")
            print(f"\nLog: {log_path}")

        return 0 if failed == 0 else 1

    # ── Test Suites ───────────────────────────────────────────────────────────

    def suite_auth_open(self):
        """Auth gating: confirm protected endpoints return 401 without a cookie."""
        checks = [
            ("GET",  "/cards/",    None),
            ("GET",  "/settings/", None),
            ("POST", "/chat/",     {"message": "hi"}),
        ]
        for method, path, body in checks:
            name = f"Auth gating — {path}"
            if method == "GET":
                status, _ = self.api("GET", path)
            else:
                status, _ = self.api(method, path, json_body=body)
            ok = status == 401
            self.record(
                "AUTH", name, ok,
                "401 as expected" if ok else f"expected 401, got {status}",
            )

    def suite_auth_login(self):
        """Login and verify /auth/me reflects the correct user."""
        status, body = self.api("POST", "/auth/login", json_body={
            "identifier": self.email,
            "password":   self.password,
        })
        ok = status == 200
        username = ""
        if ok and isinstance(body, dict):
            user = body.get("user", {})
            username = user.get("username") or user.get("email", "?")
        self.record(
            "AUTH", "Login", ok,
            f"user: {username}" if ok else f"HTTP {status}",
        )

        status2, body2 = self.api("GET", "/auth/me")
        ok2 = status2 == 200
        uname = body2.get("username", "") if isinstance(body2, dict) else ""
        self.record(
            "AUTH", "Auth/me", ok2,
            f"username={uname}" if ok2 else f"HTTP {status2}",
        )

    def suite_cards(self):
        """Full CRUD + validate-csv + export + count."""
        # Create
        status, body = self.api("POST", "/cards/", json_body={
            "first_name":  "Mickey",
            "last_name":   "Mantle",
            "year":        1952,
            "brand":       "Topps",
            "grade":       3.0,
            "card_number": "311",
            "book_high":   500.0,
            "book_mid":    300.0,
            "book_low":    100.0,
        })
        ok = status in (200, 201) and isinstance(body, dict) and bool(body.get("id"))
        card_id = body.get("id") if isinstance(body, dict) else None
        if card_id:
            self.ids["card_id"] = card_id
        self.record(
            "CARDS", "Create card", ok,
            f"id={card_id}" if ok else f"HTTP {status}: {str(body)[:40]}",
        )

        if card_id:
            # Get
            status, body = self.api("GET", f"/cards/{card_id}")
            ok = status == 200 and isinstance(body, dict) and body.get("first_name") == "Mickey"
            self.record(
                "CARDS", "Get card", ok,
                (f"{body.get('first_name')} {body.get('last_name')} {body.get('year')}"
                 if ok else f"HTTP {status}"),
            )

            # List
            status, body = self.api("GET", "/cards/", params={"limit": 5})
            ok = status == 200 and isinstance(body, list)
            self.record(
                "CARDS", "List cards", ok,
                f"{len(body)} returned" if ok else f"HTTP {status}",
            )

            # Count
            status, body = self.api("GET", "/cards/count")
            ok = (
                status == 200
                and isinstance(body, dict)
                and isinstance(body.get("count"), int)
                and body["count"] >= 1
            )
            self.record(
                "CARDS", "Count", ok,
                f"count={body.get('count')}" if ok else f"HTTP {status}",
            )

            # Update
            status, body = self.api("PUT", f"/cards/{card_id}",
                                    json_body={"grade": 1.5})
            ok = status == 200 and isinstance(body, dict) and abs((body.get("grade") or 0) - 1.5) < 0.01
            self.record(
                "CARDS", "Update card", ok,
                f"grade → {body.get('grade')}" if ok else f"HTTP {status}",
            )

            # Value recalc — set all five book values, confirm value is computed
            status, body = self.api("PUT", f"/cards/{card_id}", json_body={
                "book_high":     500.0,
                "book_high_mid": 350.0,
                "book_mid":      250.0,
                "book_low_mid":  150.0,
                "book_low":      75.0,
                "grade":         3.0,
            })
            ok = status == 200 and isinstance(body, dict) and body.get("value") is not None
            self.record(
                "CARDS", "Value recalc", ok,
                f"value={body.get('value')}" if ok else f"HTTP {status}",
            )
        else:
            # Skip CRUD tests that require a card ID
            for name in ("Get card", "List cards", "Count", "Update card", "Value recalc"):
                self.record("CARDS", name, False, "skipped (create failed)")

        # Validate CSV — independent of card_id
        csv_content = (
            "First,Last,Year,Brand,Rookie,Card Number,"
            "BookHi,BookHiMid,BookMid,BookLowMid,BookLow,Grade\n"
            "Smoke,Test,1980,Topps,FALSE,1,10,8,6,4,2,1.0\n"
        )
        status, body = self.api(
            "POST", "/cards/validate-csv",
            multipart=("test.csv", csv_content),
        )
        ok = status == 200 and isinstance(body, dict) and body.get("valid") is True
        self.record(
            "CARDS", "Validate CSV", ok,
            f"valid, {body.get('row_count', 0)} rows" if ok
            else f"HTTP {status}: {str(body)[:40]}",
        )

        # Export JSON
        status, body = self.api("GET", "/cards/export", params={"format": "json"})
        ok = status == 200
        if ok and isinstance(body, list):
            detail = f"{len(body)} card(s) exported"
        elif ok:
            detail = "data present"
        else:
            detail = f"HTTP {status}"
        self.record("CARDS", "Export JSON", ok, detail)

        # Explicit delete test
        if card_id:
            status, _ = self.api("DELETE", f"/cards/{card_id}")
            ok = status in (200, 204)
            self.record("CARDS", "Delete card", ok, "" if ok else f"HTTP {status}")
            if ok:
                self.ids.pop("card_id", None)
        else:
            self.record("CARDS", "Delete card", False, "skipped (create failed)")

    def suite_balls(self):
        """Full CRUD for AutoBalls."""
        status, body = self.api("POST", "/balls/", json_body={
            "first_name":  "Mickey",
            "last_name":   "Mantle",
            "brand":       "Rawlings",
            "auth":        True,
            "inscription": "No. 7",
        })
        ok = status in (200, 201) and isinstance(body, dict) and bool(body.get("id"))
        ball_id = body.get("id") if isinstance(body, dict) else None
        if ball_id:
            self.ids["ball_id"] = ball_id
        self.record(
            "BALLS", "Create ball", ok,
            f"id={ball_id}" if ok else f"HTTP {status}: {str(body)[:40]}",
        )

        if not ball_id:
            for name in ("Get ball", "List balls", "Update ball", "Delete ball"):
                self.record("BALLS", name, False, "skipped (create failed)")
            return

        # Get
        status, body = self.api("GET", f"/balls/{ball_id}")
        ok = status == 200 and isinstance(body, dict) and body.get("first_name") == "Mickey"
        self.record(
            "BALLS", "Get ball", ok,
            (f"{body.get('first_name')} {body.get('last_name')}"
             if ok else f"HTTP {status}"),
        )

        # List
        status, body = self.api("GET", "/balls/")
        ok = status == 200 and isinstance(body, list)
        self.record(
            "BALLS", "List balls", ok,
            f"{len(body)} returned" if ok else f"HTTP {status}",
        )

        # Update
        status, body = self.api("PATCH", f"/balls/{ball_id}",
                                json_body={"inscription": "The Mick"})
        ok = status == 200 and isinstance(body, dict) and body.get("inscription") == "The Mick"
        self.record(
            "BALLS", "Update ball", ok,
            f"inscription → {body.get('inscription')}" if ok else f"HTTP {status}",
        )

        # Delete
        status, _ = self.api("DELETE", f"/balls/{ball_id}")
        ok = status in (200, 204)
        self.record("BALLS", "Delete ball", ok, "" if ok else f"HTTP {status}")
        if ok:
            self.ids.pop("ball_id", None)

    def suite_wax(self):
        """Full CRUD for WaxBoxes."""
        status, body = self.api("POST", "/wax/", json_body={
            "year":     1952,
            "brand":    "Topps",
            "set_name": "Series 1",
            "quantity": 1,
            "value":    5000.0,
        })
        ok = status in (200, 201) and isinstance(body, dict) and bool(body.get("id"))
        wax_id = body.get("id") if isinstance(body, dict) else None
        if wax_id:
            self.ids["wax_id"] = wax_id
        self.record(
            "WAX", "Create wax box", ok,
            f"id={wax_id}" if ok else f"HTTP {status}: {str(body)[:40]}",
        )

        if not wax_id:
            for name in ("Get wax box", "List wax boxes", "Update wax box", "Delete wax box"):
                self.record("WAX", name, False, "skipped (create failed)")
            return

        # Get
        status, body = self.api("GET", f"/wax/{wax_id}")
        ok = status == 200 and isinstance(body, dict)
        self.record(
            "WAX", "Get wax box", ok,
            (f"{body.get('year')} {body.get('brand')}" if ok else f"HTTP {status}"),
        )

        # List
        status, body = self.api("GET", "/wax/")
        ok = status == 200 and isinstance(body, list)
        self.record(
            "WAX", "List wax boxes", ok,
            f"{len(body)} returned" if ok else f"HTTP {status}",
        )

        # Update
        status, body = self.api("PATCH", f"/wax/{wax_id}", json_body={"value": 4800.0})
        ok = status == 200 and isinstance(body, dict) and abs((body.get("value") or 0) - 4800.0) < 0.01
        self.record(
            "WAX", "Update wax box", ok,
            f"value → {body.get('value')}" if ok else f"HTTP {status}",
        )

        # Delete
        status, _ = self.api("DELETE", f"/wax/{wax_id}")
        ok = status in (200, 204)
        self.record("WAX", "Delete wax box", ok, "" if ok else f"HTTP {status}")
        if ok:
            self.ids.pop("wax_id", None)

    def suite_packs(self):
        """Full CRUD for WaxPacks."""
        status, body = self.api("POST", "/packs/", json_body={
            "year":      1986,
            "brand":     "Fleer",
            "pack_type": "wax",
            "quantity":  2,
            "value":     75.0,
        })
        ok = status in (200, 201) and isinstance(body, dict) and bool(body.get("id"))
        pack_id = body.get("id") if isinstance(body, dict) else None
        if pack_id:
            self.ids["pack_id"] = pack_id
        self.record(
            "PACKS", "Create pack", ok,
            f"id={pack_id}" if ok else f"HTTP {status}: {str(body)[:40]}",
        )

        if not pack_id:
            for name in ("Get pack", "List packs", "Update pack", "Delete pack"):
                self.record("PACKS", name, False, "skipped (create failed)")
            return

        # Get
        status, body = self.api("GET", f"/packs/{pack_id}")
        ok = status == 200 and isinstance(body, dict)
        self.record(
            "PACKS", "Get pack", ok,
            (f"{body.get('year')} {body.get('brand')}" if ok else f"HTTP {status}"),
        )

        # List
        status, body = self.api("GET", "/packs/")
        ok = status == 200 and isinstance(body, list)
        self.record(
            "PACKS", "List packs", ok,
            f"{len(body)} returned" if ok else f"HTTP {status}",
        )

        # Update
        status, body = self.api("PATCH", f"/packs/{pack_id}", json_body={"quantity": 3})
        ok = status == 200 and isinstance(body, dict) and body.get("quantity") == 3
        self.record(
            "PACKS", "Update pack", ok,
            f"quantity → {body.get('quantity')}" if ok else f"HTTP {status}",
        )

        # Delete
        status, _ = self.api("DELETE", f"/packs/{pack_id}")
        ok = status in (200, 204)
        self.record("PACKS", "Delete pack", ok, "" if ok else f"HTTP {status}")
        if ok:
            self.ids.pop("pack_id", None)

    def suite_boxes(self):
        """Full CRUD for BoxBinders."""
        status, body = self.api("POST", "/boxes/", json_body={
            "brand":    "Topps",
            "year":     1952,
            "name":     "Complete Set",
            "set_type": "factory",
            "quantity": 1,
            "value":    1200.0,
        })
        ok = status in (200, 201) and isinstance(body, dict) and bool(body.get("id"))
        box_id = body.get("id") if isinstance(body, dict) else None
        if box_id:
            self.ids["box_id"] = box_id
        self.record(
            "BOXES", "Create box/binder", ok,
            f"id={box_id}" if ok else f"HTTP {status}: {str(body)[:40]}",
        )

        if not box_id:
            for name in ("Get box/binder", "List boxes/binders",
                         "Update box/binder", "Delete box/binder"):
                self.record("BOXES", name, False, "skipped (create failed)")
            return

        # Get
        status, body = self.api("GET", f"/boxes/{box_id}")
        ok = status == 200 and isinstance(body, dict)
        self.record(
            "BOXES", "Get box/binder", ok,
            (f"{body.get('brand')} {body.get('year')}" if ok else f"HTTP {status}"),
        )

        # List
        status, body = self.api("GET", "/boxes/")
        ok = status == 200 and isinstance(body, list)
        self.record(
            "BOXES", "List boxes/binders", ok,
            f"{len(body)} returned" if ok else f"HTTP {status}",
        )

        # Update
        status, body = self.api("PATCH", f"/boxes/{box_id}", json_body={"value": 1100.0})
        ok = status == 200 and isinstance(body, dict) and abs((body.get("value") or 0) - 1100.0) < 0.01
        self.record(
            "BOXES", "Update box/binder", ok,
            f"value → {body.get('value')}" if ok else f"HTTP {status}",
        )

        # Delete
        status, _ = self.api("DELETE", f"/boxes/{box_id}")
        ok = status in (200, 204)
        self.record("BOXES", "Delete box/binder", ok, "" if ok else f"HTTP {status}")
        if ok:
            self.ids.pop("box_id", None)

    def suite_dictionary(self):
        """List, count, and search dictionary entries."""
        # List
        status, body = self.api("GET", "/dictionary/entries", params={"limit": 5})
        ok = status == 200 and isinstance(body, list) and len(body) > 0
        self.record(
            "DICT", "List entries", ok,
            f"{len(body)} entries" if ok else f"HTTP {status}: {str(body)[:40]}",
        )

        # Count
        status, body = self.api("GET", "/dictionary/count")
        ok = status == 200 and isinstance(body, dict) and body.get("count", 0) > 0
        self.record(
            "DICT", "Count", ok,
            f"count={body.get('count')}" if ok else f"HTTP {status}",
        )

        # Search — accepts both "ok" and "not_found"; just confirm 200 + valid structure
        status, body = self.api("GET", "/dictionary/search",
                                params={"first_name": "mickey", "last_name": "mantle"})
        ok = (
            status == 200
            and isinstance(body, dict)
            and body.get("status") in ("ok", "not_found")
        )
        self.record(
            "DICT", "Search", ok,
            f"status={body.get('status')}" if ok else f"HTTP {status}",
        )

    def suite_analytics(self):
        """Confirm analytics summary returns expected top-level keys."""
        status, body = self.api("GET", "/analytics/")
        ok = status == 200 and isinstance(body, dict) and "total_cards" in body
        self.record(
            "ANALYTICS", "Summary", ok,
            f"total_cards={body.get('total_cards')}" if ok else f"HTTP {status}",
        )

    def suite_settings(self):
        """Get settings, then do a dark_mode toggle roundtrip."""
        status, body = self.api("GET", "/settings/")
        ok = status == 200 and isinstance(body, dict) and "row_color_rookie" in body
        self.record(
            "SETTINGS", "Get", ok,
            "row_color_rookie present" if ok else f"HTTP {status}",
        )

        if not ok:
            self.record("SETTINGS", "Update roundtrip", False, "skipped (get failed)")
            return

        original = body.get("dark_mode", False)
        toggled  = not original
        status2, body2 = self.api("PUT", "/settings/", json_body={"dark_mode": toggled})
        ok2 = (
            status2 == 200
            and isinstance(body2, dict)
            and body2.get("dark_mode") == toggled
        )
        self.record(
            "SETTINGS", "Update roundtrip", ok2,
            f"dark_mode: {original} → {toggled}" if ok2 else f"HTTP {status2}",
        )
        # Restore original value (best-effort, don't record as a test)
        if ok2:
            self.api("PUT", "/settings/", json_body={"dark_mode": original})

    def suite_auth_logout(self):
        """Confirm logout clears the session."""
        status, body = self.api("POST", "/auth/logout")
        ok = status == 200 and isinstance(body, dict) and body.get("ok") is True
        self.record(
            "AUTH", "Logout", ok,
            "ok" if ok else f"HTTP {status}",
        )


# ─── Entry point ─────────────────────────────────────────────────────────────

def main():
    load_env()
    args = parse_args()

    if args.url:
        base_url = args.url
    else:
        base_url = DEFAULT_LOCAL

    email    = os.environ.get("CARDSTOARD_EMAIL",    DEFAULT_EMAIL)
    password = os.environ.get("CARDSTOARD_PASSWORD", DEFAULT_PASSWORD)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_path  = args.log or os.path.join(LOG_DIR, f"functional_test_{timestamp}.log")

    print(
        f"\n{BLD}CardStoard Functional Test — "
        f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{NC}"
    )
    print(f"Target: {CYN}{base_url}{NC}")
    print(f"User:   {email}\n")

    runner = TestRunner(base_url, email, password)

    # Print table header — rows stream in real-time via record() as each test completes
    print(_SEP)
    print(_fmt_row("Test", "Result", "Detail"))
    print(_SEP, flush=True)

    try:
        runner.run_all()
    except Exception as exc:
        print(f"\n{RED}Unexpected error during test run: {exc}{NC}")
    finally:
        runner.cleanup()

    exit_code = runner.report(log_path=log_path)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
