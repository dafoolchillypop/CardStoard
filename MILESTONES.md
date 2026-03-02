# Project Milestones

**This document tracks major snapshots and feature milestones in the CardStoard project.**

**<->**

## v1.6 — Sort, Labels, Propagation & Dark Mode Fix (March 2026)
**Status:** Complete
**Focus:** Collection UX polish, label printing, and session reliability

### Major Deliverables
- **Book Value Propagation**
  - Updating book values on any card automatically propagates to all matching cards (same player, brand, year, card number) via a new `PATCH /cards/propagate-book-values` endpoint.
  - Toast notification confirms how many cards were updated.

- **Advanced Multi-Column Sort**
  - Excel-style sort modal with up to 9 sortable columns, each with independent ASC/DESC direction.
  - "Set as my default sort order" checkbox persists sort config to user profile (`default_sort` JSONB column, migration 005).
  - Default sort applied automatically on every page load; overridden by session returnState.
  - Sort button turns green when a custom sort is active.

- **Inline Edit UX**
  - After inline save, `reapplySort()` clears pins and re-applies default sort so saved cards land in their correct sorted position.
  - Removed float-to-top pin behaviour from book value propagation — sort now governs position after data refresh.

- **Batch Label Printing**
  - Print All: generates QR-code labels for entire collection.
  - Print Selected: select individual cards via checkbox mode, print as batch.
  - Cancel button on loading screen allows aborting large builds.
  - Print Selected button repositioned beside Cancel in the left toolbar.

- **Dark Mode FOUC Fix**
  - `AuthContext` previously called `setIsLoggedIn(true)` before `api.get("/settings/")` resolved, causing children to render in light mode before `applyTheme()` fired.
  - Fixed by awaiting the settings fetch and applying the theme before rendering children — eliminates the flash of light mode on every session restore.

- **Table Auto-Focus**
  - Card list scroll container auto-focuses after data loads and after closing any modal, so arrow keys scroll immediately without a manual click.

---

## v1.5 — Player Dictionary Expansion (February 2026)
**Status:** Complete
**Focus:** Dictionary data quality, Smart Fill accuracy, and name autocomplete

### Major Deliverables
- **Topps 1952–1980 Seed Data**
  - Expanded player dictionary to 867+ entries covering Topps sets across three decades.
  - Seed script and CSV reference data added to `backend/app/data/`.

- **Player Name Autocomplete**
  - Tab or Enter key completes a partially-typed player name from the dictionary during inline add/edit.
  - Integrated in both the card list inline add row and AddCard/UpdateCard full-page forms.

- **In-Collection Dictionary Highlights**
  - Dictionary entries matching cards in the user's collection are highlighted in green, giving a quick visual indicator of overlap.

- **Rookie Year Bulk Update**
  - Updating a player's rookie year in the dictionary triggers a toast offering to propagate the change across all dictionary entries for that player.

- **Collection Assistant Improvements**
  - Chatbot context accuracy improvements; pre-computed summaries for player counts, grade distributions, and brand breakdowns.

---

## v1.4 — Dark Mode & Deploy Automation (February 2026)
**Status:** Complete
**Focus:** UI theme system, account management, and operational tooling

### Major Deliverables
- **Dark Mode**
  - Full CSS custom property system (`--bg-page`, `--text-primary`, `--border`, etc.) covering all pages and components.
  - Per-user toggle in Admin settings — persisted in `global_settings.dark_mode` (migration 004).
  - Applied via `data-theme="dark"` attribute on `<html>` element; no React re-render required for theme switch.
  - Dynamic row colour fallbacks in ListCards and DictionaryList for dark theme.

- **Account Management UX**
  - Consolidated account page: username change, password change (strength validation), account deletion with confirmation.
  - Password requirements: 8+ characters, upper/lower/number/special character.
  - Auto-dismiss success/error messages.

- **EC2 Deploy Automation**
  - `utils/deploy-ec2-prod.sh` — full cycle from local machine: pg_dump → git pull → rebuild → restore → smoke test.
  - Partial modes: `--check` (validate only), `--deploy` (rebuild only).
  - Timestamped deploy logs under `utils/logs/`.
  - `utils/renew-cert.sh` — Let's Encrypt certificate renewal helper.

- **SonarCloud Stabilisation**
  - Achieved and maintained 0 security issues, 0 reliability issues in automated analysis.

---

## v1.3 — Admin Consolidation & Collection Assistant (January 2026)
**Status:** Complete
**Focus:** Navigation redesign, data management, AI chatbot, and admin tooling

### Major Deliverables
- **Navigation Bar Redesign**
  - New AppHeader with primary action buttons (My Cards, Analytics), right-side icon cluster (Account, Admin, Chat, About, Logout).
  - "Add Card" moved from header into inline table action.
  - Username display in upper right.

- **Collection Assistant Chatbot**
  - AI-powered chat panel (Claude API) with baseball-themed persona ("Cy").
  - Full collection context: player summaries, grade breakdowns, brand distributions.
  - Multi-turn conversation; toggle enable/disable from Admin.

- **Data Management**
  - Export: CSV, TSV, JSON formats.
  - Backup: full collection + settings as JSON.
  - Restore: upload backup to replace collection.
  - All accessible from Admin panel.

- **Row Color Coding**
  - Configurable highlight colours for Mint cards (grade 3.0), Rookie cards, and Rookie + Mint combinations.
  - Color pickers in Admin with restore-defaults button.

- **Admin Consolidation**
  - Single Admin page for: settings, valuation factors, Smart Fill toggle, chatbot toggle, dictionary tools, card import, data management.

- **Analytics Enhancements**
  - Year filter for targeted trend analysis.
  - Valuation history trend chart added to Combined view.
  - Breakdown tables (brand/year/player) click through to filtered card list.

---

## v1.2 — Player Dictionary & Smart Fill (December 2025)
**Status:** Complete
**Focus:** Card data quality and entry efficiency

### Major Deliverables
- **Player Dictionary**
  - Full CRUD: add, edit, delete, duplicate dictionary entries.
  - Inline editing in the dictionary list table.
  - CSV import with duplicate detection and validation.
  - Searchable/filterable by last name, brand, year.

- **Smart Fill**
  - Enable from Admin settings.
  - When adding or editing a card: auto-populates card number and rookie flag from the dictionary based on player name, brand, and year.
  - Debounced (400ms) to minimise API calls.

- **Name Autocomplete**
  - Tab/Enter key completes partially-typed player first or last names from dictionary data.

---

## v1.1 — Auth Hardening & Session Stability (November 2025)
**Status:** Complete
**Focus:** Authentication reliability and session handling

### Major Deliverables
- **Token Refresh**
  - Axios interceptor auto-retries failed requests after refreshing the access token via `/auth/refresh`.
  - Request queue prevents duplicate refresh calls during concurrent 401s.

- **Session Handling**
  - `AuthContext` `/` route added to public routes to fix "Loading session" hang after logout.
  - Improved initial login detection and state transitions.

- **Grade Validation**
  - Backend enforcement: card grade must be one of the 6 valid values (3.0, 1.5, 1.0, 0.8, 0.4, 0.2).
  - Frontend select dropdowns prevent invalid values.

---

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
