from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import engine, Base
from .routes import cards, rtr_settings, auth, analytics, email_test, account, chat, dictionary
from .config import cfg_settings
from .auth.cookies import set_access_cookie

app = FastAPI(title="CardStoard")

# ---------------------------
# CORS Configuration
# ---------------------------

origins = [
    # Local dev
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://host.docker.internal:3000",
    "http://[::1]:3000",

    # Production
    "https://cardstoard.com",
    "https://www.cardstoard.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,     # explicitly use the list
    allow_credentials=True,    # cookies allowed
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="app/static"), name="static")

@app.middleware("http")
async def refresh_access_token(request, call_next):
    response = await call_next(request)
    new_token = getattr(request.state, "new_access_token", None)
    if new_token:
        set_access_cookie(response, new_token)
    return response

@app.on_event("startup")
def on_startup():
    # Create tables once the app is starting and DB is available
    Base.metadata.create_all(bind=engine)

    from .database import SessionLocal
    from .data.seed_dictionary import seed_dictionary
    db = SessionLocal()
    try:
        seed_dictionary(db)
    finally:
        db.close()

    # --- Schema drift check ---
    # Compares SQLAlchemy model columns against the live DB.
    # Logs a WARNING if any columns are missing — a signal that
    # `python migrate.py` needs to be run before deploying.
    import logging
    from sqlalchemy import inspect as sa_inspect
    logger = logging.getLogger("cardstoard.schema")
    inspector = sa_inspect(engine)
    missing = []
    for table in Base.metadata.sorted_tables:
        db_cols = {col["name"] for col in inspector.get_columns(table.name)}
        for col in table.columns:
            if col.name not in db_cols:
                missing.append(f"{table.name}.{col.name}")
    if missing:
        logger.warning(
            "SCHEMA DRIFT DETECTED — run `python migrate.py` to apply pending migrations. "
            "Missing columns: %s",
            ", ".join(missing)
        )
    else:
        logger.info("Schema check passed — DB matches model.")

# ---------------------------
# Include routers
# ---------------------------
app.include_router(cards.router)
app.include_router(rtr_settings.router)
app.include_router(auth.router)
app.include_router(analytics.router)
app.include_router(email_test.router)
app.include_router(account.router)
app.include_router(chat.router)
app.include_router(dictionary.router)
#app.include_router(balls.router, prefix="/balls", tags=["balls"])
#app.include_router(packs.router, prefix="/packs", tags=["packs"])
#app.include_router(boxes.router, prefix="/boxes", tags=["boxes"])
#app.include_router(auth.router, prefix="/auth", tags=["auth"])

# ---------------------------
# Health check endpoint
# ---------------------------
@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok"}