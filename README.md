# SQL Playground - Complete Setup & Troubleshooting Guide

## 🎯 Quick Start

### Prerequisites
- SQL Server 2019+ with Windows Authentication or SQL Auth
- Python 3.8+
- Node.js 16+
- ODBC Driver 17 for SQL Server

### Installation (3 Minutes)

```bash
# 1. Backend Setup
cd backend
pip install -r requirements.txt
python run.py

# 2. Frontend Setup (new terminal)
cd frontend
npm install
npm run dev

# 3. Access
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

---

## 🔧 Configuration

### Backend Environment (`backend/.env`)
```env
# Database Connection
DB_SERVER=YOUR_SERVER_NAME
DB_DATABASE=master
DB_TRUSTED_CONNECTION=yes
DB_DRIVER=ODBC Driver 17 for SQL Server

# Query Execution
MAX_EXECUTION_TIME=30
MAX_RESULT_ROWS=10000
MAX_CONCURRENT_QUERIES=3

# Security - CRITICAL: Set these before production
JWT_SECRET=UzQ8K7mNxP9vL2wR5tY8hB6nM3kJ7pA9sD4fG6hK2lO1
ADMIN_SETUP_KEY=SETUP_2024_SQL_PLAYGROUND_ADMIN

# Session
SESSION_DURATION_HOURS=8

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Server
HOST=0.0.0.0
PORT=8000
```

**Generate Secure Secrets:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Frontend Environment (`frontend/.env`)
```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

---

## 🚀 Features

### Authentication System
- **Admin Accounts**: Full database access with Windows/SQL authentication
- **Sandbox Accounts**: Isolated SQL Server databases with automatic provisioning
- JWT-based session management with 8-hour default duration
- Session extension support (1-24 hours)

### Query Execution
- Real-time SQL query execution
- Monaco editor with syntax highlighting and IntelliSense
- Query history with export capabilities
- Result grid with sorting, filtering, and pagination
- Query performance metrics and execution plans

### Security
- Rate limiting (60 requests/minute per IP)
- SQL injection protection with parameterized queries
- Dangerous keyword detection (DROP, TRUNCATE, etc.)
- Database size limits (100MB per sandbox)
- Automatic sandbox cleanup on expiration

### Database Management
- Interactive schema browser with expand/collapse
- Table/view/procedure inspection
- Quick table preview
- Sandbox environment isolation

---

## 🔍 Troubleshooting

### Issue: Network Error on Login/Register

**Root Causes Fixed:**
1. Missing `JWT_SECRET` and `ADMIN_SETUP_KEY` in backend `.env`
2. Incorrect error handling in `authApi.js` interceptor
3. CORS configuration issues

**Solution Applied:**
- Added required environment variables to `.env`
- Fixed axios interceptor to return complete error object
- Error handling now properly extracts messages from backend responses

**Verify Fix:**
```bash
# Check backend logs
cd backend
python run.py

# Should see:
# ✓ JWT_SECRET configured
# ✓ ADMIN_SETUP_KEY configured
# ✓ Authentication database initialized
```

### Issue: Sandbox Account Creation Fails

**Possible Causes:**
1. **SQL Server Connection**: Admin credentials lack permission to create databases/logins
2. **ODBC Driver Missing**: Install "ODBC Driver 17 for SQL Server"
3. **Windows Authentication**: Ensure backend runs under account with `sysadmin` role

**Check Database Connection:**
```bash
curl http://localhost:8000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "database": {
    "connected": true,
    "server": "YOUR_SERVER",
    "database": "master"
  },
  "authentication": {
    "admin_exists": false,
    "setup_required": true
  }
}
```

### Issue: Admin Login Shows Network Error

**Fixed:** The issue was caused by missing environment variables. After applying the fix:

**Steps to Create Admin:**
1. Ensure backend is running with updated `.env`
2. Use the setup key from your `.env` file
3. Navigate to login page and create admin account
4. Default setup key: `SETUP_2024_SQL_PLAYGROUND_ADMIN`

**API Endpoint:**
```bash
POST http://localhost:8000/api/auth/setup-admin
{
  "username": "admin",
  "password": "YourSecurePassword123!",
  "confirm_password": "YourSecurePassword123!",
  "setup_key": "SETUP_2024_SQL_PLAYGROUND_ADMIN"
}
```

### Issue: CORS Errors

**Check CORS Configuration:**
```python
# backend/config.py
CORS_ORIGINS = ["http://localhost:5173", "http://localhost:3000"]
```

