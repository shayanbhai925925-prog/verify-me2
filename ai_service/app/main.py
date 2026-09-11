import io
import logging
from typing import Optional
from fastapi import FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ai_service")

# Initialize FastAPI application
app = FastAPI(
    title="VerifyMe AI / Deepfake Detection Service",
    description="Microservice for AI and deepfake detection (Step 4 skeleton).",
    version="0.1.0",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


class ImageInfoResponse(BaseModel):
    filename: str
    format: Optional[str]
    width: int
    height: int


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """
    Health-check endpoint confirming that the AI detection service is running.
    """
    return HealthResponse(
        status="ok",
        service="ai-detection-service",
        version="0.1.0",
    )


@app.post("/detect", response_model=ImageInfoResponse, tags=["Detection"])
async def detect_image(file: UploadFile = File(...)):
    """
    Image-analysis endpoint. Validates and inspects uploaded image file.
    Returns basic information: filename, detected image format, width, and height.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided in upload request.",
        )

    # Read uploaded file contents
    try:
        content = await file.read()
    except Exception as exc:
        logger.error(f"Failed to read file {file.filename}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded file: {str(exc)}",
        )

    if not content or len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    # Validate and load image safely with Pillow
    try:
        image_stream = io.BytesIO(content)
        with Image.open(image_stream) as img:
            img.load()  # Verify image can be decoded and loaded safely
            image_format = img.format
            width, height = img.size
    except UnidentifiedImageError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is not a valid or supported image format.",
        )
    except Exception as exc:
        logger.error(f"Image processing error for {file.filename}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to decode or process image: {str(exc)}",
        )

    return ImageInfoResponse(
        filename=file.filename,
        format=image_format,
        width=width,
        height=height,
    )
