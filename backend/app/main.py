from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import engine, Base
from .routes import cards, settings, auth #, balls, packs, boxes, auth
from sqlalchemy import Column, Integer, String, Float, JSON

app = FastAPI(title="CardStoard")

# ---------------------------
# CORS Configuration
# ---------------------------

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://host.docker.internal:3000",
    "http://[::1]:3000",  # IPv6 localhost
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,     # explicitly use the list
    allow_credentials=True,    # cookies allowed
    allow_methods=["*"],
    allow_headers=["*"],
)


app.mount("/static", StaticFiles(directory="app/static"), name="static")

@app.on_event("startup")
def on_startup():
    # Create tables once the app is starting and DB is available
    Base.metadata.create_all(bind=engine)

# ---------------------------
# Include routers
# ---------------------------
app.include_router(cards.router)
app.include_router(settings.router)
app.include_router(auth.router)
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