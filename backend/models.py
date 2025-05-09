# models.py
from pydantic import BaseModel
from typing import List

class SLARequest(BaseModel):
    services: List[str]

class SLAResponse(BaseModel):
    composite_sla: float
