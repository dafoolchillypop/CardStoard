# Project Milestones

**This document tracks major snapshots and feature milestones in the CardStoard project.**

**<->**

## v1.0 — Production Release (November 2025)
**Status:** Complete  
**Focus:** Stability, Security, Deployment Integrity, and UI/UX polish  

### Major Deliverables
- **Security Cleanup**
  - Removed all `.env` secrets from backend and frontend repositories.
  - Migrated all credentials and API keys to environment variables (local + EC2).
  - Validated secure email and database connection configuration via Docker Compose.

- **SonarCloud Integration**
  - Configured GitHub Actions workflow for automated SonarCloud analysis.
  - Achieved **0 Security**, **0 Reliability**, and only minor maintainability issues.
  - Cleaned repository of `__pycache__` and `.pyc` artifacts.
  - Updated `.gitignore` to ensure clean repo state.

- **Backend Enhancements**
  - Replaced unsafe file path construction with `secure_filename`.
  - Replaced `datetime.utcnow()` with timezone-aware UTC (`datetime.now(timezone.utc)`).
  - Standardized configuration using Pydantic `BaseSettings`.
  - Added `/health` endpoint for deployment monitoring and automated smoke tests.

- **Frontend / UI-UX**
  - Reduced spacing in Admin sections; refined layout alignment.
  - Resized Valuation, Import, and Save Settings buttons to uniform sizing.
  - Temporarily hid ERA settings (planned for v1.1).
  - Evaluated Import function placement and consistency across navigation bar.
  - Verified responsive layout and usability across devices.

- **Deployment Automation**
  - Created `utils/docker_deploy.sh` with modes:
    - `--env test|prod`
    - `--check` (validation only)
    - `--deploy` (rebuild only)
  - Added automated DB, backend, and frontend health validation routines.
  - Verified successful smoke test: HTTP 200 responses for all services.
  - Logged deploy sessions for traceability under `utils/logs/`.

- **Analytics**
  - Implemented combined inventory + valuation trends with Recharts.
  - Added sortable breakdowns by **Brand**, **Year**, and **Player**.
  - Standardized dollar formatting and dynamic tooltips.

## v0.9 (2025-10-31)
- **Authentication, Analytics, and UI Refinements**

  ### Core Backend Changes
  - **Auth & Cookies**
    - Reworked `clear_auth_cookie()` to properly remove tokens across all domains and environments (localhost and production).
    - Standardized cookie attributes (`SameSite`, `Secure`, `Domain`, and `Path`) for consistent login/logout behavior.
    - Improved `/auth/refresh` handling to automatically reissue access tokens when expired.
    - Hardened session flow to prevent stale cookies from restoring invalid sessions.
    - Fixed inconsistent username/email display — `/auth/me` now returns both reliably.
  - **Analytics**
    - Enhanced `/analytics/` to support separate trend sets:
      - `trend_inventory` — monthly additions.
      - `trend_valuation` — valuation updates.
    - Added internal utilities to merge and normalize data for consistent charting output.

  ### Frontend Updates
  - **Analytics.jsx**
    - Added 3-way toggle for chart view:
      - *Inventory* (card counts)
      - *Valuation* (value history)
      - *Combined* (dual Y-axis chart)
    - Fixed double-count bug in inventory aggregation.
    - Improved chart readability and alignment:
      - Blue axis/labels for *cards*
      - Green axis/labels for *value*
      - Wider layout to prevent clipping of axis labels.
  - **AppHeader.jsx**
    - Moved navigation buttons (Add Card, List Cards, Analytics, Admin) from Home page into header bar.
    - Username now displayed in upper right instead of email address.
    - Buttons evenly spaced with modern hover and gradient styling.
  - **VerifySuccess.jsx**
    - Rebuilt email verification success page:
      - Centered layout with app logo and animated checkmark.
      - Normal-width "Continue to Login" button.
      - Auto-redirect after 5 seconds.
  - **Home.jsx**
    - Simplified to focus on logo and tagline.
    - Navigation moved to header.
  - **AuthContext.jsx**
    - Added `/` to `publicRoutes` to fix “Loading session” hang after logout.
    - Improved initial login detection and state handling.
  - **api.js**
    - Dynamic base URL detection for local vs. production.
    - Added automatic token refresh support (via `/auth/refresh`).
    - Handles session expiration gracefully without breaking navigation.

  ### Utility & Deployment
  - **docker_deploy.sh**
    - Integrated `--check` validation to confirm container health (DB, backend, frontend).
  - Backend & frontend validation both pass through automated dry-run tests.
  - Deployment logs include timestamps and clear stage outputs.

  ### Stability Highlights
  - Logout now fully clears session cookies.
  - Login, logout, and re-login sequences work seamlessly.
  - Analytics charts render cleanly with correct data.
  - All frontend routes consistent with backend session state.

