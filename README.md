# 🧾 CardStoard — v1.19

CardStoard is a full-stack web application for managing, tracking, and valuing a sports card collection.
It combines a **FastAPI backend** with a **React frontend**, fully containerized with **Docker Compose** and deployed on **AWS EC2**.

---

## 🗂️ Repository Overview

| Layer | Directory | Purpose / Key Contents |
|--------|------------|-------------------------|
| **Backend** | `backend/app/` | FastAPI core (auth, routes, models, services) |
| | `backend/app/routes/` | REST endpoints: auth, cards, analytics, account, dictionary, chat, settings, boxes, sets, balls, wax, packs |
| | `backend/app/services/` | Business logic: valuations, fuzzy match, image pipeline |
| | `backend/app/models.py` | SQLAlchemy entities (Card, User, GlobalSettings, SetList, SetEntry, UserSetCard, BoxBinder, AutoBall, WaxBox, WaxPack, DictionaryEntry, ValuationHistory) |
| | `backend/app/schemas.py` | Pydantic models for validation & API I/O |
| | `backend/app/data/` | Player dictionary seed data (28,800+ entries, Topps 1952–1990, Bowman 1948–1955, Fleer 1959–1963, Donruss/Fleer/Upper Deck 1981–1990) |
| **Frontend** | `frontend/src/` | React client app root |
| | `frontend/src/pages/` | Full-page views (Home, Admin, ListCards, Analytics, Dictionary, About, User Guide, etc.) |
| | `frontend/src/components/` | Reusable components (AppHeader, ChatPanel, ChipsInput, LabelPreviewModal, CardImages) |
| | `frontend/src/context/` | AuthContext — JWT session, token refresh, dark mode, login state |
| **DevOps** | `utils/` | Deploy, validation, and cleanup scripts |
| | `utils/deploy-ec2-prod.sh` | Local → EC2 deploy with pg_dump/restore (run from dev machine) |
| | `utils/docker_deploy.sh` | EC2-side full rebuild + health validation |
| | `utils/renew-cert.sh` | Let's Encrypt certificate renewal |
| | `.github/workflows/` | SonarCloud code quality workflow |
| **Config** | `.env`, `docker-compose*.yml` | Dev and prod environment configs (`.env` is gitignored) |
| **Docs** | `ARCHITECTURE.md` | Full architecture reference: tech stack, AWS services, DB schema, auth flow |

---

## 🚀 Features

