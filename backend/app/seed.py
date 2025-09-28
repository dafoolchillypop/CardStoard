# backend/app/seed.py
import sys
import bcrypt
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app import models
from app.auth.security import hash_password

Base.metadata.create_all(bind=engine)

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def seed():
    db = SessionLocal()

    # --- cleanup in correct order ---
    db.query(models.Card).delete()
    db.query(models.GlobalSettings).delete()
    db.query(models.User).delete()
    db.commit()

    # --- create fresh users ---
    users = []
    for i in range(1, 6):
        u = models.User(email=f"test{i}@example.com", password_hash=hash_password("test123"))
        db.add(u)
        db.flush()  # assigns ID

        # add one global settings per user
        settings = models.GlobalSettings(
            user_id=u.id,
            rookie_factor=0.8,
            auto_factor=1.0,
            mtgrade_factor=0.85,
            exgrade_factor=0.75,
            vggrade_factor=0.6,
            gdgrade_factor=0.55,
            frgrade_factor=0.5,
            prgrade_factor=0.4,
        )
        db.add(settings)

        # add a set of cards for this user
        grades = [0.2, 0.4, 0.8, 1.0, 3.0]
        for g in grades:
            c = models.Card(
                first_name="Tony",
                last_name="Gwynn",
                year=1983,
                brand="Topps",
                card_number=f"RC{i}{int(g*10)}",
                rookie=True,
                grade=g,
                book_high=200.0,
                book_mid=150.0,
                book_low=100.0,
                user_id=u.id,
            )
            db.add(c)

        users.append(u)

    db.commit()
    db.close()
    print(f"Seeded {len(users)} users with test cards.")

if __name__ == "__main__":
    seed()
