import io
import logging
from contextlib import asynccontextmanager
from typing import Optional
import torch
from fastapi import FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel
from transformers import AutoImageProcessor, AutoModelForImageClassification

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ai_service")

# Model configuration
MODEL_NAME = "capcheck/ai-human-generated-image-detection"
DEVICE = "cpu"

# Global inference engine state
processor: Optional[AutoImageProcessor] = None
model: Optional[AutoModelForImageClassification] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Load the AI detection model once at application startup into memory.
    """
    global processor, model
    logger.info(f"Loading AI detection model: '{MODEL_NAME}' on {DEVICE}...")
    try:
        processor = AutoImageProcessor.from_pretrained(MODEL_NAME)
        model = AutoModelForImageClassification.from_pretrained(MODEL_NAME)
        model.to(DEVICE)
        model.eval()
        logger.info(f"Model '{MODEL_NAME}' initialized and ready for inference.")
    except Exception as exc:
        logger.error(f"Failed to load AI detection model '{MODEL_NAME}': {exc}")
        raise exc
    yield
    # Shutdown / cleanup
    processor = None
    model = None


# Initialize FastAPI application
app = FastAPI(
    title="VerifyMe AI / Deepfake Detection Service",
    description="Microservice for AI and deepfake detection.",
    version="0.1.0",
    lifespan=lifespan,
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


class DetectResponse(BaseModel):
    filename: str
    format: Optional[str]
    width: int
    height: int
    prediction: str
    human_probability: float
    ai_probability: float
    model: str


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


@app.post("/detect", response_model=DetectResponse, tags=["Detection"])
async def detect_image(file: UploadFile = File(...)):
    """
    Image-analysis endpoint. Validates image, runs inference through
    capcheck/ai-human-generated-image-detection, and returns authentic softmax probabilities.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided in upload request.",
        )

    if processor is None or model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI detection model is not loaded or initialized.",
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
            img.load()  # Verify image integrity
            image_format = img.format
            width, height = img.size
            # Convert to RGB mode for ViT image processor
            rgb_image = img.convert("RGB")
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

    # Preprocess image and execute model inference
    try:
        inputs = processor(images=rgb_image, return_tensors="pt").to(DEVICE)
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            probs = torch.nn.functional.softmax(logits, dim=-1)[0]

        # Extract actual probabilities from model output
        # id2label: {0: 'human', 1: 'AI-generated'}
        human_prob = float(probs[0].item())
        ai_prob = float(probs[1].item())
        pred_class_id = int(torch.argmax(probs).item())
        predicted_label = model.config.id2label.get(
            pred_class_id, "human" if pred_class_id == 0 else "AI-generated"
        )

        return DetectResponse(
            filename=file.filename,
            format=image_format,
            width=width,
            height=height,
            prediction=predicted_label,
            human_probability=round(human_prob, 6),
            ai_probability=round(ai_prob, 6),
            model=MODEL_NAME,
        )
    except Exception as exc:
        logger.error(f"Inference error for {file.filename}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model inference failed: {str(exc)}",
        )
