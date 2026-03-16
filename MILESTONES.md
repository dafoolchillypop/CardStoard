# Project Milestones

**This document tracks major snapshots and feature milestones in the CardStoard project.**

**<->**

## v1.10 — Sets/Binders Label System & UI Polish (March 2026)
**Status:** Complete
**Focus:** CS-ST identifier + full label/detail system for Sets/Binders, inline action controls, quantity tracking, nav bar customization, last login display

### Major Deliverables

- **CS-ST-XXXXXX Identifier & Label System**
  - Every Sets/Binders record now has a unique `CS-ST-XXXXXX` label ID (computed from `id`, consistent with `CS-CD-XXXXXX` for cards).
  - Label printing via Avery 6427 format (1.75" × 0.75") — same format as card labels.
  - Label includes a QR code encoding the public set view URL; scanning opens a no-auth detail page.
  - Notes appear as a 4th line on the label when present.
  - Preview modal (`LabelPreviewModal`) updated to be generic — handles both card labels (grade line) and set labels (type · date + notes).

- **Set Detail Page (SetBinderDetail)**
  - Authenticated detail view at `/set-detail/:id` — mirrors CardDetail for sets.
  - Shows CS-ST-XXXXXX identifier, type badge, stats table (quantity / value / total / added date).
  - Editable notes with Save Notes button.
  - Print Label button → LabelPreviewModal → print page.
  - ← Previous Set / Next Set → navigation using ordered ID array passed from the list via React Router state.

- **Public Set View (SetBinderView)**
  - No-auth public page at `/set-view/:id` — QR scan destination.
  - Shows CS-ST-XXXXXX, brand/year/name, type badge, notes, and sign-in CTA.

- **Sets/Binders Inline Action Controls**
  - Row-level action buttons added to match Cards list parity: 📋 copy, ℹ️ detail, 🖨️ print label.
  - ℹ️ navigates to SetBinderDetail with ordered `setIds` state for prev/next navigation.
  - 🖨️ opens LabelPreviewModal (same flow as cards).

- **Quantity & Total Columns**
  - `quantity` integer field added to `boxes_binders` table (migration 015, default 1).
  - Quantity column in list with inline edit; Total column computed as `qty × value`.

- **Nav Bar Customization**
  - Per-user toggle in Admin to show/hide centre nav buttons (Add Card, My Cards, Analytics).
  - Stored as `nav_items` JSON column in `global_settings` (migration 013).

- **Last Login Display**
  - `last_login` TIMESTAMP column added to `users` table (migration 014).
  - Updated on every successful login; displayed on Account page.

- **Naming Conventions**
  - "Sets" (checklists/builds page) → renamed to **"Builds"** in nav and page headers.
  - "Boxes/Binders" → renamed to **"Sets/Binders"** in nav and page headers.
  - New frontend files use `SetBinder*` prefix to avoid collision with existing `SetDetail.jsx`.

- **Migrations**
  - `013_add_nav_items.sql` — `nav_items JSON DEFAULT NULL` in `global_settings`
  - `014_add_last_login.sql` — `last_login TIMESTAMP DEFAULT NULL` in `users`
  - `015_add_quantity_to_boxes.sql` — `quantity INTEGER NOT NULL DEFAULT 1` in `boxes_binders`

---

## v1.9 — Sets, Boxes/Binders & UI Polish (March 2026)
**Status:** Complete
**Focus:** Two new collection item types (Sets and Boxes/Binders), set checklist data, and UI improvements across Cards, Analytics, and nav

### Major Deliverables

- **My Sets (Checklists & Collection Tracking)**
  - Global set checklists seeded with 39 Topps sets (1952–1990), totalling 17,504 cards across 869 players.
  - Per-user set tracking: mark any checklist entry as "in your build" with grade, book values, and notes.
  - Set list view shows entry count and in-collection count per set; freshness indicators on rows with book values.
  - Column-level sort and filter on the set detail view (year, brand, card number, player, rookie flag).
  - Inline editing — edit grade, book values, notes without leaving the page.
  - Keyman Collectibles scraper utility (`utils/scrape_keyman.py`) for importing new set checklists.

