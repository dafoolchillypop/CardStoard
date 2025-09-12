from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routes import cards, settings #, balls, packs, boxes, auth
from sqlalchemy import Column, Integer, String, Float, JSON

# Create database tables (if not exist)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="CardStoard")

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
app.include_router(cards.router)
app.include_router(settings.router)
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

# ---------------------------
# Global Settings
# ---------------------------
class GlobalSettings(Base):
    __tablename__ = "global_settings"

    id = Column(Integer, primary_key=True, index=True)

    app_name = Column(String, default="CardStoard")
    card_makes = Column(JSON, default=["Bowman","Donruss","Fleer","Topps"])      # store as JSON array
    card_grades = Column(JSON, default=["3.0","1.5","1.0","0.8","0.4","0.2"])     # store as JSON array

    rookie_factor = Column(Float, default=1.00)
    auto_factor = Column(Float, default=1.00)
    mtgrade_factor = Column(Float, default=1.00)
    exgrade_factor = Column(Float, default=1.00)
    vggrade_factor = Column(Float, default=1.00)
    gdgrade_factor = Column(Float, default=1.00)
    frgrade_factor = Column(Float, default=1.00)
    prgrade_factor = Column(Float, default=1.00)

    vintage_era_year = Column(Integer, default=1965)
    modern_era_year = Column(Integer, default=1980)

    vintage_era_factor = Column(Float, default=1.00)
    modern_era_factor = Column(Float, default=1.00)