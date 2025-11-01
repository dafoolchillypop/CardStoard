# utils/locustfile_v1.py
from locust import HttpUser, task, between
import random
import string

def random_string(n=6):
    return ''.join(random.choices(string.ascii_lowercase, k=n))

class CardStoardUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        """Each user logs in once and reuses the session cookies."""
        self.email = f"testuser_{random_string()}@example.com"
        self.password = "Password123!"

        # Try login first; if fail, register then login
        login_res = self.client.post("/auth/login", json={"email": self.email, "password": self.password})
        if login_res.status_code != 200:
            self.client.post("/auth/register", json={"email": self.email, "password": self.password})
            self.client.post("/auth/login", json={"email": self.email, "password": self.password})

        # Save session cookies automatically
        self.client.cookies = self.client.cookies

    # --- Core User Behaviors ---

    @task(5)
    def list_cards(self):
        """Retrieve card list"""
        self.client.get("/cards/?skip=0&limit=25", name="GET /cards")

    @task(3)
    def add_card(self):
        """Add a new card"""
        card = {
            "first_name": "Test",
            "last_name": random.choice(["Gwynn", "Boggs", "Sandberg", "Mattingly"]),
            "year": random.choice([1979, 1983, 1987, 1990]),
            "brand": random.choice(["Topps", "Fleer", "Donruss"]),
            "rookie": random.choice([0, 1]),
            "card_number": str(random.randint(1, 700)),
            "book_high": random.uniform(10, 50),
            "book_mid": random.uniform(5, 25),
            "book_low": random.uniform(1, 10),
            "grade": random.choice([3.0, 1.5, 1.0, 0.8])
        }
        self.client.post("/cards/", json=card, name="POST /cards")

    @task(2)
    def update_random_card(self):
        """Fetch and update a random card if available"""
        resp = self.client.get("/cards/?limit=10", name="GET /cards (for update)")
        try:
            cards = resp.json()
            if not isinstance(cards, list) or not cards:
                return
            card_id = random.choice(cards).get("id")
            if card_id:
                update = {"grade": random.choice([3.0, 1.5, 1.0])}
                self.client.put(f"/cards/{card_id}", json=update, name="PUT /cards/{id}")
        except Exception as e:
            print(f"[WARN] update_random_card failed: {e}")

    @task(2)
    def revalue_one_card(self):
        """Recalculate one card’s value (fix: correct POST verb, safe json parse)"""
        resp = self.client.get("/cards/?limit=5", name="GET /cards (for revalue)")
        try:
            cards = resp.json()
            if not isinstance(cards, list) or not cards:
                return
            card_id = random.choice(cards).get("id")
            if card_id:
                self.client.post(f"/cards/{card_id}/value", name="POST /cards/{id}/value")
        except Exception as e:
            print(f"[WARN] revalue_one_card failed: {e}")

    @task(2)
    def revalue_all(self):
        """Trigger global revaluation (less frequent)"""
        self.client.post("/cards/revalue-all", name="POST /cards/revalue-all")

    @task(3)
    def analytics_page(self):
        """Get analytics summary"""
        self.client.get("/analytics/", name="GET /analytics")

    @task(2)
    def admin_settings(self):
        """Check settings"""
        self.client.get("/settings/", name="GET /settings")

    @task(1)
    def logout_and_relogin(self):
        """Occasionally log out and back in to test session refresh"""
        self.client.post("/auth/logout", name="POST /auth/logout")
        self.client.post("/auth/login", json={"email": self.email, "password": self.password}, name="POST /auth/login (relogin)")

