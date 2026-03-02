# CardStoard — Architecture

## System Overview

CardStoard is a full-stack web application for sports card collection management. Each user maintains their own isolated collection, settings, and valuation profile. The entire stack runs inside Docker containers on a single AWS EC2 instance, with Nginx serving as both a reverse proxy and static file host. All application data is persisted in a PostgreSQL database on the same instance.

---

## Tech Stack

| Layer | Technology | Version / Notes |
|---|---|---|
| **Backend framework** | FastAPI | 0.100+ |
| **ORM** | SQLAlchemy | 2.0 |
| **Database** | PostgreSQL | 15 |
| **ASGI server** | Uvicorn | Production: gunicorn-managed |
| **AI / LLM** | Anthropic Claude API | claude-sonnet model; Collection Assistant |
| **MFA** | pyotp | TOTP-based two-factor auth *(coming soon — scaffolded, not active)* |
| **QR codes** | qrcode + Pillow | Per-card QR generation for labels |
| **OCR** | pytesseract | Card image text extraction *(future — scaffolded in `image_pipeline.py`, not active in production)* |
| **Email delivery** | fastapi-mail → AWS SES | SMTP interface; registration verify, notifications |
| **Password hashing** | bcrypt (passlib) | |
| **Frontend framework** | React | 18.2 |
| **Routing** | React Router | 6.22 |
| **HTTP client** | Axios | 1.6; httpOnly cookie auth, auto token-refresh |
| **Charts** | Recharts | 3.2 |
| **State management** | React Context API | AuthContext — session, theme |
| **Web server / proxy** | Nginx | Reverse proxy + static file serving |
| **Containerisation** | Docker + Docker Compose | Dev and prod compose files |
| **Cloud compute** | AWS EC2 t4g.small | ARM64 Graviton2, us-east-1, Ubuntu 22.04 |
| **Cloud networking** | AWS Elastic IP | Static public IP → cardstoard.com A record |
| **Cloud email** | AWS SES | Transactional email via SMTP endpoint |
| **TLS / SSL** | Let's Encrypt + Certbot | Auto-renew via `utils/renew-cert.sh` |
| **DNS** | Namecheap | A record → AWS Elastic IP |
| **Version control** | GitHub | `main` is production; feature branches required |
| **CI / Code quality** | GitHub Actions + SonarCloud | Quality gate on every push to main |
| **Auth tokens** | JWT (PyJWT) | httpOnly cookies; access + refresh token pair |

---

## Infrastructure Diagram

```
                    ┌─────────────────────────────────────────────────────┐
  User Browser      │  AWS EC2  t4g.small  (Ubuntu 22.04, us-east-1)      │
  ─────────────     │                                                     │
  HTTPS :443   ───► │  Nginx (Docker)                                     │
  HTTP  :80    ───► │   ├── /          ──► React static build (prod)      │
                    │   └── /api/*     ──► FastAPI :8000 (internal)        │
                    │                         │                            │
                    │                         └──► PostgreSQL :5432        │
                    │                              (internal, persisted    │
                    │                               Docker volume)         │
                    └─────────────────────────────────────────────────────┘
                              │                     │
                    AWS SES SMTP              Anthropic Claude API
                    (email delivery)          (Collection Assistant)
```

---

## Domain & Hosting

| Component | Detail |
|---|---|
| **Domain** | cardstoard.com |
| **Registrar / DNS** | Namecheap — A record points to AWS Elastic IP |
| **Cloud provider** | AWS (us-east-1) |
| **Instance type** | EC2 t4g.small (ARM64 Graviton2, 2 vCPU, 2 GB RAM) |
| **OS** | Ubuntu 22.04 LTS |
| **TLS certificate** | Let's Encrypt (auto-renew via `utils/renew-cert.sh`) |
| **Topology** | Single instance; no load balancer or auto-scaling |

---

## AWS Components

| Service | Usage |
|---|---|
| **EC2 t4g.small** | Hosts all Docker containers (Nginx, FastAPI, PostgreSQL) |
| **Elastic IP** | Static public IP; mapped to cardstoard.com A record in Namecheap DNS |
| **Security Groups** | Inbound: 80 (HTTP), 443 (HTTPS), 22 (SSH restricted); Outbound: all |
| **EBS volume** | Root OS volume; Docker `postgres_data` named volume persists DB data |
| **SES (Simple Email Service)** | Transactional email — account registration verification, password-related notifications; accessed via SMTP interface from fastapi-mail |

