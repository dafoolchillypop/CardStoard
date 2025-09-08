from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session
import os
from ..models import card as models
from ..schemas import card as schemas
from ..main import SessionLocal

router = APIRouter()

UPLOAD_DIR = "./uploaded_images"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=schemas.Card)
async def create_card(player: str, year: int, file: UploadFile | None = File(None), db: Session = Depends(get_db)):
    image_path = None
    if file:
        file_location = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_location, "wb+") as f:
            f.write(file.file.read())
        image_path = file_location
    db_card = models.Card(player=player, year=year, image_path=image_path)
    db.add(db_card)
    db.commit()
    db.refresh(db_card)
    return db_card
