# Project Milestones

This document tracks major snapshots and feature milestones in the CardStoard project.

---

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
