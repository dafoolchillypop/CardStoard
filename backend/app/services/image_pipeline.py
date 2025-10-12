# backend/app/services/image_pipeline.py
from typing import Tuple, Dict, Any
import os, re, cv2, pytesseract
import numpy as np
from PIL import Image

class CardCropError(Exception):
    pass

# Debug output directory
DEBUG_DIR = "/code/app/static/debug"
os.makedirs(DEBUG_DIR, exist_ok=True)

BRANDS = [
    "Topps", "Bowman", "Fleer", "Upper Deck", "Donruss",
    "Leaf", "Score", "Panini", "Goudey", "Sport Kings"
]

# ---------------------------
# Utility helpers
# ---------------------------
def _read_to_ndarray(image_bytes: bytes) -> np.ndarray:
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise CardCropError("Unable to decode image bytes")
    return img

def _order_points(pts: np.ndarray) -> np.ndarray:
    # order: top-left, top-right, bottom-right, bottom-left
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect

def _four_point_transform(image: np.ndarray, pts: np.ndarray) -> np.ndarray:
    rect = _order_points(pts)
    (tl, tr, br, bl) = rect
    widthA = np.linalg.norm(br - bl)
    widthB = np.linalg.norm(tr - tl)
    maxWidth = int(max(widthA, widthB))
    heightA = np.linalg.norm(tr - br)
    heightB = np.linalg.norm(tl - bl)
    maxHeight = int(max(heightA, heightB))
    dst = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]], dtype="float32")
    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (maxWidth, maxHeight))
    return warped

# ---------------------------
# Card detection
# ---------------------------
def find_card_and_warp(image_bgr: np.ndarray) -> Tuple[np.ndarray, Dict[str, Any]]:
    debug: Dict[str, Any] = {"steps": []}
    h, w = image_bgr.shape[:2]

    # --- Step 1: stronger preprocessing ---
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    th = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_MEAN_C,
        cv2.THRESH_BINARY, 51, 10
    )
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    closed = cv2.morphologyEx(th, cv2.MORPH_CLOSE, kernel)
    edges = cv2.Canny(closed, 50, 150)

    cv2.imwrite(os.path.join(DEBUG_DIR, "edges.jpg"), edges)

    # --- Step 2: contour detection (with hierarchy) ---
    contours, hierarchy = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:15]

    card_quad = None
    chosen_ratio = None

    for c in contours:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        if len(approx) == 4:
            area = cv2.contourArea(approx)
            area_ratio = area / float(h * w)

            x, y, w_box, h_box = cv2.boundingRect(approx)
            aspect_ratio = w_box / float(h_box)

            # skip slab edges (too big, aspect near 1)
            if area_ratio > 0.97:
                continue

            if 0.2 < area_ratio < 0.95 and 0.6 < aspect_ratio < 0.8:
                card_quad = approx.reshape(4, 2).astype("float32")
                chosen_ratio = area_ratio
                debug["steps"].append(
                    f"selected contour (ratio={area_ratio:.2f}, aspect={aspect_ratio:.2f})"
                )
                break

    # --- Step 3: fallback hierarchy search ---
    if card_quad is None and hierarchy is not None:
        for idx, c in enumerate(contours):
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.02 * peri, True)
            if len(approx) == 4:
                area_ratio = cv2.contourArea(approx) / float(h * w)
                if 0.2 < area_ratio < 0.95:
                    card_quad = approx.reshape(4, 2).astype("float32")
                    chosen_ratio = area_ratio
                    debug["steps"].append(
                        f"hierarchy fallback contour (ratio={area_ratio:.2f})"
                    )
                    break

    # --- Step 4: central crop fallback ---
    if card_quad is None:
        margin = 0.1
        x1 = int(w * margin)
        y1 = int(h * margin)
        x2 = int(w * (1 - margin))
        y2 = int(h * (1 - margin))
        cropped = image_bgr[y1:y2, x1:x2]
        debug["steps"].append("central crop fallback")
        cv2.imwrite(os.path.join(DEBUG_DIR, "cropped.jpg"), cropped)
        return cropped, debug

    # --- Warp perspective ---
    warped = _four_point_transform(image_bgr, card_quad)
    ch, cw = warped.shape[:2]
    debug["cropped_size"] = {"width": cw, "height": ch, "ratio": chosen_ratio}

    # Debug overlays
    dbg_img = image_bgr.copy()
    cv2.drawContours(dbg_img, [card_quad.astype(int)], -1, (0, 255, 0), 3)
    cv2.imwrite(os.path.join(DEBUG_DIR, "contour.jpg"), dbg_img)
    cv2.imwrite(os.path.join(DEBUG_DIR, "cropped.jpg"), warped)

    return warped, debug

