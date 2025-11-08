# 🧾 CardStoard

CardStoard is a full-stack web application for managing, tracking, and valuing a baseball card collection.  
It combines a **FastAPI backend** with a **React frontend**, fully containerized with **Docker Compose** and deployable on **AWS EC2**.

---

## 🗂️ Repository Overview

| Layer | Directory | Purpose / Key Contents |
|--------|------------|-------------------------|
| **Backend** | `backend/app/` | FastAPI core (auth, routes, models, services) |
|  | `backend/app/routes/` | REST endpoints: auth, analytics, cards, account |
|  | `backend/app/services/` | Business logic: valuations, parsing, fuzzy match |
|  | `backend/app/models/` | SQLAlchemy entities (card, user, base) |
|  | `backend/app/schemas/` | Pydantic data models for validation & API I/O |
| **Frontend** | `frontend/src/` | React client app root |
|  | `frontend/src/pages/` | Full-page React views (Home, Admin, Analytics, etc.) |
|  | `frontend/src/components/` | Reusable UI components (forms, modals, tables) |
| **DevOps** | `utils/` | Docker deploy + validation scripts |
|  | `.github/workflows/` | SonarCloud code quality workflow |
| **Assets** | `frontend/public/`, `backend/app/static/` | Public and uploaded images |
| **Config** | `.env*`, `docker-compose*.yml` | Environment configs for dev and prod |

---

## 🚀 Features

- **Inventory Management** — Add, edit, and delete cards with images  
- **Image Handling** — Upload front/back scans (future AI pipeline planned)  
- **Player & Card Reference** — Preloaded datasets for validation and quick-add  
- **Authentication** — Email verification, secure login, JWT, MFA-ready  
- **Valuation Engine** — Historical sales data + fuzzy player/card matching  
- **Admin Tools** — Manage users, view analytics, adjust global factors  
- **Analytics Dashboard** — Track inventory count and valuation trends over time  
- **Deployment Ready** — Works seamlessly on AWS EC2, Nginx, and Docker Compose  

---

## 🖥️ Tech Stack

| Layer | Technologies |
|--------|---------------|
| **Backend** | FastAPI · SQLAlchemy · PostgreSQL |
| **Frontend** | React · Context API · Axios |
| **Infrastructure** | Docker · Nginx · AWS EC2 (t3.micro) |
| **Utilities** | Python shell scripts for seeding, deploy validation |
| **CI/CD** | SonarCloud Quality Gate via GitHub Actions |

---

## ⚡ Quick Start

### 1️⃣ Clone the repository
```bash
git clone https://github.com/dafoolchillypop/CardStoard.git
cd CardStoard
2️⃣ Local Development
bash

docker-compose up --build
Frontend → http://localhost:3000

Backend API → http://localhost:8000

3️⃣ Production (EC2 / Remote)
bash

docker-compose -f docker-compose.prod.yml up --build -d
Frontend → https://cardstoard.com

Backend API → https://cardstoard.com/api

🧠 Environment & Deployment
Environment variables are never stored in .env files in production.
All secrets (mail credentials, JWT, API keys) are injected via EC2 environment exports.

Use helper scripts for deployment and validation:

bash
./utils/docker_deploy.sh --env test --check     # Dry-run validation
./utils/docker_deploy.sh --env prod             # Full production deploy
📈 Analytics Example
The Analytics Dashboard provides:

Monthly inventory growth (card count)

Collection valuation over time

Brand, Year, and Player breakdown tables

Combined trend overlay (inventory + valuation)

🗺️ Roadmap (v1.x → v2.0)
Version	Focus
v1.0	Stable FastAPI/React stack, SonarCloud integration, analytics UI
v1.1	Reintroduce AI image pipeline & card detection
v1.2	eBay API & 3rd-party valuation feeds
v1.3	Mobile-friendly responsive layout
v1.4	Advanced trend analytics, custom user dashboards

🧩 Integration Targets
 eBay sold listings (via Finding API)

 Beckett & CardLadder APIs (valuation normalization)

 Google Vision / OCR for image recognition

 Webhooks for email and alert delivery

🧾 License
This project is developed for personal and hobbyist use.
© 2025 CardStoard — All rights reserved.

🔖 Version: v1.0
📅 Release Date: November 2025
✅ Verified Components: Backend, Frontend, Database, Deployment, SonarCloud
