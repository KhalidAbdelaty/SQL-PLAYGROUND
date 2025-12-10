# SQL Playground - Setup & Troubleshooting Guide

## Quick Start

### Prerequisites
- Python 3.8+ installed
- Node.js 16+ installed
- SQL Server accessible (local or remote)
- ODBC Driver 17 for SQL Server

### Step 1: Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Verify configuration
cat .env
# Should show:
# DB_SERVER=DESKTOP-M6L3RIM (or your server name)
# DB_DATABASE=master
# DB_TRUSTED_CONNECTION=yes (or no if using SQL auth)
```

### Step 2: Test SQL Server Connection

```bash
# Test basic connectivity
python -c "import pyodbc; import config; print('Testing...'); conn = pyodbc.connect(config.CONNECTION_STRING, timeout=10); print('✓ Connected!'); conn.close()"
```

If this fails, see "SQL Server Connection Issues" below.

### Step 3: Start Backend

```bash
python run.py
```

Watch for these messages:
- `✓ SQL Server connection validated successfully`
- `✓ Has CREATE DATABASE permission`
- `✓ Has ALTER ANY LOGIN permission`

If you see warnings, check "Permission Issues" below.

### Step 4: Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Verify API URL in src/config.js
# Should point to where backend is running:
# API_BASE_URL: 'http://localhost:8000'

# Start frontend
npm run dev
```

Frontend should open at http://localhost:5173

---

## Common Issues & Solutions

### Issue 1: "Backend server is not running"

**Symptom**: Frontend shows network error, can't reach backend

**Diagnosis**:
```bash
# Test if backend is running
curl http://localhost:8000/health
```

**Solutions**:
1. Check backend is actually running (see Step 3 above)
2. Verify port 8000 is not blocked by firewall
3. Check backend didn't crash on startup - look at terminal for errors

---

### Issue 2: "SQL Server connection failed: Login failed"

**Symptom**: Backend starts but can't connect to SQL Server

**Diagnosis**: Check `.env` file authentication settings

**Solution A - Using Windows Authentication** (Recommended on Windows):
```env
DB_SERVER=DESKTOP-M6L3RIM
DB_DATABASE=master
DB_TRUSTED_CONNECTION=yes
DB_DRIVER=ODBC Driver 17 for SQL Server
```

Requirements:
- Backend must run on Windows
- Windows user must have SQL Server access
- Run backend with: `python run.py` (not as administrator unless needed)

**Solution B - Using SQL Authentication**:
```env
DB_SERVER=DESKTOP-M6L3RIM
DB_DATABASE=master
DB_TRUSTED_CONNECTION=no
DB_USERNAME=sql_playground_admin
DB_PASSWORD=YourSecurePassword123!
DB_DRIVER=ODBC Driver 17 for SQL Server
```

Create SQL login:
```sql
-- Run in SQL Server Management Studio
CREATE LOGIN sql_playground_admin 
WITH PASSWORD = 'YourSecurePassword123!';

ALTER SERVER ROLE sysadmin ADD MEMBER sql_playground_admin;
```

---

### Issue 3: "Cannot reach SQL Server"

**Symptom**: Connection timeout or "server not found"

**Diagnosis**:
```bash
# Try to connect directly
sqlcmd -S DESKTOP-M6L3RIM -Q "SELECT @@VERSION"
```

**Solutions**:

1. **Enable TCP/IP in SQL Server**:
   - Open SQL Server Configuration Manager
   - SQL Server Network Configuration → Protocols for MSSQLSERVER
   - Enable "TCP/IP"
   - Right-click TCP/IP → Properties → IP Addresses
   - Set TCP Port = 1433 for IPAll
   - Restart SQL Server service

2. **Allow firewall**:
```powershell
# Run PowerShell as Administrator
New-NetFirewallRule -DisplayName "SQL Server" -Direction Inbound -LocalPort 1433 -Protocol TCP -Action Allow
```

3. **Check SQL Server Browser service** (if using named instances):
```powershell
# Start SQL Server Browser
Start-Service SQLBrowser
Set-Service SQLBrowser -StartupType Automatic
```

4. **Verify server name**:
```bash
# Get actual computer name
hostname

# Use this name in .env as DB_SERVER
```

---

### Issue 4: "Missing CREATE DATABASE permission"

**Symptom**: Backend connects but sandbox creation fails with permission error

**Diagnosis**:
```bash
# Check health endpoint
curl http://localhost:8000/api/health/sqlserver
```

Look for:
```json
{
  "permissions": {
    "create_database": false,  // ← This should be true
    "create_login": false       // ← This should be true
  }
}
```

**Solution**:
```sql
-- Run in SQL Server Management Studio
-- Replace 'your_login' with actual login name shown in health check

-- Grant sysadmin role (easiest):
ALTER SERVER ROLE sysadmin ADD MEMBER [your_login];

-- OR grant specific permissions:
GRANT CREATE ANY DATABASE TO [your_login];
GRANT ALTER ANY LOGIN TO [your_login];
```

---

### Issue 5: "ODBC Driver 17 for SQL Server not found"

**Symptom**: `pyodbc.Error: ('01000', ...ODBC Driver...)`

