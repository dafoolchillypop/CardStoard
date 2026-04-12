"""
backend/app/routes/admin.py
----------------------------
Admin-only operations, all mounted under /admin.

Key endpoints:
  POST /admin/bulk-image-import   Accept ZIP of card photos, link each to the correct card.
                                  Filenames must match: {card_id}_{front|back}_{anything}.{ext}
                                  Returns: { imported: N, errors: ["...", ...] }
"""
import io
import os
import re
import shutil
import zipfile
from pathlib import Path as FSPath

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from werkzeug.utils import secure_filename

from app import models
from app.database import get_db
from app.auth.security import get_current_user
from app.models import User

router = APIRouter(prefix="/admin", tags=["admin"])

# Same upload directory as cards.py
BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "static", "cards")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Allowed image extensions
_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}

# Pattern: {int}_{front|back}_{anything}.{ext}
_FILENAME_RE = re.compile(
    r"^(?P<card_id>\d+)_(?P<side>front|back)_(?P<rest>.+)$",
    re.IGNORECASE,
)


def _parse_zip_filename(name: str):
    """
    Parse a zip entry filename into (card_id, side, safe_original).
    Returns None if the name doesn't match the expected pattern.
    Only the bare filename (no directory prefix) is matched.
    """
    bare = os.path.basename(name)
    m = _FILENAME_RE.match(bare)
    if not m:
        return None
    ext = os.path.splitext(bare)[1].lower()
    if ext not in _IMAGE_EXTS:
        return None
    return int(m.group("card_id")), m.group("side").lower(), bare


@router.post("/bulk-image-import")
def bulk_image_import(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """
    Accept a ZIP archive of card photos. Each file must be named:
        {card_id}_{front|back}_{anything}.{ext}

    Only images belonging to the current user are updated.
    Returns a summary of imported files and any per-file errors.
    """
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip files are accepted.")

    raw = file.file.read()
    if not zipfile.is_zipfile(io.BytesIO(raw)):
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid ZIP archive.")

    imported = 0
    errors   = []

    upload_dir = FSPath(UPLOAD_DIR).resolve()
    upload_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(io.BytesIO(raw), "r") as zf:
        for entry_name in zf.namelist():
            # Skip directories
            if entry_name.endswith("/"):
                continue

            parsed = _parse_zip_filename(entry_name)
            if not parsed:
                errors.append(
                    f"{os.path.basename(entry_name)}: skipped — "
                    "filename must match {card_id}_{front|back}_{anything}.{ext}"
                )
                continue

            card_id, side, bare_name = parsed

            # Ownership check
            card = db.query(models.Card).filter(
                models.Card.id == card_id,
                models.Card.user_id == current.id,
            ).first()
            if not card:
                errors.append(f"{bare_name}: card ID {card_id} not found or not owned by you.")
                continue

            # Safely build output filename
            safe_name = secure_filename(bare_name)
            filename  = f"card_{card_id}_{side}_{safe_name}"
            filepath  = (upload_dir / filename).resolve()

            # Path traversal guard
            if not str(filepath).startswith(str(upload_dir)):
                errors.append(f"{bare_name}: invalid path — skipped.")
                continue

            # Write file
            try:
                with zf.open(entry_name) as src, open(filepath, "wb") as dst:
                    shutil.copyfileobj(src, dst)
            except Exception as exc:
                errors.append(f"{bare_name}: write error — {exc}.")
                continue

            # Update DB
            rel_path = f"/static/cards/{filename}"
            if side == "front":
                card.front_image = rel_path
            else:
                card.back_image = rel_path

            db.commit()
            imported += 1

    return {"imported": imported, "errors": errors}
