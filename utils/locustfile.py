"""
CardStoard v1.0 Load Testing Script (Fixed for Locust integer weights)
"""
from locust import HttpUser, task, between
import random, string, io, csv

BASE_USER = "testuser"
BASE_DOMAIN = "example.com"
DEFAULT_PASSWORD = "testpassword"


def random_username():
    return BASE_USER + "_" + "".join(random.choices(string.ascii_lowercase, k=6))


def random_card_payload():
    years = [1979, 1985, 1987, 1989, 1991, 1993]
    brands = ["Topps", "Donruss", "Fleer", "Upper Deck", "Score"]
    players = ["Barry Bonds", "Ken Griffey Jr.", "Tony Gwynn", "Cal Ripken Jr."]
    return {
        "year": random.choice(years),
        "brand": random.choice(brands),
        "player": random.choice(players),
        "book_high": random.randint(10, 100),
        "book_low": random.randint(1, 10),
        "grade": round(random.uniform(0.8, 1.2), 2),
        "rookie": random.choice([True, False]),
    }


class CardStoardUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        self.username = random_username()
        self.email = f"{self.username}@{BASE_DOMAIN}"

        reg_payload = {
            "email": self.email,
            "username": self.username,
            "password": DEFAULT_PASSWORD,
        }
        self.client.post("/auth/register", json=reg_payload, name="POST /auth/register")

        self.client.post(
            "/auth/login",
            json={"email": self.email, "password": DEFAULT_PASSWORD},
            name="POST /auth/login",
        )

    # ---------- READ/VIEW TASKS ----------
    @task(30)
    def list_cards(self):
        self.client.get("/cards", name="GET /cards")

    @task(20)
    def analytics(self):
        self.client.get("/analytics/", name="GET /analytics")

    @task(10)
    def settings_view(self):
        self.client.get("/settings/", name="GET /settings/")

    # ---------- CRUD TASKS ----------
    @task(20)
    def add_card(self):
        payload = random_card_payload()
        self.client.post("/cards/", json=payload, name="POST /cards")

    @task(15)
    def update_card(self):
        card_id = random.randint(1, 200)
        payload = {"grade": round(random.uniform(0.8, 1.2), 2)}
        self.client.put(f"/cards/{card_id}", json=payload, name="PUT /cards/{id}")

    @task(8)
    def delete_card(self):
        card_id = random.randint(1, 50)
        self.client.delete(f"/cards/{card_id}", name="DELETE /cards/{id}")

    # ---------- REVALUATION TASKS ----------
    @task(20)
    def revalue_random_card(self):
        card_id = random.randint(1, 100)
        self.client.put(f"/cards/{card_id}/value", name="PUT /cards/{id}/value")

    @task(10)
    def revalue_all_cards(self):
        self.client.post("/cards/revalue-all", name="POST /cards/revalue-all")

    # ---------- CSV IMPORT ----------
    @task(5)
    def import_csv(self):
        data = io.StringIO()
        writer = csv.writer(data)
        writer.writerow(["year", "brand", "player", "book_high", "book_low"])
        for _ in range(3):
            row = random_card_payload()
            writer.writerow([row["year"], row["brand"], row["player"], row["book_high"], row["book_low"]])
        data.seek(0)
        files = {"file": ("sample.csv", data.getvalue(), "text/csv")}
        self.client.post("/cards/import-csv", files=files, name="POST /cards/import-csv")

    # ---------- AUTH ----------
    @task(10)
    def logout_and_relogin(self):
        self.client.post("/auth/logout", name="POST /auth/logout")
        self.client.post(
            "/auth/login",
            json={"email": self.email, "password": DEFAULT_PASSWORD},
            name="POST /auth/login (relogin)",
        )

    @task(2)
    def delete_account(self):
        self.client.delete(f"/users/{self.username}", name="DELETE /users/{username}")

    def on_stop(self):
        self.client.post("/auth/logout", name="POST /auth/logout (exit)")