# ---------------------------
# Pipelines
# ---------------------------
def run_crop_pipeline(image_bytes: bytes) -> Dict[str, Any]:
    """Decode bytes, find card, warp, return cropped image + debug."""
    img = _read_to_ndarray(image_bytes)
    cropped, dbg = find_card_and_warp(img)

    ok, enc = cv2.imencode(".jpg", cropped, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
    if not ok:
        raise CardCropError("Failed to encode cropped image")

    return {
        "debug": dbg,
        "cropped_image": cropped,            # ndarray
        "cropped_jpeg_bytes": enc.tobytes(), # JPEG bytes
    }

def run_ocr(card_bgr: np.ndarray) -> str:
    """
    Run Tesseract OCR on the cropped card image.
    Improved version with upscaling, denoising, and padding for slabbed cards.
    """
    # --- Step 1: upscale for better OCR ---
    card_bgr = cv2.resize(card_bgr, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)

    # --- Step 2: denoise while preserving edges ---
    card_bgr = cv2.bilateralFilter(card_bgr, 11, 17, 17)

    # --- Step 3: grayscale ---
    gray = cv2.cvtColor(card_bgr, cv2.COLOR_BGR2GRAY)

    # --- Step 4: thresholding ---
    # try OTSU first
    _, th_otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # adaptive threshold as fallback
    th_adapt = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 35, 11
    )

    # choose the one with more "ink" (mean pixel value lower = more dark text)
    if th_otsu.mean() < th_adapt.mean():
        th = th_otsu
        method = "otsu"
    else:
        th = th_adapt
        method = "adaptive"

    # --- Step 5: add padding to help Tesseract ---
    padded = cv2.copyMakeBorder(th, 20, 20, 20, 20, cv2.BORDER_CONSTANT, value=255)

    # --- Step 6: OCR with sparse text mode ---
    pil_img = Image.fromarray(padded)
    config = "--psm 6"  # Assume a block of text, good for stats/backs
    text = pytesseract.image_to_string(pil_img, config=config)

    return text.strip()

def structured_ocr(ocr_text: str):
    text = ocr_text.replace("\n", " ").replace("\r", " ")
    text = re.sub(r"\s+", " ", text).strip()

    fields = {
        "first_name": "",
        "last_name": "",
        "year": None,
        "brand": "",
        "card_number": "",
        "rookie": False,
        "confidence": 0.4,
    }

    # --- Card Number (e.g. "498" or "#498") ---
    match_num = re.search(r"\b#?(\d{1,4})\b", text)
    if match_num:
        fields["card_number"] = match_num.group(1)

    # --- Year (look for © 1983 or just 1983 Topps) ---
    match_year = re.search(r"[©\(]?\s?(19[56789]\d|20[0-2]\d)", text)
    if match_year:
        fields["year"] = int(match_year.group(1))

    # --- Brand ---
    for brand in BRANDS:
        if re.search(brand, text, re.IGNORECASE):
            fields["brand"] = brand
            break

    # --- Name (capitalized two-word sequence near edge text) ---
    match_name = re.search(r"\b([A-Z][a-zA-Z]+)\s+([A-Z][a-zA-Z]+)\b", text)
    if match_name:
        fields["first_name"] = match_name.group(1).title()
        fields["last_name"] = match_name.group(2).title()

        full_name = f"{fields['first_name']} {fields['last_name']}"
        if fields["year"] and full_name in ROOKIE_YEARS:
            if ROOKIE_YEARS[full_name] == fields["year"]:
                fields["rookie"] = True

    # --- Confidence boost if key fields present ---
    score = 0
    for key in ["first_name", "last_name", "year", "brand", "card_number"]:
        if fields[key]:
            score += 0.15
    fields["confidence"] = min(score, 1.0)

    return fields

def _read_to_ndarray(image_bytes: bytes) -> np.ndarray:
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise CardCropError("Unable to decode image bytes")
    return img

def run_ocr_roi(img_roi: np.ndarray) -> str:
    """Run OCR on a single ROI with preprocessing."""
    gray = cv2.cvtColor(img_roi, cv2.COLOR_BGR2GRAY)
    norm = cv2.normalize(gray, None, 0, 255, cv2.NORM_MINMAX)
    th = cv2.adaptiveThreshold(norm, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                               cv2.THRESH_BINARY, 35, 10)
    pil_img = Image.fromarray(th)
    text = pytesseract.image_to_string(pil_img, config="--psm 6")
    return text.strip()

import re

def structured_ocr(ocr_text: str) -> dict:
    """
    Parse OCR text into structured card fields.
    Input must be a string (not an image).
    """
    if not isinstance(ocr_text, str):
        raise TypeError(f"structured_ocr expected str, got {type(ocr_text)}")

    fields = {
        "first_name": "",
        "last_name": "",
        "year": None,
        "brand": "",
        "card_number": "",
        "rookie": False,
        "confidence": 0.4
    }

    text = ocr_text.lower()

    # --- Name extraction ---
    # crude split: take first two "words"
    tokens = re.findall(r"[a-zA-Z]+", text)
    if len(tokens) >= 2:
        fields["first_name"] = tokens[0].capitalize()
        fields["last_name"] = tokens[1].capitalize()

    # --- Year detection ---
    year_match = re.search(r"(19[0-9]{2}|20[0-2][0-9])", text)
    if year_match:
        fields["year"] = int(year_match.group(0))

    # --- Brand detection ---
    for brand in ["topps", "bowman", "upper deck", "fleer", "donruss"]:
        if brand in text:
            fields["brand"] = brand.title()
            break

    # --- Card number detection ---
    num_match = re.search(r"(no\.?\s*\d+[a-z]?)", text)
    if num_match:
        fields["card_number"] = num_match.group(0).replace("no", "").replace(".", "").strip()

    # --- Rookie detection ---
    if "rookie" in text or "rc" in text:
        fields["rookie"] = True

    # Confidence bump if we found year + brand + number
    if fields["year"] and fields["brand"] and fields["card_number"]:
        fields["confidence"] = 1.0

    return fields