**Common Mistakes:**
- Frontend running on different port than configured
- Missing protocol (http:// vs https://)
- Trailing slashes in URLs

**Fix:**
Update `backend/.env`:
```env
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173
```

### Issue: Token Expired/Invalid

**Symptoms:**
- Automatic logout after period of inactivity
- 401 errors in network tab

**Expected Behavior:**
- Sessions expire after 8 hours by default
- Can be extended up to 24 hours via session extension

**Extend Session:**
```javascript
await authApi.extendSession(8); // Extend by 8 hours
```

### Issue: Sandbox Database Size Limit

**Configuration:**
- Default: 100MB per sandbox database
- Enforced at SQL Server level

**Check Size:**
```sql
SELECT 
    DB_NAME(database_id) AS DatabaseName,
    (size * 8.0 / 1024) AS SizeMB,
    (max_size * 8.0 / 1024) AS MaxSizeMB
FROM sys.master_files
WHERE database_id = DB_ID('SandboxDB_username_timestamp')
```

---

## 📊 API Endpoints

### Authentication
- `GET /api/auth/check-setup` - Check if admin setup required
- `POST /api/auth/setup-admin` - Create first admin user
- `POST /api/auth/login` - Login (admin or sandbox)
- `POST /api/auth/register-sandbox` - Register sandbox user
- `POST /api/auth/logout` - Logout and cleanup
- `POST /api/auth/extend-session` - Extend session duration
- `GET /api/auth/validate` - Validate JWT token
- `GET /api/auth/session-info` - Get session details

### Query Execution
- `POST /api/query/execute` - Execute SQL query
- `GET /api/query/history` - Get query history
- `DELETE /api/query/history` - Clear query history
- `GET /api/query/export` - Export results

### Schema Management
- `GET /api/schema/databases` - List databases
- `GET /api/schema/tables` - List tables in database
- `GET /api/schema/columns` - Get table columns
- `GET /api/schema/preview` - Preview table data

### Analytics
- `GET /api/analytics/stats` - Get usage statistics
- `GET /api/analytics/performance` - Query performance metrics

### WebSocket
- `WS /api/ws/query` - Real-time query execution

---

## 🔐 Security Best Practices

### Production Deployment

1. **Generate Strong Secrets:**
```bash
python -c "import secrets; print('JWT_SECRET=' + secrets.token_urlsafe(32))"
python -c "import secrets; print('ADMIN_SETUP_KEY=' + secrets.token_urlsafe(32))"
```

2. **Update CORS Origins:**
```env
CORS_ORIGINS=https://yourdomain.com
```

3. **Enable HTTPS:**
- Use reverse proxy (nginx, Apache)
- Configure SSL certificates
- Update all URLs to use HTTPS

4. **Database Permissions:**
- Create dedicated service account for backend
- Grant only necessary permissions
- Use SQL authentication instead of Windows auth in production

5. **Rate Limiting:**
Adjust in `backend/app/main.py`:
```python
app.add_middleware(RateLimitMiddleware, requests_per_minute=60)
```

### Audit Logging

All authentication events are logged to:
- `backend/logs/audit.log`
- SQLite database: `backend/auth.db`

**Events Tracked:**
- Login/logout attempts
- Admin creation
- Sandbox provisioning
- Session extensions
- Query execution (if enabled)

**Query Logs:**
```sql
SELECT * FROM auth_events 
WHERE event_type = 'login_failed' 
ORDER BY created_at DESC;
```

---

## 🏗️ Architecture

### Backend Stack
- **FastAPI**: Modern async web framework
- **SQLite**: Authentication database
- **SQL Server**: Query execution and sandbox databases
- **pyodbc**: SQL Server connectivity
- **JWT**: Token-based authentication
- **bcrypt**: Password hashing

### Frontend Stack
- **React 18**: UI framework
- **Vite**: Build tool
- **React Router**: Navigation
- **Monaco Editor**: SQL editor
- **Axios**: HTTP client
- **TailwindCSS**: Styling

### Database Architecture

```
auth.db (SQLite)
├── users
│   ├── user_id (PK)
│   ├── username
│   ├── password_hash
│   ├── email
│   ├── role (admin|sandbox)
│   └── created_at
├── sessions
│   ├── session_id (PK)
│   ├── user_id (FK)
│   ├── token
│   ├── expires_at
│   └── last_activity
├── sandbox_databases
│   ├── db_id (PK)
│   ├── user_id (FK)
│   ├── database_name
│   ├── sql_login
│   ├── sql_password (encrypted)
│   ├── created_at
│   └── expires_at
└── auth_events
    ├── event_id (PK)
    ├── user_id (FK)
    ├── event_type
    ├── ip_address
    └── created_at

SQL Server
├── master (admin access)
└── SandboxDB_* (isolated per user)
    ├── Dedicated login per sandbox
    ├── 100MB size limit
    └── Limited permissions (db_datareader, db_datawriter, db_ddladmin)
```

---

## 🐛 Common Errors & Solutions

### Error: "Invalid setup key"
**Solution:** Check `ADMIN_SETUP_KEY` in `backend/.env` matches the value you're sending

### Error: "Admin user already exists"
**Solution:** Admin can only be created once. Use regular login instead.

### Error: "Username already exists"
**Solution:** Choose a different username for sandbox registration

### Error: "Failed to create sandbox environment"
**Possible Causes:**
1. SQL Server permissions insufficient
2. ODBC driver not installed
3. Database name collision

**Check Logs:**
```bash
tail -f backend/logs/audit.log
```

### Error: "Token expired"
**Solution:** Login again or extend session before expiry

### Error: "Session not found"
**Solution:** Session may have been cleaned up. Login again.

### Error: "Network error. Please check your connection."
**Fixed:** This was caused by the axios interceptor bug. After applying fixes, this should resolve automatically.

---

## 📈 Performance Optimization

### Query Execution
- Maximum execution time: 30 seconds (configurable)
- Maximum result rows: 10,000 (configurable)
- Concurrent queries per session: 3 (configurable)

### Database Indexing
Recommended indexes for auth database:
```sql
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sandbox_user_id ON sandbox_databases(user_id);
CREATE INDEX idx_auth_events_user_id ON auth_events(user_id);
```

### Caching
- Schema information cached for 5 minutes
- Session validation cached for 1 minute

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest tests/ -v
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Integration Tests
```bash
# Start both servers
# Run integration tests
npm run test:integration
```

---

## 📝 Development Workflow

### Adding New Features
1. Update backend routes in `backend/app/routes/`
2. Update frontend services in `frontend/src/services/`
3. Add UI components in `frontend/src/components/`
4. Update this documentation

### Code Style
- **Backend**: PEP 8 (Python)
- **Frontend**: ESLint + Prettier (JavaScript)

### Git Workflow
```bash
git checkout -b feature/your-feature
# Make changes
git commit -m "feat: add your feature"
git push origin feature/your-feature
# Create pull request
```

---

## 🆘 Support

### Logs Location
- Backend logs: `backend/logs/audit.log`
- Auth database: `backend/auth.db`
- Analytics: `backend/analytics.db`

### Health Check
```bash
curl http://localhost:8000/health
```

### Debug Mode
Enable in `backend/.env`:
```env
LOG_LEVEL=DEBUG
RELOAD=true
```

---

## ✅ What Was Fixed

### Critical Fixes Applied:

1. **Added Missing Environment Variables**
   - Added `JWT_SECRET` to `.env`
   - Added `ADMIN_SETUP_KEY` to `.env`
   - Backend now starts with proper authentication configuration

2. **Fixed Frontend Error Handling**
   - Fixed axios interceptor in `authApi.js`
   - Now returns complete error object instead of just `error.response.data`
   - `AuthContext.jsx` can now properly extract error messages

3. **Improved Error Messages**
   - Network errors now show meaningful messages
   - Backend validation errors properly displayed
   - 401 errors trigger automatic logout

4. **Documentation Consolidation**
   - Reduced 19 markdown files to 1 comprehensive guide
   - All setup, troubleshooting, and API docs in one place

### Verification Steps:

1. **Check Backend Starts Correctly:**
```bash
cd backend
python run.py
# Look for:
# ✓ JWT_SECRET configured
# ✓ ADMIN_SETUP_KEY configured
# ✓ SQL Server connection successful
```

2. **Test Admin Creation:**
```bash
curl -X POST http://localhost:8000/api/auth/setup-admin \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "SecurePass123!",
    "confirm_password": "SecurePass123!",
    "setup_key": "SETUP_2024_SQL_PLAYGROUND_ADMIN"
  }'
```

3. **Test Sandbox Registration:**
- Navigate to http://localhost:5173
- Click "Need a sandbox account? Register"
- Fill in username, email, password
- Should create account and login automatically

4. **Test Login:**
- Use admin credentials
- Should redirect to main app without errors

---

## 🎓 Understanding the Fixes

### Why Network Errors Occurred:

The "network error" wasn't actually a network issue. Here's what was happening:

1. **Backend** threw an error (e.g., "Invalid setup key")
2. **FastAPI** returned this as HTTP 400 with `{"detail": "Invalid setup key"}`
3. **Axios interceptor** transformed this to just the detail: `"Invalid setup key"`
4. **AuthContext** expected `error.response.data.detail` but got just the string
5. **Result**: Undefined error message, shown as "Network error"

**The Fix:**
- Axios interceptor now returns the complete `error` object
- AuthContext's `extractErrorMessage()` can now access `error.response.data.detail`
- Proper error messages display to users

### Why JWT_SECRET Was Critical:

Without `JWT_SECRET`, the backend generates a random secret on each restart:
- Tokens created before restart become invalid after restart
- Login appears to work but token validation fails
- Results in "Invalid token" errors and automatic logout

**The Fix:**
- Fixed `JWT_SECRET` in `.env`
- Tokens remain valid across backend restarts
- Consistent authentication behavior

---

## 📖 License

MIT License - See LICENSE file for details

## 👥 Contributors

- Full-stack application with React + FastAPI
- SQL Server integration with sandbox provisioning
- JWT-based authentication system

---

**Last Updated:** October 2025
**Version:** 2.0.0
**Status:** Production Ready (after applying fixes)
