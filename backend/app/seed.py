import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal, Base, engine
from app import models
from app.auth.security import hash_password

Base.metadata.create_all(bind=engine)

def seed():
    db: Session = SessionLocal()

    # 🔥 Wipe existing data (cards, settings, users)
    db.query(models.Card).delete()
    db.query(models.GlobalSettings).delete()
    db.query(models.User).delete()
    db.commit()

    # Test users
    users = []
    for i in range(1, 6):
        u = models.User(
            email=f"test{i}@example.com",
            password_hash=hash_password("test123"),
        )
        db.add(u)
        db.commit()
        db.refresh(u)

        settings = models.GlobalSettings(user_id=u.id)
        db.add(settings)
        db.commit()
        users.append(u)

    brands = ["Topps", "Donruss", "Fleer", "Upper Deck", "Bowman"]
    players = [
        ("Tony", "Gwynn"),
        ("Ryne", "Sandberg"),
        ("Wade", "Boggs"),
        ("Ken", "Griffey Jr"),
        ("Cal", "Ripken"),
    ]
    grades = [3.0, 1.5, 1.0, 0.8, 0.4, 0.2]

    now = datetime.utcnow()

    # For each user, create 50–100 cards with random dates
    for u in users:
        for _ in range(random.randint(50, 100)):
            fn, ln = random.choice(players)
            brand = random.choice(brands)
            year = random.randint(1970, 2022)
            grade = random.choice(grades)
            rookie = random.choice([0, 1])

            # Random created_at in the last 24 months
            created_at = now - timedelta(days=random.randint(0, 730))

            # Sometimes simulate an update a few months later
            if random.random() < 0.5:
                updated_at = created_at + timedelta(days=random.randint(30, 300))
            else:
                updated_at = created_at

            card = models.Card(
                user_id=u.id,
                first_name=fn,
                last_name=ln,
                year=year,
                brand=brand,
                card_number=str(random.randint(1, 700)),
                rookie=rookie,
                grade=grade,
                book_high=round(random.uniform(100, 1000)),
                book_high_mid=round(random.uniform(80, 800)),
                book_mid=round(random.uniform(50, 600)),
                book_low_mid=round(random.uniform(20, 300)),
                book_low=round(random.uniform(5, 200)),
                created_at=created_at,
                updated_at=updated_at,
            )

            db.add(card)

        db.commit()

    print("✅ Seed complete: 5 users, random cards with simulated whole-dollar values + history.")


if __name__ == "__main__":
    seed()
