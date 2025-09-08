from fastapi import FastAPI
from .database import Base, engine
from .routes import cards, balls, packs, boxes, auth

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

# Routers
app.include_router(cards.router)
app.include_router(balls.router)
app.include_router(packs.router)
app.include_router(boxes.router)
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
