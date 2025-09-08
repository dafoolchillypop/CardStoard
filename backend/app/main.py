from fastapi import FastAPI

# Import database Base and engine
from .database import Base, engine

# Import routers
from .routes import cards, balls, packs, boxes, auth

# Create all tables in the database
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="CardStoard",
    description="API backend for managing baseball cards, packs, boxes, and autographed balls.",
    version="1.0.0"
)

@app.get("/health")
def health():
    return {"status": "ok"}

# Include routers
#app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(cards.router, prefix="/cards", tags=["Cards"])
#app.include_router(balls.router, prefix="/balls", tags=["Balls"])
#app.include_router(packs.router, prefix="/packs", tags=["Packs"])
#app.include_router(boxes.router, prefix="/boxes", tags=["Boxes"])
