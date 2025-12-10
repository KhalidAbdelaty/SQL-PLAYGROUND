from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import time
import config
from app.routes import query, schema, websocket, analytics, health
from app.auth.routes import router as auth_router
from app.auth.middleware import AuthMiddleware
from app.middleware import RateLimitMiddleware

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="SQL Playground API",
    description="Professional database management interface with authentication and real-time query execution",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add rate limiting (60 requests per minute per IP)
app.add_middleware(RateLimitMiddleware, requests_per_minute=60)

# Add authentication middleware
app.add_middleware(AuthMiddleware)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all HTTP requests"""
    start_time = time.time()
    
    # Process request
    response = await call_next(request)
    
    # Calculate duration
    duration = time.time() - start_time
    
    # Log request
    logger.info(
        f"{request.method} {request.url.path} "
        f"completed in {duration:.3f}s with status {response.status_code}"
    )
    
    return response


# Exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )


# Include routers
app.include_router(auth_router)  # Auth routes FIRST (they're public)
app.include_router(health.router)  # Health checks
app.include_router(query.router)
app.include_router(schema.router)
app.include_router(websocket.router)
app.include_router(analytics.router)


# Health check endpoint
@app.get("/")
async def root():
    """Root endpoint - health check"""
    return {
        "status": "healthy",
        "service": "SQL Playground API",
        "version": "2.0.0",
        "authentication": "enabled"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    from app.database import db_manager
    from app.auth.database import auth_db
    
    # Test database connection
    db_status = db_manager.test_connection()
    
    # Check if admin setup is required
    admin_exists = auth_db.check_admin_exists()
    
    return {
        "status": "healthy" if db_status.get("connected") else "unhealthy",
        "database": db_status,
        "authentication": {
            "admin_exists": admin_exists,
            "setup_required": not admin_exists
        },
        "config": {
            "server": config.DB_SERVER,
            "database": config.DB_DATABASE,
            "max_execution_time": config.MAX_EXECUTION_TIME,
            "max_result_rows": config.MAX_RESULT_ROWS,
            "session_duration": config.SESSION_DURATION_HOURS
        }
    }


# Startup event
@app.on_event("startup")
async def startup_event():
    """Run on application startup"""
    logger.info("=" * 60)
    logger.info("SQL Playground API Starting (v2.0 - Authenticated)")
    logger.info("=" * 60)
    logger.info(f"Server: {config.DB_SERVER}")
    logger.info(f"Database: {config.DB_DATABASE}")
    logger.info(f"Max Execution Time: {config.MAX_EXECUTION_TIME}s")
    logger.info(f"Max Result Rows: {config.MAX_RESULT_ROWS}")
    logger.info(f"Session Duration: {config.SESSION_DURATION_HOURS} hours")
    logger.info(f"Audit Logging: {'Enabled' if config.ENABLE_AUDIT_LOG else 'Disabled'}")
    logger.info("=" * 60)
    
    # Validate SQL Server connection
    from app.startup import validate_sql_server_connection
    sql_valid = validate_sql_server_connection()
    
    if not sql_valid:
        logger.warning("=" * 60)
        logger.warning("⚠️  SQL SERVER VALIDATION FAILED")
        logger.warning("    Sandbox user registration will not work!")
        logger.warning("    Admin login may still work if using Windows Auth")
        logger.warning("=" * 60)
    
    # Test database connection
    from app.database import db_manager
    db_status = db_manager.test_connection()
    
    if db_status.get("connected"):
        logger.info("✓ SQL Server connection successful")
        logger.info(f"  Server: {db_status.get('server')}")
        logger.info(f"  Database: {db_status.get('database')}")
    else:
        logger.error("✗ SQL Server connection failed")
        logger.error(f"  Error: {db_status.get('error')}")
    
    # Check auth database
    from app.auth.database import auth_db
    admin_exists = auth_db.check_admin_exists()
    
    if admin_exists:
        logger.info("✓ Authentication database initialized")
        logger.info("  Admin user exists")
    else:
        logger.warning("⚠ No admin user found")
        logger.warning(f"  Please create admin via: /api/auth/setup-admin")
        logger.warning(f"  Setup key: {config.ADMIN_SETUP_KEY}")
    
    logger.info("=" * 60)
    logger.info("Backend API ready at: http://{}:{}".format(config.HOST if config.HOST != "0.0.0.0" else "localhost", config.PORT))
    logger.info("API Documentation: http://{}:{}/docs".format(config.HOST if config.HOST != "0.0.0.0" else "localhost", config.PORT))
    logger.info("=" * 60)


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown"""
    logger.info("SQL Playground API shutting down")
    
    # Cleanup expired sessions and sandboxes
    try:
        from app.services.cleanup import cleanup_expired_sandboxes
        count = await cleanup_expired_sandboxes()
        if count > 0:
            logger.info(f"Cleaned up {count} expired sandbox(es)")
    except Exception as e:
        logger.error(f"Error during shutdown cleanup: {e}")
    
    logger.info("Shutdown complete")