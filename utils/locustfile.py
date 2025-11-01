# utils/locustfile_v1.1.py
from locust import HttpUser, task, between
import random, string, json

# ---------- Helpers ----------
def random_string(n=6):
    return ''.join(random.choices(string.ascii_lowercase, k=n))

# ---------- Main User ----------
class CardStoardUser(HttpUser):
    wait_time = between(1, 3)

    # ---------------------------
    # Session + Auth Management
    # ---------------------------
    def save_cookies(self, response):
        """Persist all cookies into the current session."""
        if hasattr(response, "cookies"):
            for cookie in response.cookies:
                self.client.cookies.set(cookie.name, cookie.value)

    def on_start(self):
        """Register/login once and persist session cookies."""
        self.email = f"loadtest_{random_string()}@example.com"
        self.username = self.email.split("@")[0]
        self.password = "Password123!"

        # Try to register (ignore duplicates)
        reg = self.client.post("/auth/register", json={
            "email": self.email,
            "username": self.username,
            "password": self.password
        })
        if reg.status_code not in [200, 201]:
            print(f"[WARN] registration failed ({reg.status_code}) {reg.text}")

        # Log in and persist cookies
        login = self.client.post("/auth/login", json={
            "email": self.email,
            "password": self.password
        })
        if login.status_code == 200:
            self.save_cookies(login)
            print(f"[INFO] Logged in as {self.username}")
        else:
            print(f"[ERROR] login failed {login.status_code}: {login.text}")

        # Validate session
        me = self.client.get("/auth/me")
        if me.status_code != 200:
            print(f"[WARN] Session validation failed ({me.status_code}) {me.text}")

    # ---------------------------
    # Core User Behavior Tasks
    # ---------------------------

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
            "grade": random.choice([3.0, 1.5, 1.0, 0.8]),
        }
        self.client.post("/cards/", json=card, name="POST /cards")

    @task(2)
    def update_random_card(self):
        """Fetch and update a random card"""
        resp = self.client.get("/cards/?limit=10", name="GET /cards (update)")
        try:
            cards = resp.json()
            if isinstance(cards, list) and cards:
                card_id = random.choice(cards).get("id")
                if card_id:
                    update = {"grade": random.choice([3.0, 1.5, 1.0])}
                    self.client.put(f"/cards/{card_id}", json=update, name="PUT /cards/{id}")
        except Exception as e:
            print(f"[WARN] update_random_card: {e}")

    @task(2)
    def delete_random_card(self):
        """Occasionally delete a card"""
        resp = self.client.get("/cards/?limit=5", name="GET /cards (delete)")
        try:
            cards = resp.json()
            if isinstance(cards, list) and cards:
                card_id = random.choice(cards).get("id")
                if card_id:
                    self.client.delete(f"/cards/{card_id}", name="DELETE /cards/{id}")
        except Exception as e:
            print(f"[WARN] delete_random_card: {e}")

    @task(2)
    def revalue_one_card(self):
        """Recalculate one card’s value"""
        resp = self.client.get("/cards/?limit=5", name="GET /cards (revalue one)")
        try:
            cards = resp.json()
            if isinstance(cards, list) and cards:
                card_id = random.choice(cards).get("id")
                if card_id:
                    self.client.post(f"/cards/{card_id}/value", name="POST /cards/{id}/value")
        except Exception as e:
            print(f"[WARN] revalue_one_card: {e}")

    @task(1)
    def revalue_all(self):
        """Trigger full revaluation"""
        self.client.post("/cards/revalue-all", name="POST /cards/revalue-all")

    @task(2)
    def analytics_page(self):
        """Access analytics endpoint"""
        self.client.get("/analytics/", name="GET /analytics")

    @task(1)
    def logout_and_relogin(self):
        """Log out and log back in"""
        logout = self.client.post("/auth/logout", name="POST /auth/logout")
        if logout.status_code == 200:
            login = self.client.post("/auth/login", json={
                "email": self.email,
                "password": self.password
            }, name="POST /auth/login (relogin)")
            if login.status_code == 200:
                self.save_cookies(login)
        else:
            print(f"[WARN] logout failed ({logout.status_code})")