---

## External & Third-Party Services

| Service | Role |
|---|---|
| **Anthropic Claude API** | Powers the Collection Assistant chatbot (claude-sonnet); API key injected via environment variable at runtime |
| **AWS SES** | SMTP email delivery for account verification and notifications (see above) |
| **Let's Encrypt / Certbot** | Free TLS certificates; mounted into Nginx container; renewed via `utils/renew-cert.sh` |
| **SonarCloud** | Automated code quality gate — enforces 0 security issues, 0 reliability issues on every push to `main` |
| **GitHub Actions** | CI/CD pipeline: runs SonarCloud analysis on push (`.github/workflows/sonarcloud.yml`) |
| **GitHub** | Version control; `main` branch is production source of truth; all feature work on `dev/...` branches |
| **Namecheap** | Domain registrar and DNS hosting for cardstoard.com |

---

## Docker Architecture

### Development (`docker-compose.yml`)

| Container | Image | Ports | Notes |
|---|---|---|---|
| `stoarback` | `backend/Dockerfile` | `8000:8000` (exposed) | Volume-mounted for hot reload |
| `stoarfront` | `frontend/Dockerfile` | `3000:3000` (exposed) | Vite dev server; CHOKIDAR_USEPOLLING |
| `stoardb` | `postgres:15` | `5432:5432` | Healthcheck enabled; `postgres_data` volume |

### Production (`docker-compose.prod.yml`)

| Container | Image | Ports | Notes |
|---|---|---|---|
| `stoarback` | `backend/Dockerfile.prod` | Internal only | Healthcheck via `/health`; no external exposure |
| `stoarfront` | `frontend/Dockerfile.prod` | `80:80`, `443:443` | Nginx: serves React static build + proxies `/api/*` to backend |
| `stoardb` | `postgres:15` | Internal only | No port mapping; EC2-internal only |

**Production build**: React is compiled to a static bundle inside the frontend Docker image. Nginx serves the bundle directly and forwards API calls to the backend container over the internal Docker network.

---

## Database Schema

Managed via sequential SQL migrations in `backend/migrations/`.

### `users`
| Column | Type | Notes |
|---|---|---|
| id | integer PK | |
| email | varchar(255) | unique, indexed |
| username | varchar | unique, nullable |
| password_hash | varchar(255) | bcrypt |
| mfa_enabled | boolean | default false |
| mfa_secret | varchar(32) | TOTP secret, nullable |
| is_active | boolean | default true |
| is_verified | boolean | default true |
| created_at | timestamp | UTC |

### `cards`
| Column | Type | Notes |
|---|---|---|
| id | integer PK | |
| user_id | integer FK → users | |
| first_name, last_name | varchar | |
| year | integer | nullable |
| brand | varchar | nullable |
| card_number | varchar | nullable |
| rookie | boolean | default false |
| grade | float | one of: 3.0, 1.5, 1.0, 0.8, 0.4, 0.2 |
| book_high/high_mid/mid/low_mid/low | float | nullable; valuation inputs |
| value | float | backend-computed |
| market_factor | float | backend-computed |
| front_image, back_image | varchar | relative paths to `/static/cards/` |
| created_at, updated_at | timestamp | UTC |

### `global_settings`
| Column | Type | Notes |
|---|---|---|
| id | integer PK | |
| user_id | integer FK → users | |
| enable_smart_fill | boolean | |
| chatbot_enabled | boolean | |
| app_name | varchar | |
| card_makes | JSON | array of brand strings |
| card_grades | JSON | array of grade strings |
| rookie_factor … prgrade_factor | float | valuation multipliers |
| vintage/modern era settings | integer/float | era-based adjustment |
| row_color_rookie/grade3/rookie_grade3 | varchar | hex colour strings |
| dark_mode | boolean | migration 004 |
| default_sort | JSONB | nullable; migration 005 |

### `valuation_history`
Snapshots of total collection value and card count over time — used for trend charts in Analytics.

### `dictionary_entries`
Global (shared across all users) player reference database. 867+ seeded entries covering Topps 1952–1980.

