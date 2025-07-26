import os
from dataclasses import dataclass

@dataclass
class Config:
    google_maps_api_key: str = os.getenv('GOOGLE_MAPS_API_KEY', "AIzaSyAsaVZQ92vQcr_NQTeSt2Silg0oR7ZN2gU")
    tomtom_api_key: str = os.getenv('TOMTOM_API_KEY', 'mBZCMAPJTuOvg59cbU7kFsvO9NdjcjN0')
    openweather_api_key: str = os.getenv('OPENWEATHER_API_KEY', 'd55d5264b3000b50ad445bc6b6e20a24')
    gemini_api_key: str = os.getenv('GEMINI_API_KEY', "AIzaSyAsaVZQ92vQcr_NQTeSt2Silg0oR7ZN2gU")
    firebase_cred_path: str = os.getenv('FIREBASE_CRED_PATH')
    firebase_db_url: str = os.getenv('FIREBASE_DB_URL')
    google_search_api_key: str = os.getenv('GOOGLE_SEARCH_API_KEY', 'AIzaSyBtd-GUZ4vzjFQn0P3mJUVL7_qp8RzNWPM')
    search_engine_id: str = os.getenv('SEARCH_ENGINE_ID', '859cb0beb353942be')
config = Config()