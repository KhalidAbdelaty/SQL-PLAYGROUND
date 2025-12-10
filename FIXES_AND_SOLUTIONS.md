# SQL Playground - Issues Analysis and Fixes

## Critical Issues Identified

### 1. **SQL Server Connection Issues** (Primary Cause of Network Errors)

**Problem**: Your backend cannot connect to SQL Server properly, causing cascading failures.

**Root Causes**:
- Backend running on a different machine than SQL Server (DESKTOP-M6L3RIM)
- Windows Trusted Connection requires the backend to run on Windows with proper credentials
- No connection validation before attempting operations
- Poor error propagation from pyodbc to frontend

**Symptoms**:
- "Network error" when creating sandbox accounts
- "Network error" on admin login
- Backend logs show connection failures

---

### 2. **Async/Sync Mismatch in Provisioner**

**Problem**: `provisioner.create_sandbox_environment()` is synchronous but called from async context without proper error handling.

**Location**: `backend/app/services/provisioner.py:34-123`

**Impact**: Errors during database creation don't properly bubble up to the API response.

---

### 3. **Missing Error Context in Frontend**

**Problem**: Generic "Network error" message hides actual backend errors.

**Location**: `frontend/src/contexts/AuthContext.jsx:extractErrorMessage()`

**Current behavior**:
```javascript
if (!error.response) {
    return 'Network error. Please check your connection and try again.';
}
```

This catches:
- Backend not running
- CORS issues  
- SQL Server connection failures
- Timeout errors

All display as the same generic message.

---

## Solutions

### Solution 1: Improved Connection Error Handling

Replace `backend/app/services/provisioner.py` method `_get_admin_connection`:

```python
def _get_admin_connection(self):
    """Get admin connection to SQL Server with enhanced error handling"""
    try:
        logger.info(f"Attempting connection to SQL Server: {config.DB_SERVER}")
        conn = pyodbc.connect(self.admin_connection_string, timeout=30)
        
        # Test the connection immediately
        cursor = conn.cursor()
        cursor.execute("SELECT @@VERSION")
        version = cursor.fetchone()[0]
        logger.info(f"Connected to SQL Server successfully")
        return conn
        
    except pyodbc.Error as e:
        error_msg = str(e)
        logger.error(f"SQL Server connection failed: {error_msg}")
        logger.error(f"Server: {config.DB_SERVER}, Database: {config.DB_DATABASE}")
        
        # Provide specific error messages
        if "Login failed" in error_msg:
            raise Exception("SQL Server authentication failed. Check credentials or use Windows Authentication.")
        elif "Server not found" in error_msg or "Named Pipes" in error_msg:
            raise Exception(f"Cannot reach SQL Server '{config.DB_SERVER}'. Check server name and network connectivity.")
        elif "timeout" in error_msg.lower():
            raise Exception(f"SQL Server connection timeout. Server '{config.DB_SERVER}' may be unreachable.")
        else:
            raise Exception(f"SQL Server error: {error_msg}")
```

---

### Solution 2: Wrap Synchronous Provisioner in Async Executor

Modify `backend/app/auth/service.py` method `register_sandbox_user` around line 211:

```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

# At class level, add:
self.executor = ThreadPoolExecutor(max_workers=3)

# Then in register_sandbox_user, replace:
# database_name, sql_login, sql_password = provisioner.create_sandbox_environment(user_data.username)

# With:
try:
    loop = asyncio.get_event_loop()
    database_name, sql_login, sql_password = await loop.run_in_executor(
        self.executor,
        provisioner.create_sandbox_environment,
        user_data.username
    )
except Exception as e:
    logger.error(f"Provisioning failed: {str(e)}")
    auth_db.delete_user(user_id)
    # Re-raise with clear message
    raise ValueError(f"Failed to create sandbox: {str(e)}")
```

---

### Solution 3: Enhanced Frontend Error Display

Update `frontend/src/contexts/AuthContext.jsx` function `extractErrorMessage`:

