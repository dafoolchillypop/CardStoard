
# CardStoard

CardStoard is a full-stack web application for managing, tracking, and valuing a baseball card collection.  
It combines a **FastAPI backend** with a **React frontend**, fully containerized using Docker and deployable on AWS EC2.

---

## 🚀 Features

- **Inventory Management**: Add, edit, and delete cards with images.
- **Image Handling**: Upload front/back scans, processed via an image pipeline.
- **Player & Card Reference**: Preloaded datasets for validation and quick-add.
- **Authentication**: Email verification, secure login, session cookies, and JWT support.
- **Valuation**: Historical sales data and fuzzy matching for card recognition.
- **Admin Tools**: Manage users, view analytics, and configure system settings.
- **Deployment Ready**: Configured with Nginx, Docker Compose, and environment files for dev/prod.

---

## 🖥 Tech Stack

- **Backend**: FastAPI, SQLAlchemy, PostgreSQL  
- **Frontend**: React, Context API, Axios for API calls  
- **DevOps**: Docker, Nginx, AWS EC2 (t2.micro/t3.micro)  
- **Other**: Python scripts for seeding, shell scripts for redeploy/testing

---

## 📂 Project Structure

For a full detailed breakdown of backend/frontend contents, see [STRUCTURE.md](STRUCTURE.md).

---

## ⚡ Quick Start

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/CardStoard.git
cd CardStoard
```

### 2. Development (local Docker)
```bash
docker-compose up --build
```

### 3. Production (EC2 / remote)
```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

### 4. Access the app
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`

---

## 📌 Roadmap

- [ ] MFA / TOTP authentication
- [ ] eBay integration for live valuations
- [ ] Mobile-friendly UI
- [ ] Enhanced analytics dashboards

---

## 📜 License

This project is for personal use and hobby development. License TBD.
