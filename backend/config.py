import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()

# Base directory for the backend (this file's parent)
BASE_DIR = Path(__file__).resolve().parent

# Database Configuration
DB_SERVER = os.getenv("DB_SERVER", "DESKTOP-M6L3RIM")
DB_DATABASE = os.getenv("DB_DATABASE", "master")
DB_USERNAME = os.getenv("DB_USERNAME", "")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_TRUSTED_CONNECTION = os.getenv("DB_TRUSTED_CONNECTION", "yes").lower() == "yes"
DB_DRIVER = os.getenv("DB_DRIVER", "ODBC Driver 17 for SQL Server")

# Build connection string
if DB_TRUSTED_CONNECTION:
    CONNECTION_STRING = (
        f"DRIVER={{{DB_DRIVER}}};"
        f"SERVER={DB_SERVER};"
        f"DATABASE={DB_DATABASE};"
        f"Trusted_Connection=yes;"
    )
else:
    CONNECTION_STRING = (
        f"DRIVER={{{DB_DRIVER}}};"
        f"SERVER={DB_SERVER};"
        f"DATABASE={DB_DATABASE};"
        f"UID={DB_USERNAME};"
        f"PWD={DB_PASSWORD};"
    )

# Query Execution Settings
MAX_EXECUTION_TIME = int(os.getenv("MAX_EXECUTION_TIME", "30"))  # seconds
MAX_RESULT_ROWS = int(os.getenv("MAX_RESULT_ROWS", "10000"))
MAX_CONCURRENT_QUERIES = int(os.getenv("MAX_CONCURRENT_QUERIES", "3"))

# Security Settings
DANGEROUS_KEYWORDS = [
    "DROP", "TRUNCATE", "DELETE", "ALTER",
    "EXEC", "EXECUTE", "SP_", "XP_"
]

# Enable confirmation for queries without WHERE clause
REQUIRE_WHERE_FOR_DELETE = os.getenv("REQUIRE_WHERE_FOR_DELETE", "true").lower() == "true"

# Audit Logging
ENABLE_AUDIT_LOG = os.getenv("ENABLE_AUDIT_LOG", "true").lower() == "true"
AUDIT_LOG_FILE = BASE_DIR / "logs" / "audit.log"
AUDIT_LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

# CORS Settings
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

# Server Settings
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
RELOAD = os.getenv("RELOAD", "true").lower() == "true"

# Session Settings
SESSION_TIMEOUT = int(os.getenv("SESSION_TIMEOUT", "3600"))  # 1 hour
MAX_HISTORY_ITEMS = int(os.getenv("MAX_HISTORY_ITEMS", "100"))

# Authentication Settings
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    # Generate a random secret if not provided (for development only)
    import secrets
    JWT_SECRET = secrets.token_urlsafe(32)
    logger = __import__('logging').getLogger(__name__)
    logger.warning("⚠️  JWT_SECRET not set! Using random secret. Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(32))\"")

ADMIN_SETUP_KEY = os.getenv("ADMIN_SETUP_KEY")
if not ADMIN_SETUP_KEY:
    ADMIN_SETUP_KEY = "CHANGE_THIS_SETUP_KEY"
    logger = __import__('logging').getLogger(__name__)
    logger.warning("⚠️  ADMIN_SETUP_KEY not set! Using default. Please set a secure value in .env")

SESSION_DURATION_HOURS = int(os.getenv("SESSION_DURATION_HOURS", "8"))
