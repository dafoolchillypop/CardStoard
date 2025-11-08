# 🏷️ CardStoard

CardStoard is a full-stack web application for **managing, tracking, and valuing a baseball card collection**.  
It combines a **FastAPI backend** with a **React frontend**, fully containerized using **Docker** and deployable on **AWS EC2**.

## 🚀 Overview

**CardStoard v1.0** is the first production-ready release, emphasizing:
- ✅ **Security & Config Integrity** (no plain-text credentials)
- ⚙️ **Reliable Deployments** (Docker-based automation & validation)
- 🧠 **Data-Driven Valuations** (historical sales analysis)
- 🎨 **Improved UI/UX** (refined Admin panel and analytics)
- 📈 **Actionable Insights** (collection trends by brand, year, player)

## 🖥️ Tech Stack

| Layer | Technology |
|-------|-------------|
| **Backend** | FastAPI, SQLAlchemy, PostgreSQL |
| **Frontend** | React, Context API, Axios |
| **DevOps** | Docker, Nginx, AWS EC2 (t3.micro) |
| **CI/CD** | GitHub Actions + SonarCloud |
| **Utilities** | Python shell tools, deployment scripts |

## 📂 Project Structure

CardStoard/
├── backend/ # FastAPI app (models, routes, auth, services)
├── frontend/ # React client (pages, components, api)
├── utils/ # Shell + deployment scripts
├── docker-compose.yml # Local test environment
├── docker-compose.prod.yml # Production setup (Nginx + EC2)
└── .github/workflows/sonarcloud.yml # CI quality analysis

📘 See [STRUCTURE.md](STRUCTURE.md) for a detailed inventory of backend and frontend modules.

## ⚡ Quick Start

### 1️⃣ Clone the repository

git clone https://github.com/dafoolchillypop/CardStoard.git
cd CardStoard
2️⃣ Set environment variables
Make sure these are exported in your shell (.bashrc or .env.local):

export MAIL_USERNAME="cardstoard@gmail.com"
export MAIL_PASSWORD="your-app-password"
export MAIL_FROM="cardstoard@gmail.com"
export MAIL_SERVER="smtp.gmail.com"
export MAIL_PORT=587
export MAIL_FROM_NAME="CardStoard"
export BACKEND_BASE_URL="http://localhost:8000"
export FRONTEND_BASE_URL="http://localhost:3000"
export REACT_APP_API_BASE="http://localhost:8000"

3️⃣ Run locally (Test)
docker-compose up --build

4️⃣ Deploy to production (EC2)
docker-compose -f docker-compose.prod.yml up -d --build

5️⃣ Validate health
curl -s http://localhost:8000/health
# -> {"status":"ok"}
Access:

Frontend: http://localhost:3000

Backend API: http://localhost:8000

🧠 Key Features
💾 Inventory Management
Add, edit, and delete card entries with attributes and images.

Image uploads stored securely under /static/cards/.

🔍 Valuation Engine
Calculates card value using recent market sales.

Handles ungraded (“raw”) cards with fuzzy-matching logic.

Excludes slabbed and shipping cost data automatically.

🧮 Analytics Dashboard
Collection summaries by player, year, and brand.

Combined inventory + valuation trend charts (monthly basis).

Sortable tables with inline UI arrows for intuitive insights.

🛠️ Admin Tools
Manage users, system multipliers, and valuation settings.

ERA settings hidden (planned for v1.1).

Consistent action button sizing and improved layout spacing.

🧰 DevOps & CI
Secure configuration via environment variables (no .env secrets).

Automated validation via utils/docker_deploy.sh:

--env test|prod

--check (validation-only)

--deploy (skip validation)

SonarCloud integration:


✅ 0 Security, ✅ 0 Reliability, minor maintainability improvements tracked for v1.1.

🧭 Roadmap
Version	Focus	Status
v1.0	Stability, Security, Deployment Integrity	✅ Released
v1.1	Maintainability Refactors, ERA Settings, AI OCR	🚧 In Progress
v1.2+	Partner Integrations, Scalability, Image Recognition	🔜 Planned

Coming Soon:
🔐 MFA / TOTP Authentication

🤝 Beckett & eBay API integrations

📱 Mobile-friendly UI

🧠 AI-based image identification

📊 Expanded analytics & market insights

🧾 License
This project is for personal/hobby development.
© 2025 CardStoard — All rights reserved.