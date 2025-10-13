import os

# Token lifetimes
ACCESS_MIN = int(os.getenv("ACCESS_MIN", 15))      # default 15 minutes
REFRESH_DAYS = int(os.getenv("REFRESH_DAYS", 14))  # default 14 days

# JWT
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALG = os.getenv("JWT_ALG", "HS256")