- **Per-User Set Visibility**
  - Admin chip picker lets each user select which sets appear on their Sets page.
  - Persisted as `visible_set_ids` JSON column in `global_settings`.
  - Sets are organised by brand→year chips; select all/deselect all supported.

- **Boxes & Binders**
  - New collection item type for factory-sealed boxes, hand-collated sets, and binder-organised sets.
  - Direct user-entered value (no grade-based calculation).
  - Type badge: Factory (blue), Collated (amber), Binder (green).
  - Full inline editing, CD player nav (same pattern as Cards), pin/bookmark row (localStorage).
  - Multi-level advanced sort modal — save as default sort order per user (`default_sort_boxes` column in `global_settings`).

- **UI & UX Improvements**
  - Nav bar: removed "My" prefix from all collection nav buttons (Cards, Sets, Boxes/Binders, etc.).
  - Cards page: renamed "My Cards" header to "Cards".
  - Sort modals (Cards and Boxes): widened to 640px to comfortably fit the 4-button footer row.
  - Analytics combined chart: fixed Y-axis label overlap with X-axis dates; left axis shows "Card Count" label vertically centred; right axis uses $ tick formatter.
  - Removed emoji from Collection Analytics page header.

- **Migrations**
  - `011_add_boxes_binders.sql` — new `boxes_binders` table
  - `012_add_default_sort_boxes.sql` — `default_sort_boxes` JSON column in `global_settings`

---

## v1.8 — Pin/Bookmark, Book Freshness UX & Test Data (March 2026)
**Status:** Complete
**Focus:** Collection navigation, book value freshness workflows, and QA tooling

### Major Deliverables

- **Pin / Bookmark Row**
  - 📌 pin icon in every row's action column — click to pin, click again to unpin.
  - Pinned row is highlighted (dark grey background + outline) and persists across sessions via `localStorage` (`cs-pinned-row` key).
  - Any card save auto-pins that row so you never lose your place.
  - 📌 button in the table header jumps directly to the pinned row, centered in the viewport.
  - Clone and edit operations freeze the display order and restore scroll position on save or cancel.

- **Book Freshness Refresh (↻ button)**
  - New ↻ button in the Book column of each row — resets the freshness timer to today without opening edit mode.
  - Same ↻ button added to the Card Detail page book freshness section.
  - Powered by new `POST /cards/{id}/refresh-book-values` endpoint.

- **Book Value Propagation Timer Fix**
  - Previously, propagating book values to duplicate cards only reset the freshness timer on the card being directly edited.
  - All matching duplicates now receive `book_values_updated_at = now` in the same propagation pass.

- **Admin: Bulk Book Freshness Reset**
  - New "↻ Reset Book Value Timers" action on the Admin page.
  - Marks today as the book-value update date for every card with at least one book value entered.
  - Useful for establishing a baseline after a bulk review of the collection.
  - Powered by new `POST /cards/refresh-all-book-values` endpoint.

- **Clone / Edit Scroll Preservation**
  - Duplicating a card inserts the new row directly below the source row; the table order is frozen until the clone is saved or cancelled.
  - Cancelling a clone deletes the in-progress card from the database and scrolls back to the source row.
  - Saving any edit scrolls smoothly to the saved row (centred in viewport).

- **Test User Seed Scripts** (`utils/provision-testusers.py` / `.sh`)
  - Seeds 5 named test users with distinct collector profiles (80–240 cards each).
  - 35 Hall-of-Fame players with real rookie years; realistic book values, freshness distributions (fresh/aging/stale/null), and card attributes.
  - Valuation history with shaped growth curves (strong/moderate/slow/flat/S-curve) for 3–12 months of Analytics data.
  - Supports `--prod` flag (seeds `@cardstoard.prd` domain against EC2) and `--reset` to wipe and reseed cleanly.

- **Bug Fixes & Internal**
  - `GlobalSettingsBase` Pydantic validator coerces NULL DB booleans to `False` — fixes ResponseValidationError for users with legacy settings rows.
  - Admin loading guard replaced bare `<p>Loading...</p>` with full page shell (AppHeader + spinner).
  - Login now applies dark mode theme before navigation to eliminate flash of light mode on dark-mode accounts.
  - `applyTheme` exposed from `AuthContext` for use in Login and future callers.

---

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
