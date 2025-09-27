from sqlalchemy.orm import Session
from .database import SessionLocal, engine, Base
from .models import User, Card
from .auth.security import hash_password

def seed():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    # Define test users and their "grade buckets"
    test_users = {
        "test1@example.com": 0.2,   # Poor
        "test2@example.com": 0.4,   # Fair
        "test3@example.com": 0.8,   # Good
        "test4@example.com": 1.0,   # VG
        "test5@example.com": 1.5,   # EX
    }

    # Common password for all test users
    default_password = "test123"

    # Sample card templates (players & brands)
    base_cards = [
        {"first_name": "Tony", "last_name": "Gwynn", "year": 1983, "brand": "Topps", "card_number": "482", "rookie": True},
        {"first_name": "Ryne", "last_name": "Sandberg", "year": 1983, "brand": "Topps", "card_number": "83", "rookie": True},
        {"first_name": "Wade", "last_name": "Boggs", "year": 1983, "brand": "Topps", "card_number": "498", "rookie": True},
    ]

    for email, grade in test_users.items():
        # Create or get user
        user = db.query(User).filter_by(email=email).first()
        if not user:
            user = User(email=email, password_hash=hash_password(default_password))
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"✅ Created test user: {email} / {default_password} (id={user.id})")
        else:
            print(f"ℹ️ User already exists: {email} (id={user.id})")

        # Seed cards for this user if none exist
        if db.query(Card).filter_by(user_id=user.id).count() == 0:
            cards = []
            for base in base_cards:
                card = Card(
                    **base,
                    grade=grade,
                    book_high=200.0,
                    book_mid=150.0,
                    book_low=100.0,
                    user_id=user.id,
                )
                cards.append(card)
            db.add_all(cards)
            db.commit()
            print(f"✅ Seeded {len(cards)} cards for {email} (grade={grade})")
        else:
            print(f"ℹ️ Cards already exist for {email}, skipping.")

    db.close()


if __name__ == "__main__":
    seed()