### Collection Management
- Add, edit, and delete cards with front & back image uploads
- **Inline editing** — edit any card field directly in the card list without leaving the page
- **Card Detail page** — full card view with label ID, value change indicator, book freshness, notes, duplicate count, and print label; prev/next navigation steps through the collection in sort order
- **Book freshness quick-edit** — "Book: never updated" label on Card Detail is clickable and navigates directly to that card in edit mode in the list
- Bulk import from CSV with grade validation
- Filter by player, brand, year, grade, and rookie status (column-level search icons)
- **Advanced multi-column sort** — configure up to 9 sort levels with direction; save as default sort order per user
- Row color coding: Mint (lavender), Rookie (gold), Rookie + Mint (rose) — colors customizable in Admin
- **Book value propagation** — updating book values on one card automatically updates all matching cards (same player/brand/year/card#); propagation now also resets the freshness timer on all updated duplicates
- **Book freshness refresh** — ↻ button per row (and on Card Detail) resets the freshness timer without opening edit mode; Admin has a bulk "Reset Book Value Timers" action to baseline your entire collection at once
- **Pin / bookmark** — pin any row with the 📌 icon; the pin persists across sessions (stored in your account profile in the database); auto-pins after every save; jump to your pinned row from the 📌 button in the table header; clone/edit operations preserve table scroll position

### Sets (Checklists & Collection Tracking)
- **My Sets** — browse global set checklists (39 Topps sets, 1952–1990, 17,504 cards); track which cards you own per set
- Per-set build progress: entry count, in-collection count, freshness indicators per row
- Inline editing of grade, book values, and notes directly in the set view
- Column-level sort and filter (year, brand, name, card number, player, rookie)
- Per-user set visibility — Admin chip picker lets each user choose which sets appear in their Sets page
- Keyman Collectibles checklist scraper utility (`utils/scrape_keyman.py`) for importing new set data

### Sets/Binders
- Track complete sets as standalone inventory items — factory-sealed boxes, hand-collated sets, or binder-organised sets
- User-entered direct value and quantity (no grade-based calculation); total value = qty × value shown as a column
- Type badge display: Factory (blue), Collated (amber), Binder (green)
- Inline editing, CD player nav, multi-level sort with save-as-default per user
- Pin / bookmark row — persists across sessions (stored in account profile)
- Row-level action controls: copy (📋), info/detail (ℹ️), print label (🖨️)
- **CS-ST-XXXXXX identifier** — unique label ID computed from record ID; shown on detail page and printed label
- **Set Detail page** — authenticated detail view with stats (qty/value/total/added), editable notes, label printing, and ← Previous Set / Next Set → navigation
- **Label printing** — Avery 6427 format (1.75" × 0.75") with QR code; notes appear as a 4th line on the label when present
- **QR scan** — scanning a set label opens the public set view (no login required)

### Auto Balls
- Track autographed baseballs as a first-class collection item type
- Fields: signer (first/last name), brand, commissioner stamp, COA authentication flag, inscription, value, notes
- **AUTH / UNAUTH badge** — green or gray badge indicating Certificate of Authenticity presence
- **Value freshness** — left-border color coding (green < 30 days, amber 30–90 days, red > 90 days or unset); ↻ button resets freshness timer without editing
- Inline editing, CD player nav, multi-level sort with save-as-default per user
- Pin / bookmark row — persists in account profile
- **CS-BL-XXXXXX identifier** — unique label ID on every ball record
- **Label printing** — Avery 6427 format with QR code; inscription shown as a 3rd line on the label
- **QR scan** — opens public ball view (no login required) showing signer name, auth badge, inscription, and label ID

### Wax Boxes
- Track sealed wax boxes as a first-class inventory type
- Fields: year, brand, type badge (Cello / Rack / Std), quantity, value, notes
- **Value freshness** — left-border color coding (green < 30 days, amber 30–90 days, red > 90 days or unset); ↻ button resets freshness timer
- Inline editing, CD player nav, multi-level sort with save-as-default per user
- Pin / bookmark row — persists in account profile
- **CS-WX-XXXXXX identifier** — unique label ID on every wax box record
- **Label printing** — Avery 6427 format with QR code
- **QR scan** — opens public wax view (no login required)

### Wax Packs
- Track individual wax packs as a first-class inventory type
- Fields: year, brand, pack type badge (Cello / Rack / Wax / Blister), quantity, value, notes
- **Value freshness** — same left-border color system as Wax Boxes; ↻ freshness reset button
- Inline editing, CD player nav, multi-level sort with save-as-default per user
- Pin / bookmark row — persists in account profile
- **CS-PK-XXXXXX identifier** — unique label ID on every pack record
- **Label printing** — Avery 6427 format with QR code
- **QR scan** — opens public pack view (no login required)

### Valuation Engine
- Book value inputs: Hi, Hi-Mid, Mid, Lo-Mid, Lo
- Configurable grade factors (MT, EX, VG, GD, FR, PR) and Rookie multiplier
- Era-based adjustment factors (vintage / modern)
- Apply global revaluation across entire collection from Admin
- Backend-computed card values with market factor display

### Label Printing & QR Codes
- Single card or set/binder label with preview modal — print to Avery 6427 (1.75" × 0.75") format
- Batch printing for cards — select individual cards or print your entire collection at once
- QR code on every label — scan to open a public shareable view (no login required) for both cards and sets
- Set/binder labels include notes as a 4th line when present
- Print-optimized layout; browser print dialog triggered automatically

### AI Image Recognition
- Photograph or upload a card image — AI identifies the player, brand, year, and card number automatically
- Camera capture directly in the browser (mobile and desktop)
- Parsed results pre-fill the Add Card form; user reviews and confirms before saving
- Enable / disable from Admin settings (requires Anthropic API key)

### Player Dictionary & Smart Fill
- Searchable database of players, brands, years, and card numbers — seeded with **28,800+ entries** covering Topps 1952–1990 (every player), Bowman 1948–1955, Fleer 1959–1963, Donruss/Fleer/Upper Deck 1981–1990
- **Smart Fill** — auto-populates card number and rookie flag when adding or editing cards
- Player name autocomplete with Tab/Enter key completion
- Import dictionary entries via CSV; full CRUD for individual entries
- In-collection highlights: dictionary rows matching your cards appear in green

### Analytics
- Collection breakdown by brand, year, and player (click any row to filter your card list)
- Total value tracking with historical trend charts
- Inventory growth over time
- Year filter for targeted analysis
- Three chart modes: Inventory, Valuation, Combined dual-axis

### Data Management (Admin)
- Extract card data as CSV, TSV, or JSON
- Full backup (cards + settings) as JSON
- Restore collection from backup file

### Collection Assistant
- AI-powered chat with full context about your collection (powered by Claude)
- Accurate counting via pre-computed player, grade, and brand summaries across **all inventory types** — Cards, Balls, Wax Boxes, Wax Packs, and Sets/Binders
- Conversation history maintained within each session
- Enable / disable from Admin settings

### Dark Mode
- Toggle in Admin settings — persisted per-user in the database
- Applied before page render on every session (no flash of light mode)
- Full CSS custom property system covering all pages and components

### Account & Security
- Email verification and secure JWT session handling (httpOnly cookies, auto token refresh)
- **Username or email login** — log in with either your username or email address at the login screen
- Optional TOTP multi-factor authentication *(coming soon)*
- Update username, email, and password from Account page
- Last login date/time displayed on Account page
- Account deletion with confirmation

### Admin
- All tools in one place: settings, valuation factors, Smart Fill toggle, chatbot toggle, dark mode toggle, dictionary tools, card import, data management, set visibility, nav bar customization
- **Set visibility** — per-user chip picker to select which sets appear on the Sets page
- **Nav bar customization** — per-user toggle to show/hide center nav buttons (Add Card, My Cards, Analytics)
- Row color customization with color pickers and restore-defaults button
- Card brand management via tag input
- **Bulk book freshness reset** — mark today as the book-value update date for every card that has values entered

---

## 🖥️ Tech Stack

| Layer | Technologies | Version |
|--------|---------------|---------|
| **Backend** | FastAPI · SQLAlchemy · PostgreSQL · Uvicorn | 0.100+ · 2.0 · 15 |
| **AI** | Anthropic Claude API (Collection Assistant) | claude-sonnet |
| **Frontend** | React · Context API · Axios · React Router · Recharts | 18.2 · 1.6 · 6.22 · 3.2 |
| **Infrastructure** | Docker · Docker Compose · Nginx | |
| **Cloud** | AWS EC2 (t4g.small ARM64) · AWS SES · Elastic IP | us-east-1 |
| **Domain / DNS** | cardstoard.com via Namecheap | |
| **TLS** | Let's Encrypt / Certbot | auto-renew |
| **Auth** | JWT (httpOnly cookies) · bcrypt · TOTP (pyotp) | |
| **CI/CD** | SonarCloud Quality Gate via GitHub Actions | 0 security / 0 reliability issues |

---

## 🏗️ Architecture

CardStoard runs entirely on a single AWS EC2 t4g.small instance. Nginx handles HTTPS termination and serves the React static build; API requests are proxied to FastAPI running inside a Docker container. PostgreSQL runs in a third container on the same instance. Transactional email (account verification) is delivered via AWS SES through the fastapi-mail SMTP interface. The Collection Assistant is powered by the Anthropic Claude API.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full architecture reference — tech stack versions, infrastructure diagram, AWS components, database schema, auth flow, and deployment pipeline.

---

## ⚡ Quick Start

### 1️⃣ Clone the repository
```bash
git clone https://github.com/dafoolchillypop/CardStoard.git
cd CardStoard
```

### 2️⃣ Configure environment
```bash
cp .env.example .env   # edit with your values
```

Key variables:
```
JWT_SECRET=<strong-random-secret>
ANTHROPIC_API_KEY=<your-anthropic-key>    # required for Collection Assistant
MAIL_USERNAME / MAIL_PASSWORD             # AWS SES SMTP credentials
MAIL_FROM / MAIL_SERVER / MAIL_PORT       # SES SMTP endpoint
```

### 3️⃣ Local development
```bash
docker-compose up --build
```
- Frontend → http://localhost:3000
- Backend API → http://localhost:8000

Or use the helper script (includes smoke test):
```bash
./utils/deploy-local-dev.sh
```

---

## 🧠 Deployment (EC2)

A local deploy script handles the full cycle from your dev machine:

```bash
./utils/deploy-ec2-prod.sh           # full deploy: backup → rebuild → restore → smoke test
./utils/deploy-ec2-prod.sh --check   # validate only (no rebuild)
./utils/deploy-ec2-prod.sh --deploy  # rebuild only (skip validation)
```

The full deploy automatically:
1. `pg_dump` the production database before wiping
2. Pulls latest `main` from GitHub
3. Rebuilds all Docker containers (no-cache)
4. Waits for services to be healthy
5. Restores the database from the pre-deploy dump
6. Runs smoke test suite

Production URLs:
- Frontend → https://cardstoard.com
- Backend API → https://cardstoard.com/api

---

## 📦 Version History

| Version | Date | Highlights |
|---------|------|-----------|
| **v1.19** | Apr 2026 | AI Image Recognition: photograph or upload a card — AI identifies player/brand/year/card number and pre-fills the Add Card form; camera capture in browser; dictionary expanded to 28,800+ entries (Topps 1952–1990 full checklist); dictionary data quality pass: bogus entries removed, rookie_year populated for 70+ HOF/star players; scan page live dictionary re-query on field edit; seed-from-cards creates missing dictionary entries; dictionary dedup + invalid-entry detection and purge tools; Admin page redesigned as tabbed layout (Settings / Valuation / Dictionary / Data) with collapsible accordion sections |
| **v1.18** | Mar 2026 | Duplicate code refactor: extracted `GenericItemLabel`, `GenericItemView`, and `cardUtils` shared modules; eliminated ~138 SonarCloud-flagged duplicate lines across 13 components |
| **v1.17** | Mar 2026 | SonarCloud code quality remediations pass 2: datetime lambda fix, sort localeCompare, React hooks ordering, accessibility (keyboard/role/tabIndex), credential variable rename; 0 bugs, 0 vulnerabilities |
| **v1.16** | Mar 2026 | Collection Assistant context expanded to all inventory types (Cards, Balls, Wax Boxes, Wax Packs, Sets/Binders); username or email login; SonarCloud code quality remediations; full functional test suite (`utils/functional_test.py`) |
| **v1.15** | Mar 2026 | Wax Boxes (CS-WX, cello/rack/std type badges, value freshness, label + QR) and Wax Packs (CS-PK, cello/rack/wax/blister type badges, value freshness, label + QR) inventory types; Admin nav bar layout fix |
| **v1.14** | Mar 2026 | Auto Balls: autographed baseball inventory type (signer, brand, commissioner, COA auth badge, inscription, value freshness, label print + QR); pin/bookmark persisted to DB; scroll fix for Book: never updated nav |
| **v1.13** | Mar 2026 | Value Dictionary: admin-maintained book values on dictionary entries, Smart Fill auto-populates all 5 book value tiers, seed from existing cards, CSV import, Values column in Dictionary list |
| **v1.12** | Mar 2026 | Inline code documentation: file-level headers and function docstrings across 21 key backend and frontend files; no logic changes |
| **v1.11** | Mar 2026 | Dictionary expansion: Bowman 1948–1955, Fleer 1959–1963, Donruss/Fleer/Upper Deck 1981–1990 (97 players / 1,875+ entries); full vintage set checklists for Bowman + Fleer; scraper fix for mixed-layout + leading-dash Keyman pages; additive seed |
| **v1.10** | Mar 2026 | Sets/Binders rename, CS-ST-XXXXXX identifier, Set Detail page, label printing + QR for sets, notes on label, prev/next set nav, inline controls (copy/print/detail), quantity + total columns, nav bar customization, last login display |
| **v1.9** | Mar 2026 | My Sets (checklists + build tracking, 39 sets / 17,504 cards), Sets/Binders inventory type, per-user set visibility chip picker, sort modal improvements, Analytics combined chart fix |
| **v1.8** | Mar 2026 | Pin/bookmark rows (localStorage persistence, auto-pin on save, jump-to-pin header button), book freshness ↻ refresh per row and on Card Detail, Admin bulk freshness reset, book value propagation timer fix, clone/edit scroll preservation, test user seed scripts |
| **v1.7** | Mar 2026 | Card Detail page (label ID, value change indicator, book freshness, notes, duplicate count, prev/next nav), default to show all cards, "Book: never updated" quick-edit link |
| **v1.6** | Mar 2026 | Book value propagation, advanced multi-column sort, default sort persistence, batch label printing, dark mode FOUC fix, inline edit UX polish |
| **v1.5** | Feb 2026 | Player dictionary expansion (Topps 1952–1980, 867+ entries), name autocomplete (Tab/Enter) |
| **v1.4** | Feb 2026 | Dark mode (per-user, persisted), account management UX, EC2 deploy automation |
| **v1.3** | Jan 2026 | Nav bar redesign, Data Management (export/backup/restore), Collection Assistant chatbot, row highlights, Admin consolidation, analytics enhancements |
| **v1.2** | Dec 2025 | Player Dictionary, Smart Fill, name autocomplete |
| **v1.1** | Nov 2025 | Auth improvements, grade validation, session timeout fix |
| **v1.0** | Nov 2025 | Stable FastAPI/React stack, SonarCloud CI/CD, analytics dashboard, production EC2 deploy |

---

## 🗺️ Roadmap

- Chatbot tool use — add, update, and delete cards via natural language
- Dictionary expansion — Bowman, Fleer, Donruss historical entries
- eBay sold listings integration for real-time market pricing
- Mobile-responsive layout
- Enhanced book value auto-fill from external sources
- Graded card mode (PSA, BGS, SGC) for professionally graded cards

---

## 🧾 License

This project is developed for personal and hobbyist use.
© 2026 CardStoard — All rights reserved.
