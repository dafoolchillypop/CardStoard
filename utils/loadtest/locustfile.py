from locust import HttpUser, between, task, TaskSet
import random, os, sys, argparse, time

TEST_PASSWORD = "TestPass123!"
USER_FILE = "utils/loadtest/seeded_users.txt"

# --- Run Modes ---
parser = argparse.ArgumentParser(add_help=False)
parser.add_argument("--mode", choices=["all", "crud", "auth", "value"], default="all")
args, unknown = parser.parse_known_args()
MODE = args.mode


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
        print(f"🔧 Running Locust in MODE = {MODE.upper()}")
        self.user.email = random.choice(SEED_USERS)
        self.login_user()

    def login_user(self):
        resp = self.client.post("/auth/login", json={
            "email": self.user.email,
            "password": TEST_PASSWORD
        })
        if resp.status_code not in (200, 204):
            print(f"⚠️ Login failed for {self.user.email}: {resp.status_code} {resp.text}")
        else:
            self.last_login = time.time()

    def logout_user(self):
        resp = self.client.post("/auth/logout", name="POST /auth/logout")
        if resp.status_code not in (200, 204):
            print(f"⚠️ Logout failed: {resp.status_code} {resp.text}")

    # ------------------------
    # AUTH MODE
    # ------------------------
    if MODE in ("all", "auth"):
        @task(3)
        def check_me(self):
            """Verify current session."""
            self.client.get("/auth/me", name="GET /auth/me")

        @task(2)
        def refresh_token(self):
            """Refresh the access token."""
            self.client.post("/auth/refresh", name="POST /auth/refresh")

        @task(1)
        def periodic_logout_login(self):
            """Simulate logout and re-login to test cookie/session renewal."""
            self.logout_user()
            time.sleep(random.uniform(0.5, 2))
            self.login_user()

    # ------------------------
    # CRUD MODE
    # ------------------------
    if MODE in ("all", "crud"):
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
                "brand": random.choice(["Topps", "Fleer", "Donruss", "Bowman"]),
                "card_number": str(random.randint(1, 999)),
                "rookie": random.choice([True, False]),
                "grade": random.choice([3, 1.5, 1, 0.8]),
            }
            resp = self.client.post("/cards/", json=payload, name="POST /cards")
            if resp.status_code >= 400:
                print(f"❌ Add card failed: {resp.status_code} {resp.text}")

        @task(2)
        def update_card(self):
            cards = self.client.get("/cards/?limit=10").json()
            if not isinstance(cards, list) or not cards:
                return
            card = random.choice(cards)
            card_id = card.get("id")
            if not card_id:
                return
            update_payload = {"grade": random.choice([3, 1.5, 1, 0.8])}
            resp = self.client.put(f"/cards/{card_id}", json=update_payload, name="PUT /cards/{id}")
            if resp.status_code >= 400:
                print(f"❌ Update card failed ({card_id}): {resp.status_code} {resp.text}")

        @task(1)
        def delete_card(self):
            cards = self.client.get("/cards/?limit=5").json()
            if not isinstance(cards, list) or not cards:
                return
            card = random.choice(cards)
            card_id = card.get("id")
            if not card_id:
                return
            resp = self.client.delete(f"/cards/{card_id}", name="DELETE /cards/{id}")
            if resp.status_code >= 400 and resp.status_code != 404:
                print(f"❌ Delete card failed ({card_id}): {resp.status_code} {resp.text}")

    # ------------------------
    # VALUE MODE
    # ------------------------
    if MODE in ("all", "value"):
        @task(2)
        def revalue_one(self):
            cards = self.client.get("/cards/?limit=10").json()
            if isinstance(cards, list) and cards:
                card_id = random.choice(cards).get("id")
                if card_id:
                    self.client.post(f"/cards/{card_id}/value", name="POST /cards/{id}/value")

        @task(1)
        def revalue_all(self):
            self.client.post("/cards/revalue-all", name="POST /cards/revalue-all")


class SimulatedUser(HttpUser):
    tasks = [UserBehavior]
    wait_time = between(1, 3)