```javascript
function extractErrorMessage(error) {
  console.error('Full error object:', error);
  
  // Handle network errors with more context
  if (!error.response) {
    if (error.code === 'ECONNREFUSED') {
      return 'Backend server is not running. Please start the backend server.';
    }
    if (error.code === 'ERR_NETWORK') {
      return 'Cannot reach the backend server. Check if it\'s running on http://localhost:8000';
    }
    if (error.message) {
      return `Connection error: ${error.message}`;
    }
    return 'Network error. Please check that the backend server is running.';
  }

  const { data, status } = error.response;

  // Handle different error response formats
  if (typeof data === 'string') {
    return data;
  }

  // Pydantic validation errors (422)
  if (status === 422 && Array.isArray(data.detail)) {
    const messages = data.detail.map(err => {
      const field = err.loc?.slice(-1)[0] || 'field';
      return `${field}: ${err.msg}`;
    });
    return messages.join(', ');
  }

  // Standard error detail
  if (data.detail) {
    return typeof data.detail === 'string' 
      ? data.detail 
      : JSON.stringify(data.detail);
  }

  // Server error with error field
  if (data.error) {
    return data.error;
  }

  // Fallback with status code
  return data.message || `Server error (${status})`;
}
```

---

### Solution 4: Add Connection Health Check Endpoint

Create `backend/app/routes/health.py`:

```python
from fastapi import APIRouter, HTTPException
from app.services.provisioner import provisioner
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/health", tags=["health"])

@router.get("/sqlserver")
async def check_sql_server():
    """Test SQL Server connectivity"""
    try:
        conn = provisioner._get_admin_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT @@VERSION, DB_NAME()")
        row = cursor.fetchone()
        conn.close()
        
        return {
            "connected": True,
            "version": row[0][:100],
            "database": row[1]
        }
    except Exception as e:
        logger.error(f"SQL Server health check failed: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"SQL Server unavailable: {str(e)}"
        )
```

Then add to `backend/app/main.py`:
```python
from app.routes import health
app.include_router(health.router)
```

---

### Solution 5: Add Pre-Flight Validation

Create `backend/app/startup.py`:

```python
import logging
from app.services.provisioner import provisioner

logger = logging.getLogger(__name__)

def validate_sql_server_connection():
    """Validate SQL Server is accessible before starting"""
    try:
        logger.info("Validating SQL Server connection...")
        conn = provisioner._get_admin_connection()
        cursor = conn.cursor()
        
        # Check we can create databases
        cursor.execute("""
            SELECT HAS_PERMS_BY_NAME(NULL, 'DATABASE', 'CREATE DATABASE') AS can_create_db
        """)
        can_create = cursor.fetchone()[0]
        
        if not can_create:
            raise Exception("SQL Server login lacks CREATE DATABASE permission")
        
        conn.close()
        logger.info("✓ SQL Server connection validated successfully")
        return True
        
    except Exception as e:
        logger.error(f"✗ SQL Server validation failed: {e}")
        logger.error("Application will start but sandbox creation will fail!")
        return False
```

Call this in `backend/app/main.py` startup event:
```python
from app.startup import validate_sql_server_connection

@app.on_event("startup")
async def startup_event():
    logger.info("=" * 60)
    logger.info("SQL Playground API Starting (v2.0)")
    logger.info("=" * 60)
    
    # Validate SQL Server connection
    validate_sql_server_connection()
    
    # ... rest of startup code
```

---

## Deployment Configuration

### Option A: Running Backend on Windows (Recommended for SQL Server Windows Auth)

1. **Install Python dependencies**:
```bash
cd backend
pip install -r requirements.txt
```

2. **Verify .env configuration**:
```env
DB_SERVER=DESKTOP-M6L3RIM
DB_DATABASE=master
DB_TRUSTED_CONNECTION=yes
DB_DRIVER=ODBC Driver 17 for SQL Server
```

3. **Run backend**:
```bash
python run.py
```

