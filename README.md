# 🧾 CardStoard — v1.6

CardStoard is a full-stack web application for managing, tracking, and valuing a sports card collection.
It combines a **FastAPI backend** with a **React frontend**, fully containerized with **Docker Compose** and deployed on **AWS EC2**.

---

## 🗂️ Repository Overview

| Layer | Directory | Purpose / Key Contents |
|--------|------------|-------------------------|
| **Backend** | `backend/app/` | FastAPI core (auth, routes, models, services) |
| | `backend/app/routes/` | REST endpoints: auth, cards, analytics, account, dictionary, chat, settings |
| | `backend/app/services/` | Business logic: valuations, fuzzy match, image pipeline |
| | `backend/app/models.py` | SQLAlchemy entities (Card, User, GlobalSettings, DictionaryEntry, ValuationHistory) |
| | `backend/app/schemas.py` | Pydantic models for validation & API I/O |
| | `backend/app/data/` | Player dictionary seed data (867+ entries, Topps 1952–1980) |
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
- Bulk import from CSV with grade validation
- Filter by player, brand, year, grade, and rookie status (column-level search icons)
- **Advanced multi-column sort** — configure up to 9 sort levels with direction; save as default sort order per user
- Row color coding: Mint (lavender), Rookie (gold), Rookie + Mint (rose) — colors customizable in Admin
- **Book value propagation** — updating book values on one card automatically updates all matching cards (same player/brand/year/card#)

### Valuation Engine
- Book value inputs: Hi, Hi-Mid, Mid, Lo-Mid, Lo
- Configurable grade factors (MT, EX, VG, GD, FR, PR) and Rookie multiplier
- Era-based adjustment factors (vintage / modern)
- Apply global revaluation across entire collection from Admin
- Backend-computed card values with market factor display

### Label Printing & QR Codes
- Single card label with preview modal — print to Avery 6427 (1.75" × 0.75") format
- Batch printing — select individual cards or print your entire collection at once
- QR code generated per card *(public shareable card view via QR scan — coming soon)*
- Print-optimized layout; browser print dialog triggered automatically

### Player Dictionary & Smart Fill
- Searchable database of players, brands, years, and card numbers — seeded with 867+ entries (Topps 1952–1980)
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
- Accurate counting via pre-computed player, grade, and brand summaries
- Conversation history maintained within each session
- Enable / disable from Admin settings

### Dark Mode
- Toggle in Admin settings — persisted per-user in the database
- Applied before page render on every session (no flash of light mode)
- Full CSS custom property system covering all pages and components

### Account & Security
- Email verification and secure JWT session handling (httpOnly cookies, auto token refresh)
- Optional TOTP multi-factor authentication *(coming soon)*
- Update username, email, and password from Account page
- Account deletion with confirmation

### Admin
- All tools in one place: settings, valuation factors, Smart Fill toggle, chatbot toggle, dark mode toggle, dictionary tools, card import, data management
- Row color customization with color pickers and restore-defaults button
- Card brand management via tag input

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
- Per-user navigation customization

---

## 🧾 License

This project is developed for personal and hobbyist use.
© 2026 CardStoard — All rights reserved.
