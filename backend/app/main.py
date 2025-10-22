import os, logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, Base
from app.routes import cards, rtr_settings, auth, analytics, email_test, account, valuation
from app.auth.cookies import set_access_cookie
from app.jobs.scheduler import start_scheduler, stop_scheduler

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
    logging.info("Creating tables (if not exist)")
    Base.metadata.create_all(bind=engine)
    # only start scheduler in the worker process
    if os.getenv("WORKER", "1") == "1":  # optional: set WORKER=1 in your env
        start_scheduler(app.state)

@app.on_event("shutdown")
def on_shutdown():
    stop_scheduler()

# ---------------------------
# Include routers
# ---------------------------
app.include_router(cards.router)
app.include_router(rtr_settings.router)
app.include_router(auth.router)
app.include_router(analytics.router)
app.include_router(email_test.router)
app.include_router(account.router)
app.include_router(valuation.router)
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