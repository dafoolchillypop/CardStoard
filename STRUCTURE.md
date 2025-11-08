# 📖 CardStoard Application Structure
_Authoritative structure as of **v1.0 (November 2025)**_

## 🖥️ Backend — FastAPI + PostgreSQL

backend/
├── Dockerfile # Backend Docker build (development)
├── Dockerfile.prod # Backend Docker build (production)
├── requirements.txt # Python dependencies
├── seed.py # Database seeding script (reference players/cards)
├── database.py # SQLAlchemy engine and session management
├── models.py # Legacy model bundle (retained for reference)
├── schemas.py # Legacy schema bundle (retained for reference)
│
├── app/
│ ├── main.py # FastAPI application entrypoint
│ │
│ ├── auth/ # Authentication, session & security modules
│ │ ├── cookies.py
│ │ ├── email_verify.py
│ │ └── security.py
│ │
│ ├── config/ # Application configuration
│ │ └── cfg_settings.py # Environment-based settings via Pydantic
│ │
│ ├── core/ # Core system config
│ │ └── config.py # Global FastAPI setup and startup logic
│ │
│ ├── data/ # Reference data files
│ │ ├── card_reference.csv
│ │ └── players.json
│ │
│ ├── models/ # SQLAlchemy model definitions
│ │ ├── base.py
│ │ ├── card.py
│ │ └── user.py
│ │
│ ├── routes/ # API endpoints
│ │ ├── account.py
│ │ ├── analytics.py
│ │ ├── auth.py
│ │ ├── cards.py
│ │ ├── email_test.py
│ │ └── rtr_settings.py
│ │
│ ├── schemas/ # Pydantic request/response schemas
│ │ ├── card.py
│ │ └── user.py
│ │
│ ├── services/ # Core business logic
│ │ ├── fuzzy_match.py
│ │ ├── image_pipeline.py
│ │ └── quickadd_parser.py
│ │
│ ├── utils/ # Shared utility helpers
│ │ ├── email_service.py
│ │ └── init.py
│ │
│ ├── static/ # File storage and debug output
│ │ ├── cards/
│ │ └── debug/
│ │
│ └── src/ # Static frontend assets used by backend
│ └── baseball-bg.png
│
└── init.py

## 🌐 Frontend — React + Axios + Context API

frontend/
├── .dockerignore
├── Dockerfile # Development Dockerfile
├── Dockerfile.prod # Production Dockerfile
├── package.json
├── package-lock.json
│
├── deploy/
│ └── nginx.prod.conf # Nginx reverse proxy configuration (for EC2)
│
├── public/
│ ├── index.html
│ ├── logo.png
│ └── baseball-bg.png
│
├── src/
│ ├── index.jsx
│ ├── App.jsx
│ ├── index.css
│ │
│ ├── api/
│ │ ├── api.js
│ │ └── http.js
│ │
│ ├── assets/
│ │ └── baseball-bg.png
│ │
│ ├── components/
│ │ ├── AppHeader.jsx / AppHeader.css
│ │ ├── NavBar.jsx
│ │ ├── CardForm.jsx
│ │ ├── CardImages.jsx
│ │ ├── CardList.jsx
│ │ ├── ChipsInput.jsx
│ │ ├── LogoutButton.jsx
│ │ ├── Modal.jsx / Modal.css
│ │ └── ProtectedRoute.jsx
│ │
│ ├── context/
│ │ └── AuthContext.jsx
│ │
│ ├── pages/
│ │ ├── Home.jsx / HomePage.jsx
│ │ ├── Account.jsx / Account.css
│ │ ├── AddCard.jsx
│ │ ├── DeleteCard.jsx
│ │ ├── CardList.jsx
│ │ ├── CardDetail.jsx
│ │ ├── ImportCards.jsx / ImportCards.css
│ │ ├── Admin.jsx / Admin.css
│ │ └── Analytics.jsx
│
└── README.md (frontend overview)

## 🧰 Utilities & Infrastructure

utils/
├── docker_cleanup.sh # Container/volume cleanup helper
├── docker_deploy.sh # Automated deploy/validate script (v1.0+)
├── logs/ # Deployment logs (timestamped)
└── README.md

## 🧪 CI/CD & Quality

.github/
└── workflows/
└── sonarcloud.yml # Automated code quality and static analysis pipeline

## 📋 Directory Summary

| Directory | Purpose | Key Files |
|------------|----------|------------|
| **backend/** | Core FastAPI application and DB layer | `main.py`, `models/`, `routes/`, `services/` |
| **backend/app/auth/** | Authentication, session, and JWT logic | `cookies.py`, `security.py`, `email_verify.py` |
| **backend/app/routes/** | All API endpoints | `auth.py`, `account.py`, `analytics.py`, `cards.py` |
| **backend/app/models/** | SQLAlchemy models | `card.py`, `user.py`, `base.py` |
| **backend/app/schemas/** | Pydantic schema definitions | `card.py`, `user.py` |
| **backend/app/services/** | Business logic and helper engines | `fuzzy_match.py`, `quickadd_parser.py`, `image_pipeline.py` |
| **backend/app/utils/** | Utility helpers (email, misc tools) | `email_service.py` |
| **backend/app/static/** | Uploaded and debug images | `/cards/`, `/debug/` |
| **frontend/** | React-based client app | `App.jsx`, `index.jsx`, `package.json` |
| **frontend/src/components/** | Shared UI components | `AppHeader.jsx`, `Modal.jsx`, `CardList.jsx` |
| **frontend/src/pages/** | Full pages & routes | `Admin.jsx`, `Analytics.jsx`, `ImportCards.jsx` |
| **frontend/deploy/** | Reverse proxy configuration | `nginx.prod.conf` |
| **utils/** | Deployment, cleanup, and validation scripts | `docker_deploy.sh`, `docker_cleanup.sh` |
| **.github/workflows/** | CI/CD pipeline definitions | `sonarcloud.yml` |


✅ **Verified & aligned with deployed v1.0 configuration.**  
🧠 Clean, modular layout ready for **v1.1 refactor and image pipeline reintroduction**.