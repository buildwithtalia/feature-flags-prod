from pydantic import BaseModel, Field, ValidationError
from typing import Optional, List
from datetime import datetime

class FeatureFlag(BaseModel):
    id: str
    name: Optional[str] = None
    enabled: bool
    description: Optional[str] = None
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None
    rules: Optional[list] = None

class SegmentRequest(BaseModel):
    segment: str
