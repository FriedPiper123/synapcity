import os
import firebase_admin
from firebase_admin import credentials, firestore, auth, storage
from .config import settings
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# --- Firebase Admin SDK INITIALISATION ------------------------------------
# We try to initialise Firebase Admin SDK.  During local development the user
# might not have downloaded a service-account JSON file, in which case we fall
# back to `ApplicationDefault()` credentials.  If *that* is unavailable (which
# is common outside GCP), we simply skip initialisation – the parts of the
# backend that only rely on public keys (e.g. verifying ID tokens) will still
# work.

firebase_app = None
try:
    if not firebase_admin._apps:
        cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
        else:
            # This may raise google.auth.exceptions.DefaultCredentialsError.
            cred = credentials.ApplicationDefault()

        firebase_app = firebase_admin.initialize_app(
            cred,
            {
                "projectId": settings.FIREBASE_PROJECT_ID,
                "storageBucket": settings.FIREBASE_STORAGE_BUCKET,
            },
        )
    else:
        firebase_app = firebase_admin.get_app()
except Exception as exc:  # pylint: disable=broad-except
    # Log the error (but avoid importing logging to keep the dep minimal)
    print(
        "[firebase] ⚠️  Firebase Admin SDK could not be initialised. "
        "Certain features that require Firestore / Storage will be disabled.\n"
        f"Reason: {exc}"
    )
    firebase_app = None

# --- Firestore & Storage ----------------------------------------------------
try:
    db = firestore.client(app=firebase_app) if firebase_app else None
except Exception as exc:  # pylint: disable=broad-except
    print(f"[firebase] ⚠️  Firestore unavailable: {exc}")
    db = None

try:
    bucket = storage.bucket(app=firebase_app) if firebase_app else None
except Exception as exc:  # pylint: disable=broad-except
    print(f"[firebase] ⚠️  Storage unavailable: {exc}")
    bucket = None