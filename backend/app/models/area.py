from pydantic import BaseModel
from typing import Dict, Any
from datetime import datetime

class CrimeTrend(BaseModel):
    current_level: str
    trend_direction: str
    incidents_this_month: int

class WaterShortageTrend(BaseModel):
    current_status: str
    frequency: str
    last_reported: datetime

class AreaData(BaseModel):
    name: str
    crimeTrend: CrimeTrend
    powerOutageFrequency: int
    waterShortageTrend: WaterShortageTrend
    overallSentiment: float
    lastUpdatedAt: datetime
    
    class Config:
        from_attributes = True