| Column | Notes |
|---|---|
| id | PK |
| first_name, last_name | player name |
| rookie_year | nullable integer |
| brand | e.g. "Topps" |
| year | card year |
| card_number | |

### Migration History

| File | Change |
|---|---|
| `001_baseline.sql` | Initial schema: users, cards, global_settings, valuation_history, dictionary_entries |
| `002_add_row_colors.sql` | Row highlight colour columns on global_settings |
| `003_nullable_rookie_year.sql` | dictionary_entries.rookie_year made nullable |
| `004_add_dark_mode.sql` | global_settings.dark_mode boolean column |
| `005_add_default_sort.sql` | global_settings.default_sort JSONB column |

---

## Authentication Flow

```
1. Register    →  POST /auth/register  →  create user  →  send verification email (AWS SES)
2. Verify      →  GET  link in email   →  mark is_verified = true
3. Login       →  POST /auth/login     →  issue JWT access token + refresh token (httpOnly cookies)
4. App load    →  GET  /auth/me        →  validate access token  →  return user
               →  GET  /settings/      →  load user prefs, apply dark mode theme
               →  setIsLoggedIn(true)  →  render app (theme already applied — no FOUC)
5. Token expiry→  Axios interceptor catches 401  →  POST /auth/refresh  →  reissue access token
6. Logout      →  POST /auth/logout    →  clear httpOnly cookies on backend
```

---

## Valuation Engine

Card value is computed server-side on every save.

```
avg_book      = mean(book_high, book_high_mid, book_mid, book_low_mid, book_low)
grade_factor  = settings.<grade>grade_factor   (e.g. mtgrade_factor = 0.85 for grade 3.0)
rookie_factor = settings.rookie_factor          (default 0.80, applied when rookie = true)
auto_factor   = settings.auto_factor            (applied to MT + Rookie combo)
era_factor    = settings.vintage/modern_era_factor (based on card year)

value = round(avg_book × grade_factor × rookie_factor × era_factor)
```

All factors are configurable per-user in the Admin panel. Global revaluation re-applies current factors to every card in the collection.

---

## Deployment Pipeline

The full production deploy runs from the developer's local machine:

```bash
./utils/deploy-ec2-prod.sh
```

### Steps (automated)

```
1. pg_dump   →  SSH to EC2  →  dump cardstoardb to ~/cardstoard_predeploy_backup.sql
2. git pull  →  pull latest main from GitHub on EC2
3. rebuild   →  docker-compose -f docker-compose.prod.yml up --build -d  (no-cache)
4. migrate   →  python migrate.py  (runs outstanding SQL migration files)
5. restore   →  psql  →  restore from pre-deploy dump into fresh DB
6. smoke     →  curl /health, /api/cards/, /api/settings/, HTTPS frontend
```

### Partial modes

```bash
./utils/deploy-ec2-prod.sh --check    # smoke test only (no rebuild)
./utils/deploy-ec2-prod.sh --deploy   # rebuild only (skip validation)
```

### Local development

```bash
./utils/deploy-local-dev.sh           # full local rebuild + smoke test
./utils/deploy-local-dev.sh --deploy  # rebuild only
./utils/deploy-local-dev.sh --check   # validate only
```

---

## Project Layout (Key Paths)

```
CardStoard/
├── backend/
│   ├── app/
│   │   ├── routes/        auth, cards, analytics, settings, account, chat, dictionary
│   │   ├── services/      card_value.py, fuzzy_match.py, image_pipeline.py
│   │   ├── models.py      SQLAlchemy ORM entities
│   │   ├── schemas.py     Pydantic request / response models
│   │   └── data/          players.json, seed_dictionary.py (867+ entries)
│   └── migrations/        001–005 SQL migration files
├── frontend/
│   ├── src/
│   │   ├── pages/         All full-page views (24 pages)
│   │   ├── components/    Reusable components (AppHeader, ChatPanel, etc.)
│   │   ├── context/       AuthContext — session, token refresh, theme
│   │   └── api/api.js     Axios instance with token-refresh interceptor
│   └── deploy/
│       └── nginx.prod.conf
└── utils/
    ├── deploy-ec2-prod.sh
    ├── deploy-local-dev.sh
    ├── smoke_test.sh
    └── renew-cert.sh
```
