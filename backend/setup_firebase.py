#!/usr/bin/env python3
"""
Firebase Setup Verification Script for SynapCity Backend
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

def check_env_file():
    """Check if .env file exists and has required variables"""
    env_path = Path(".env")
    env_example_path = Path(".env.example")
    
    print("🔍 Checking environment configuration...")
    
    if not env_path.exists():
        print("❌ .env file not found!")
        if env_example_path.exists():
            print("💡 Found .env.example file. Please copy it to .env:")
            print("   cp .env.example .env")
        else:
            print("💡 Please create a .env file with the required variables")
        return False
    
    print("✅ .env file found")
    
    # Load environment variables
    load_dotenv()
    
    required_vars = [
        "FIREBASE_PROJECT_ID",
        "FIREBASE_STORAGE_BUCKET", 
        "GOOGLE_APPLICATION_CREDENTIALS"
    ]
    
    missing_vars = []
    for var in required_vars:
        value = os.getenv(var)
        if not value:
            missing_vars.append(var)
        else:
            print(f"✅ {var}: {value}")
    
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        return False
    
    return True

def check_credentials_file():
    """Check if Firebase credentials file exists"""
    print("\n🔍 Checking Firebase credentials...")
    
    creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not creds_path:
        print("❌ GOOGLE_APPLICATION_CREDENTIALS not set in .env")
        return False
    
    creds_file = Path(creds_path)
    if not creds_file.exists():
        print(f"❌ Credentials file not found: {creds_path}")
        print("\n💡 To fix this:")
        print("1. Go to Firebase Console: https://console.firebase.google.com/")
        print("2. Select your project: synapcity-90985")
        print("3. Go to Project Settings > Service Accounts")
        print("4. Click 'Generate new private key'")
        print("5. Download the JSON file")
        print(f"6. Save it as: {creds_path}")
        return False
    
    print(f"✅ Credentials file found: {creds_path}")
    
    # Try to load and validate the credentials file
    try:
        import json
        with open(creds_file, 'r') as f:
            creds_data = json.load(f)
        
        required_fields = ["type", "project_id", "private_key_id", "private_key", "client_email"]
        missing_fields = [field for field in required_fields if field not in creds_data]
        
        if missing_fields:
            print(f"❌ Invalid credentials file. Missing fields: {', '.join(missing_fields)}")
            return False
        
        if creds_data.get("project_id") != os.getenv("FIREBASE_PROJECT_ID"):
            print(f"⚠️  Warning: Project ID mismatch!")
            print(f"   Credentials file: {creds_data.get('project_id')}")
            print(f"   Environment var:  {os.getenv('FIREBASE_PROJECT_ID')}")
        
        print("✅ Credentials file is valid")
        return True
        
    except json.JSONDecodeError:
        print("❌ Invalid JSON in credentials file")
        return False
    except Exception as e:
        print(f"❌ Error reading credentials file: {str(e)}")
        return False

def test_firebase_connection():
    """Test Firebase connection"""
    print("\n🔍 Testing Firebase connection...")
    
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
        
        # Initialize Firebase if not already done
        if not firebase_admin._apps:
            cred_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
            if cred_path and os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
            else:
                cred = credentials.ApplicationDefault()
            
            firebase_admin.initialize_app(cred, {
                'projectId': os.getenv('FIREBASE_PROJECT_ID'),
                'storageBucket': os.getenv('FIREBASE_STORAGE_BUCKET')
            })
        
        # Test Firestore connection
        db = firestore.client()
        
        # Try to write and read a test document
        test_ref = db.collection('_setup_test').document('test')
        test_ref.set({'test': True, 'timestamp': firestore.SERVER_TIMESTAMP})
        
        # Read it back
        doc = test_ref.get()
        if doc.exists:
            print("✅ Firestore read/write test successful")
            # Clean up
            test_ref.delete()
        else:
            print("❌ Firestore read test failed")
            return False
        
        print("✅ Firebase connection successful!")
        return True
        
    except ImportError as e:
        print(f"❌ Missing Firebase dependencies: {str(e)}")
        print("💡 Install with: pip install firebase-admin")
        return False
    except Exception as e:
        print(f"❌ Firebase connection failed: {str(e)}")
        return False

def check_dependencies():
    """Check if required Python packages are installed"""
    print("\n🔍 Checking Python dependencies...")
    
    required_packages = [
        "fastapi",
        "uvicorn",
        "firebase-admin",
        "python-dotenv",
        "pydantic",
        "httpx",
        "cryptography",
        "python-jose"
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace("-", "_"))
            print(f"✅ {package}")
        except ImportError:
            missing_packages.append(package)
            print(f"❌ {package}")
    
    if missing_packages:
        print(f"\n💡 Install missing packages with:")
        print(f"   pip install {' '.join(missing_packages)}")
        return False
    
    return True

def main():
    """Main setup verification function"""
    print("🚀 SynapCity Backend Setup Verification")
    print("=" * 50)
    
    checks = [
        ("Environment Configuration", check_env_file),
        ("Python Dependencies", check_dependencies),
        ("Firebase Credentials", check_credentials_file),
        ("Firebase Connection", test_firebase_connection)
    ]
    
    all_passed = True
    
    for check_name, check_func in checks:
        print(f"\n📋 {check_name}")
        print("-" * 30)
        
        try:
            result = check_func()
            if not result:
                all_passed = False
        except Exception as e:
            print(f"❌ {check_name} failed with error: {str(e)}")
            all_passed = False
    
    print("\n" + "=" * 50)
    
    if all_passed:
        print("🎉 All checks passed! Your SynapCity backend is ready to run.")
        print("\n🚀 Start the server with:")
        print("   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
    else:
        print("❌ Some checks failed. Please fix the issues above before running the server.")
        sys.exit(1)

if __name__ == "__main__":
    main()
