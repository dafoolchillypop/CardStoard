from locust import HttpUser, between, task, TaskSet
import random, os

TEST_PASSWORD = "TestPass123!"
USER_FILE = "utils/loadtest/seeded_users.txt"

def load_seeded_users():
    if not os.path.exists(USER_FILE):
        raise FileNotFoundError(f"Missing {USER_FILE}. Run db_seeder_v0.9.py first.")
    with open(USER_FILE, "r") as f:
        users = [line.strip() for line in f if line.strip()]
    if not users:
        raise ValueError(f"No users found in {USER_FILE}")
    return users

SEED_USERS = load_seeded_users()

class UserBehavior(TaskSet):
    def on_start(self):
        self.user.email = random.choice(SEED_USERS)
        resp = self.client.post("/auth/login", json={
            "email": self.user.email, "password": TEST_PASSWORD
        })
        if resp.status_code not in (200, 204):
            print(f"⚠️ Login failed for {self.user.email}: {resp.status_code} {resp.text}")

    @task(4)
    def list_cards(self):
        skip = random.randint(0, 10) * 25
        self.client.get(f"/cards/?skip={skip}&limit=25", name="GET /cards")

    @task(2)
    def add_card(self):
        payload = {
            "first_name": "Load",
            "last_name": f"Tester{random.randint(1,9999)}",
            "year": random.randint(1950, 1990),
            "brand": random.choice(["Topps","Fleer","Donruss","Bowman"]),
            "card_number": str(random.randint(1,999)),
            "rookie": random.choice([True, False]),
            "grade": random.choice([3,1.5,1,0.8])
        }
        self.client.post("/cards/", json=payload, name="POST /cards")

    @task(2)
    def revalue_one(self):
        cards = self.client.get("/cards/?limit=10").json()
        if isinstance(cards, list) and cards:
            card_id = random.choice(cards).get("id")
            if card_id:
                self.client.post(f"/cards/{card_id}/value", name="POST /cards/{id}/value")

    @task(1)
    def analytics(self):
        self.client.get("/analytics/", name="GET /analytics")

class SimulatedUser(HttpUser):
    tasks = [UserBehavior]
    wait_time = between(1, 3)
