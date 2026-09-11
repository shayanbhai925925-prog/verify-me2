from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class DetectionResult(BaseModel):
    is_ai_generated: bool = Field(
        ..., description="Whether the analyzed media is flagged as AI-generated/synthetic"
    )
    confidence: float = Field(
        ..., ge=0.0, le=1.0, description="Overall confidence score between 0.0 and 1.0"
    )
    ai_probability: float = Field(
        ..., ge=0.0, le=1.0, description="Probability that the media is AI-generated (0.0 - 1.0)"
    )
    real_probability: float = Field(
        ..., ge=0.0, le=1.0, description="Probability that the media is authentic/real (0.0 - 1.0)"
    )
    details: Dict[str, Any] = Field(
        default_factory=dict, description="Detailed diagnostic or artifact detection metrics"
    )


class AnalysisResponse(BaseModel):
    success: bool = Field(True, description="Whether the analysis succeeded")
    filename: str = Field(..., description="Name of the analyzed media file")
    media_type: str = Field(..., description="MIME type or detected media category")
    result: DetectionResult = Field(..., description="Detection result metrics")
    message: Optional[str] = Field(None, description="Informational message or warnings")


class HealthResponse(BaseModel):
    status: str = Field("ok", description="Health status of the microservice")
    service: str = Field("ai-detection-microservice", description="Service identifier")
    version: str = Field("0.1.0", description="Service version")
    model_loaded: bool = Field(False, description="Whether the AI detection model is initialized")