**Solution**: Install ODBC Driver

**Windows**:
Download from: https://go.microsoft.com/fwlink/?linkid=2249004

**Linux** (Ubuntu/Debian):
```bash
curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add -
curl https://packages.microsoft.com/config/ubuntu/$(lsb_release -rs)/prod.list > /etc/apt/sources.list.d/mssql-release.list
apt-get update
ACCEPT_EULA=Y apt-get install -y msodbcsql17
```

**macOS**:
```bash
brew tap microsoft/mssql-release https://github.com/Microsoft/homebrew-mssql-release
brew update
brew install msodbcsql17
```

After installation, verify:
```bash
# List available drivers
python -c "import pyodbc; print([x for x in pyodbc.drivers() if 'SQL Server' in x])"
```

---

### Issue 6: Frontend can't connect to backend on different machine

**Symptom**: Backend on Windows, frontend on Mac/Linux or different computer

**Solution**: Update frontend config

Edit `frontend/src/config.js`:
```javascript
const config = {
    // Replace localhost with actual IP or hostname
    API_BASE_URL: 'http://192.168.1.100:8000',  // Backend IP
    WS_BASE_URL: 'ws://192.168.1.100:8000',
    // ...
};
```

Update backend CORS in `backend/.env`:
```env
CORS_ORIGINS=http://localhost:5173,http://192.168.1.50:5173
#                                   ^^^^^^^^^^^^^^^^^^^^^^
#                                   Add frontend machine IP
```

Restart backend after changing CORS_ORIGINS.

---

### Issue 7: "Failed to create sandbox: [pyodbc error]"

**Symptom**: Registration fails with pyodbc error message

**Common Causes**:

1. **Database name collision**:
   - Check if database already exists: `SELECT name FROM sys.databases WHERE name LIKE 'SandboxDB_%'`
   - Delete old sandbox: `DROP DATABASE [SandboxDB_olduser_timestamp]`

2. **Out of disk space**:
   - Check SQL Server data directory has space
   - Each sandbox starts at ~5MB and can grow to 100MB

3. **Transaction log full**:
   ```sql
   -- Check log size
   DBCC SQLPERF(LOGSPACE);
   
   -- Shrink log if needed (on master)
   BACKUP LOG master TO DISK = 'NUL';
   DBCC SHRINKFILE (mastlog, 1);
   ```

---

## Health Check Endpoints

Use these to diagnose issues:

### 1. Backend Health
```bash
curl http://localhost:8000/health
```

Shows:
- Database connection status
- Admin user exists
- Configuration

### 2. SQL Server Health
```bash
curl http://localhost:8000/api/health/sqlserver
```

Shows:
- SQL Server version
- Connected database
- Login name
- Permissions (CREATE DATABASE, ALTER LOGIN)

### 3. Auth Setup Status
```bash
curl http://localhost:8000/api/auth/check-setup
```

Shows:
- Whether admin user exists
- If setup is required

---

## Testing Sandbox Creation

After backend is healthy, test sandbox creation:

```bash
curl -X POST http://localhost:8000/api/auth/register-sandbox \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

Expected response:
```json
{
  "token": "eyJ...",
  "user": {
    "username": "testuser",
    "role": "sandbox",
    "database_name": "SandboxDB_testuser_...",
    ...
  },
  "expires_at": "..."
}
```

If this works, the frontend will also work.

---

## Architecture Reference

```
Frontend (React @ localhost:5173)
    ↓ HTTP REST API
Backend (FastAPI @ localhost:8000)
    ↓ SQLite (auth.db - user accounts, sessions)
    ↓ pyodbc
SQL Server (DESKTOP-M6L3RIM)
    └── master (default connection)
    └── SandboxDB_* (created per user)
```

**Data Flow for Sandbox Creation**:
1. User submits registration form (frontend)
2. POST /api/auth/register-sandbox (backend auth routes)
3. Create user in auth.db (SQLite)
4. Call provisioner.create_sandbox_environment()
5. Connect to SQL Server as admin
6. CREATE LOGIN (SQL Server)
7. CREATE DATABASE (SQL Server)
8. CREATE USER in new database
9. GRANT permissions
10. Insert sample data
11. Record sandbox in auth.db
12. Return JWT token to frontend
13. Frontend stores token, redirects to main app

**Critical Requirement**: Step 5 (Connect to SQL Server as admin) must succeed with sufficient permissions for steps 6-10.

---

## Still Having Issues?

1. **Check backend logs** - they now show detailed error messages
2. **Check browser console** - frontend errors appear here (F12)
3. **Test health endpoints** - they reveal configuration issues
4. **Try SQL authentication** instead of Windows auth if on different machines
5. **Grant sysadmin role** to SQL login for testing (can restrict later)

## Success Indicators

You know it's working when:

✓ Backend starts with "SQL Server connection validated successfully"
✓ curl http://localhost:8000/health returns "healthy"
✓ curl http://localhost:8000/api/health/sqlserver shows "connected": true
✓ Frontend loads without network errors
✓ Can create sandbox account and login successfully
✓ Backend logs show "Provisioning sandbox for user: X" → "Successfully created sandbox"
