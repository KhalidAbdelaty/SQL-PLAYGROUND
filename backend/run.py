"""
SQL Playground Backend Server
Run this file to start the API server
"""
import uvicorn
import config

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("SQL Playground - Starting Backend Server")
    print("=" * 60)
    print(f"Host: {config.HOST}")
    print(f"Port: {config.PORT}")
    print(f"API Docs: http://localhost:{config.PORT}/docs")
    print(f"WebSocket: ws://localhost:{config.PORT}/ws")
    print("=" * 60 + "\n")

    uvicorn.run(
        "app.main:app",
        host=config.HOST,
        port=config.PORT,
        reload=config.RELOAD,
        log_level="info"
    )

