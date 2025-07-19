from pydantic import BaseModel
from typing import Dict, List
from datetime import datetime

class AreaTrend(BaseModel):
    daily: List[float]
    weekly: List[float]
    monthly: List[float]

class Area(BaseModel):
    name: str
    crimeTrend: Dict[str, AreaTrend]
    powerOutageFrequency: float
    waterShortageTrend: Dict[str, AreaTrend]
    overallSentiment: float
    lastUpdatedAt: datetime
    
    class Config:
        from_attributes = True 