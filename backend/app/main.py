from fastapi import FastAPI
from .models import base
from .routes import cards
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql://postgres:postgres@db:5432/memorabilia"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

base.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Baseball Memorabilia API")
app.include_router(cards.router, prefix="/cards", tags=["Cards"])


from fastapi.staticfiles import StaticFiles
app.mount("/uploaded_images", StaticFiles(directory="./uploaded_images"), name="images")
