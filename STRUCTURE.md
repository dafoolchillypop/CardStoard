
# 📖 CardStoard Application Structure

## 🖥 Backend (FastAPI + PostgreSQL)

```
backend/
├── .env                  # Local environment variables
├── .env.prd              # Production environment variables
├── Dockerfile            # Backend Docker build (dev)
├── Dockerfile.prod       # Backend Docker build (production)
├── requirements.txt      # Python dependencies
├── seed.py               # Seeder for initial data
├── database.py           # DB session/connection logic
├── models.py             # Legacy consolidated models
├── schemas.py            # Legacy consolidated schemas
│
├── app/
│   ├── main.py           # FastAPI entrypoint
│   │
│   ├── auth/             # Authentication & security
│   │   ├── cookies.py
│   │   ├── email_verify.py
│   │   └── security.py
│   │
│   ├── config/           # Configuration
│   │   └── cfg_settings.py
│   │
│   ├── core/             # Core app config
│   │   └── config.py
│   │
│   ├── data/             # Reference datasets
│   │   ├── card_reference.csv
│   │   └── players.json
│   │
│   ├── models/           # SQLAlchemy models
│   │   ├── base.py
│   │   ├── card.py
│   │   └── user.py
│   │
│   ├── routes/           # API route handlers
│   │   ├── account.py
│   │   ├── analytics.py
│   │   ├── auth.py
│   │   ├── cards.py
│   │   ├── email_test.py
│   │   └── rtr_settings.py
│   │
│   ├── schemas/          # Pydantic schemas
│   │   ├── card.py
│   │   └── user.py
│   │
│   ├── services/         # Core services
│   │   ├── fuzzy_match.py      # Fuzzy string matching for card/player lookup
│   │   ├── image_pipeline.py   # Image upload/processing
│   │   └── quickadd_parser.py  # CSV/quick-add parsing
│   │
│   ├── src/              # Static app resources
│   │   └── baseball-bg.png
│   │
│   └── static/           # Stored images
│       ├── cards/        # User-uploaded card images
│       └── debug/        # Debug image outputs (cropped, contour, edges)
```

---

## 🌐 Frontend (React)

```
frontend/
├── .dockerignore
├── .env                  # Local environment vars
├── .env.prd              # Production environment vars
├── Dockerfile            # Frontend Docker build
├── Dockerfile.prod       # Production Dockerfile
├── package.json          # React dependencies
├── package-lock.json
│
├── deploy/
│   └── nginx.prod.conf   # Nginx reverse proxy config
│
├── public/               # Public assets
│   ├── index.html
│   ├── logo.png
│   └── baseball-bg.png
│
├── src/
│   ├── index.jsx         # React entrypoint
│   ├── App.jsx           # Root app component
│   │
│   ├── api/              # API client
│   │   ├── api.js
│   │   └── http.js
│   │
│   ├── assets/           # Shared static images
│   │   └── baseball-bg.png
│   │
│   ├── components/       # Shared components
│   │   ├── AppHeader.jsx / AppHeader.css
│   │   ├── NavBar.jsx
│   │   ├── CardForm.jsx
│   │   ├── CardList.jsx
│   │   ├── CardImages.jsx
│   │   ├── ChipsInput.jsx
│   │   ├── LogoutButton.jsx
│   │   ├── Modal.jsx / Modal.css
│   │   └── ProtectedRoute.jsx
│   │
│   ├── context/          # React Context
│   │   └── AuthContext.jsx
│   │
│   ├── pages/            # Full page views
│   │   ├── Home.jsx / HomePage.jsx
│   │   ├── Account.jsx / Account.css
│   │   ├── AddCard.jsx
│   │   ├── DeleteCard.jsx
│   │   ├── CardList.jsx
│   │   ├── CardDetail.jsx
│   │   ├── ImportCards.jsx / ImportCards.css
│   │   ├── Admin.jsx / Admin.css
│   │   └── Analytics.jsx
│   │
│   └── index.css         # Global styles
```
