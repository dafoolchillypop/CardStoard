# 🧾 CardStoard

CardStoard is a full-stack web application for managing, tracking, and valuing a sports card collection.
It combines a **FastAPI backend** with a **React frontend**, fully containerized with **Docker Compose** and deployable on **AWS EC2**.

---

## 🗂️ Repository Overview

| Layer | Directory | Purpose / Key Contents |
|--------|------------|-------------------------|
| **Backend** | `backend/app/` | FastAPI core (auth, routes, models, services) |
| | `backend/app/routes/` | REST endpoints: auth, cards, analytics, account, dictionary, chat, settings |
| | `backend/app/services/` | Business logic: valuations, fuzzy match, image pipeline |
| | `backend/app/models.py` | SQLAlchemy entities (Card, User, GlobalSettings, DictionaryEntry, ValuationHistory) |
| | `backend/app/schemas.py` | Pydantic models for validation & API I/O |
| | `backend/app/data/` | Player dictionary seed data (867+ entries) |
| **Frontend** | `frontend/src/` | React client app root |
| | `frontend/src/pages/` | Full-page views (Home, Admin, ListCards, Analytics, Dictionary, About, etc.) |
| | `frontend/src/components/` | Reusable components (AppHeader, ChatPanel, ChipsInput, Modal) |
| | `frontend/src/context/` | AuthContext — JWT session, token refresh, login state |
| **DevOps** | `utils/` | Deploy, validation, and cleanup scripts |
| | `utils/deploy-ec2-prod.sh` | Local → EC2 deploy with pg_dump/restore (run from dev machine) |
| | `utils/docker_deploy.sh` | EC2-side full rebuild + health validation |
| | `.github/workflows/` | SonarCloud code quality workflow |
| **Config** | `.env`, `docker-compose*.yml` | Dev and prod environment configs (`.env` is gitignored) |

---

## 🚀 Features

### Collection Management
- Add, edit, and delete cards with front & back image uploads
- Bulk import from CSV with grade validation
- Filter and sort by player, brand, year, grade, and rookie status
- Row color coding: Mint (lavender), Rookie (gold), Rookie + Mint (rose)

### Valuation Engine
- Book value inputs: Hi, Hi-Mid, Mid, Lo-Mid, Lo
- Configurable grade factors (MT, EX, VG, GD, FR, PR) and Rookie multiplier
- Apply global revaluation across entire collection from Admin

### Player Dictionary
- Searchable database of players, brands, years, and card numbers (867+ seeded entries)
- Smart Fill: auto-populates card number and rookie flag when adding cards
- Import dictionary entries via CSV; add and edit individual entries
- In-collection highlights: dictionary rows matching your cards appear in green

### Analytics
- Collection breakdown by brand, year, and player
- Total value tracking with historical trend charts
- Inventory growth over time
- Year filter for targeted analysis

### Data Management (Admin)
- Extract card data as CSV, TSV, or JSON
- Full backup (cards + settings) as JSON
- Restore collection from backup file

### Collection Assistant
- AI-powered chat with full context about your collection (powered by Claude)
- Accurate counting via pre-computed player, grade, and brand summaries
- Conversation history maintained within each session
- Enable / disable from Admin settings

### Account & Security
- Email verification and secure JWT session handling
- Optional TOTP multi-factor authentication
- Update username, email, and password from Account page

### Admin
- All tools consolidated in one place: settings, valuation factors, Smart Fill toggle, dictionary tools, card import, data management
- Chatbot enable/disable toggle

---

## 🖥️ Tech Stack

| Layer | Technologies |
|--------|---------------|
| **Backend** | FastAPI · SQLAlchemy · PostgreSQL · Anthropic Claude API |
| **Frontend** | React · Context API · Axios · React Router |
| **Infrastructure** | Docker · Docker Compose · Nginx · AWS EC2 (t3.micro) |
| **Auth** | JWT (access + refresh tokens) · bcrypt · TOTP (MFA) |
| **CI/CD** | SonarCloud Quality Gate via GitHub Actions |

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
ANTHROPIC_API_KEY=<your-anthropic-key>   # required for Collection Assistant
MAIL_USERNAME / MAIL_PASSWORD / MAIL_FROM / MAIL_SERVER / MAIL_PORT
```

### 3️⃣ Local development
```bash
docker-compose up --build
```
- Frontend → http://localhost:3000
- Backend API → http://localhost:8000

---

## 🧠 Deployment (EC2)

A local deploy script handles the full cycle from your dev machine:

```bash
./utils/deploy-ec2-prod.sh           # full deploy: backup → rebuild → restore
./utils/deploy-ec2-prod.sh --check   # validate only (no rebuild)
./utils/deploy-ec2-prod.sh --deploy  # rebuild only (skip validation)
```

The full deploy automatically:
1. `pg_dump` the production database before wiping
2. Pulls latest `main` from GitHub
3. Rebuilds all Docker containers
4. Waits for services to be healthy
5. Restores the database from the pre-deploy dump

Production URLs:
- Frontend → https://cardstoard.com
- Backend API → https://cardstoard.com/api

---

## 📈 Analytics

The Analytics Dashboard provides:
- Monthly inventory growth (card count)
- Collection valuation over time
- Brand, Year, and Player breakdown
- Year filter for focused trend analysis

---

## 📦 Version History

| Version | Highlights |
|---------|-----------|
| **v1.0** | Stable FastAPI/React stack, SonarCloud, analytics UI |
| **v1.1** | Auth improvements, grade validation, session timeout fix |
| **v1.2** | Player Dictionary, Smart Fill, name autocomplete |
| **v1.3** | Nav bar redesign, Data Management, Collection Assistant chatbot, row highlights, Admin consolidation, analytics enhancements |
| **v1.4** | *(in progress)* README, chatbot accuracy improvements, EC2 deploy automation |

---

## 🗺️ Roadmap

- Chatbot tool use — add, update, delete cards via natural language
- Per-user nav bar customization
- Dark mode
- Enhanced book value auto-fill
- Dictionary expansion (Bowman, Fleer, Donruss historical entries)
- eBay sold listings integration
- Mobile-friendly responsive layout

---

## 🧾 License

This project is developed for personal and hobbyist use.
© 2025 CardStoard — All rights reserved.
