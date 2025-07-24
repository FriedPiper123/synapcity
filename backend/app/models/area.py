from pydantic import BaseModel
from typing import Any, Dict, List
from datetime import datetime

class AreaTrend(BaseModel):
    daily: List[float]
    weekly: List[float]
    monthly: List[float]

class Area(BaseModel):
    name: str
    crimeTrend: AreaTrend
    powerOutageFrequency: float
    waterShortageTrend: AreaTrend
    overallSentiment: float
    lastUpdatedAt: datetime
    feed_insights: Any
    
    class Config:
        from_attributes = True 