## v0.8 (2025-10-27)
- **Move valuation logic and market factor calculations to the backend**

  ### Core Backend Changes
    - **Added** `backend/app/services/card_value.py`:
      - Implements `calculate_card_value()`, `calculate_market_factor()`, and `pick_avg_book()` for unified backend valuation.
      - Formula now mirrors frontend logic (`avgBook * grade * factor`) and rounds to nearest dollar.
    - **Updated** `backend/app/routes/cards.py`:
      - `/cards/{id}/value` route now computes and persists card values server-side.
      - Each card now includes `market_factor` in API responses.
      - Added internal helper calls for valuation and settings lookup.
    - **Refactored Models/Schemas:**
      - Consolidated redundant model files under unified structure.
      - Ensured all valuation fields (`book_*`, `grade`, `value`, `market_factor`) are accessible via ORM and API.

  ### Frontend Updates
    - **ListCards.jsx**
      - Updated to display backend-provided `market_factor` and `value`.
      - Still computes client-side average book values for UI parity.
      - Added dynamic sorting, paging, and live total bar refinements.
    - **UpdateCard.jsx**
      - Now triggers backend revaluation automatically on grade or book value updates.
      - Seamless navigation back to `ListCards` reflects updated values.

  ### Utility Scripts
    - **`utils/update_values.sh`**
      - Batch revaluation script for all cards (CLI executable).
      - Includes progress output and cookie-based authentication.
    - **`utils/validate_cards.py`**
      - Validation tool to flag potential data anomalies (e.g. `$0` cards).

  ### Valuation Logic Summary
    avg_book = mean([book_high, book_high_mid, book_mid, book_low_mid, book_low])
    factor = based on grade and rookie status
    value = round(avg_book * grade * factor)

## v0.7 (2025-10-16)
- **Smartfill, seed prep, EC2 DB exposure, profile admin**
  - added SmartFill feature for AddCard
  - prepped for load testing with seed data (25k records added/verified, manual login works)
  - exposed PostGres on EC2 (server)
  - user profile update page
  - AddCard GUI updates
  - GUI standardization
  - Docker Compose v2
  - Nightly redeploy/restart/cleanupo staged (not working)

## v0.6 (2025-10-10)
- **Email/SMTP, User model, AppHeader**
  - email registration/validation via SMTP
  - movement btw dev and EC2 (env vars)
  - standardized app header with global id, home, and logout
  - login present only for unauthenticated users
  - user model includes is_vedrified, is_active

## v0.5 (2025-10-04)
- **AWS EC2**
  - login/logout stable
  - login only upon entry (no menu options until logged in)
  - Analytics fix
  - git cleanup

## v0.4 (2025-10-03)
- **AWS EC2**
  - cardstoard.com domain
  - DNS
  - SSL
  - login/logout cookies
  - NGINX

## v0.3-snapshot (2025-09-29)
- ✅ **Analytics page**
  - Totals for cards, value, players, brands
  - Monthly trend chart (value + count)
  - Breakdown tables (sortable by column with arrows)
  - Back-to-home nav button

- ✅ **ListCards page**
  - Running total value (filters + paging aware)
  - Sorting on key columns
  - Improved paging block with inline total

- ✅ **Seed script**
  - Simulates 5 users
  - Random cards with history (created + updated timestamps)
  - All book values rounded to whole dollars

- ✅ **Stability**
  - Auth/login working with cookies
  - Docker rebuild & restart clean
  - Git repo snapshot safe

---

## v0.2-snapshot
- Importing data
- Sorting/Filtering
- Admin Settings

---

## v0.1-snapshot
- Basic FastAPI + React app scaffold
- Card model
- Simple CRUD for cards
