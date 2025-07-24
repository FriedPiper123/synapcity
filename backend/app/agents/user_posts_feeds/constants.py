import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get environment variables with fallback to hardcoded values for backward compatibility
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
FS_CREDENTIAL_JSON = os.getenv("FS_CREDENTIAL_JSON", "credentials/serviceAccountKey.json")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")