from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# --- Database URL ---
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@stoardb:5432/cardstoardb"
)

# --- Engine with connection pooling ---
# These settings reduce latency and avoid connection churn under load
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_size=10,          # persistent connections in pool
    max_overflow=20,       # extra burst connections beyond pool_size
    pool_timeout=30,       # wait time before giving up if pool is full
    pool_recycle=1800,     # recycle connections every 30 min (avoid stale)
    pool_pre_ping=True,    # checks if connection is alive before use
    echo=False             # set True for SQL debugging
)

# --- Session factory ---
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# --- Base model class ---
Base = declarative_base()

# --- Dependency for FastAPI routes ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