4. **Configure frontend** (`frontend/src/config.js`):
```javascript
API_BASE_URL: 'http://DESKTOP-M6L3RIM:8000',  // or IP address
```

---

### Option B: Running Backend with SQL Authentication (Works from any machine)

1. **Create SQL Server login** (run in SQL Server):
```sql
CREATE LOGIN sql_playground_admin 
WITH PASSWORD = 'YourSecurePassword123!';

ALTER SERVER ROLE sysadmin ADD MEMBER sql_playground_admin;
```

2. **Update .env**:
```env
DB_SERVER=DESKTOP-M6L3RIM
DB_DATABASE=master
DB_TRUSTED_CONNECTION=no
DB_USERNAME=sql_playground_admin
DB_PASSWORD=YourSecurePassword123!
DB_DRIVER=ODBC Driver 17 for SQL Server
```

3. **Enable SQL Server remote connections**:
- SQL Server Configuration Manager → SQL Server Network Configuration
- Enable TCP/IP protocol
- Set TCP Port to 1433
- Restart SQL Server service

4. **Configure Windows Firewall**:
```powershell
New-NetFirewallRule -DisplayName "SQL Server" -Direction Inbound -LocalPort 1433 -Protocol TCP -Action Allow
```

---

## Quick Fix Checklist

### Backend Issues:
- [ ] Backend running on machine that can access SQL Server
- [ ] SQL Server connection string correct
- [ ] ODBC Driver 17 for SQL Server installed
- [ ] SQL Server allows connections (TCP/IP enabled)
- [ ] Login has CREATE DATABASE permission
- [ ] Firewall allows port 8000 (backend) and 1433 (SQL Server)

### Frontend Issues:
- [ ] API_BASE_URL points to correct backend address
- [ ] Backend CORS_ORIGINS includes frontend URL
- [ ] Browser allows CORS requests
- [ ] Network connectivity between frontend and backend

### Testing:
```bash
# Test backend health
curl http://localhost:8000/health

# Test SQL Server connectivity  
curl http://localhost:8000/api/health/sqlserver

# Test auth setup
curl http://localhost:8000/api/auth/check-setup
```

---

## Common Error Messages and Fixes

### "Network error. Please check your connection"
**Cause**: Backend not reachable
**Fix**: Check backend is running, verify URL in frontend config.js

### "SQL Server connection failed: Login failed"
**Cause**: Windows Auth not working or SQL credentials invalid
**Fix**: Use SQL Authentication instead (see Option B)

### "Cannot reach SQL Server"
**Cause**: SQL Server name wrong or network issue
**Fix**: Verify server name, enable TCP/IP, check firewall

### "SQL Server login lacks CREATE DATABASE permission"
**Cause**: Insufficient permissions
**Fix**: Grant sysadmin or explicit CREATE DATABASE permission

---

## Testing the Fixes

1. **Test SQL Server connection**:
```bash
cd backend
python -c "import pyodbc; import config; conn = pyodbc.connect(config.CONNECTION_STRING); print('Connected!'); conn.close()"
```

2. **Start backend with logging**:
```bash
cd backend
python run.py
# Watch for "✓ SQL Server connection validated successfully"
```

3. **Test sandbox creation**:
```bash
curl -X POST http://localhost:8000/api/auth/register-sandbox \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'
```

4. **Check backend logs** for specific error messages instead of generic failures

---

## Architecture Notes

Your application has this flow:

```
Frontend (React/Vite) 
    ↓ HTTP/WebSocket
Backend (FastAPI) 
    ↓ SQLite (auth data)
    ↓ pyodbc (SQL Server operations)
SQL Server (sandbox databases)
```

**Critical requirement**: The backend must be able to:
1. Connect to SQL Server
2. Create databases (CREATE DATABASE permission)
3. Create logins (ALTER ANY LOGIN permission)
4. Manage database users (ALTER ANY USER permission)

Without these permissions, sandbox creation will always fail.
