from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routes import cards #, balls, packs, boxes, auth

# Create database tables (if not exist)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Baseball Memorabilia Inventory")

# ---------------------------
# CORS Configuration
# ---------------------------
origins = [
    "http://localhost:3000",           # Browser during development
    "http://host.docker.internal:3000" # Frontend container
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allow GET, POST, PUT, DELETE, OPTIONS
    allow_headers=["*"],
)

# ---------------------------
# Include routers
# ---------------------------
app.include_router(cards.router, prefix="/cards", tags=["cards"])
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
