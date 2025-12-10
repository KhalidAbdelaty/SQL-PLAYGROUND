# Complete Fix Guide - SQL Playground Issues

## 🚨 Problems You're Experiencing

### 1. Sandbox Registration Error ❌
**Error:** "Incorrect syntax near 'ALTER'" when trying to register sandbox account
**Root Cause:** Old provisioner.py file still being used by backend

### 2. Tiny Editor/Results Sections ❌
**Problem:** Code editor and output area are extremely small, almost invisible
**Root Cause:** Default minSize constraints too restrictive

### 3. Extend Session Not Working ❌
**Problem:** "Extend" button may not be functioning properly
**Root Cause:** Likely related to auth token issues from not applying middleware fix

### Manual Fix (5 minutes)

If the script doesn't work, apply fixes manually:

#### Fix 1: Backend - middleware.py

**File:** `backend/app/auth/middleware.py`

Find this code (around line 29):
```python
    async def dispatch(self, request: Request, call_next):
        """
        Process request and validate authentication
        """
        # Check if route is public
        if self._is_public_route(request.url.path):
            return await call_next(request)
```

**Replace with:**
```python
    async def dispatch(self, request: Request, call_next):
        """
        Process request and validate authentication
        """
        # Allow CORS preflight requests (OPTIONS) to pass through
        if request.method == "OPTIONS":
            return await call_next(request)
        
        # Check if route is public
        if self._is_public_route(request.url.path):
            return await call_next(request)
```

#### Fix 2: Backend - provisioner.py

**File:** `backend/app/services/provisioner.py`

**OPTION 1: Replace the entire file**
- Use the `provisioner.py` from outputs folder

**OPTION 2: Manual edits (advanced)**

Find line ~105 and change:
```python
# BEFORE
cursor.execute(f"USE [{safe_db_name}]; CREATE USER [{safe_login}] FOR LOGIN [{safe_login}]")
cursor.execute(f"USE [{safe_db_name}]; ALTER ROLE db_datareader ADD MEMBER [{safe_login}]")
# ... more similar lines
```

**To:**
```python
# AFTER
cursor.execute(f"USE [{safe_db_name}]")  # Execute USE separately
cursor.execute(f"CREATE USER [{safe_login}] FOR LOGIN [{safe_login}]")
cursor.execute(f"ALTER ROLE db_datareader ADD MEMBER [{safe_login}]")
# ... continue removing "USE [{safe_db_name}]; " prefix from all lines
```

Also find line ~92:
```python
# BEFORE
size_limit = "100MB" if file_type == "ROWS" else "50MB"
cursor2.execute(f"""
    ALTER DATABASE [{safe_db_name}]
    MODIFY FILE (NAME = N'{file_name}', MAXSIZE = {size_limit});
""")
```

**To:**
```python
# AFTER
if file_type == "ROWS":
    size_limit = "100MB"
    growth = "10MB"
else:
    size_limit = "50MB"
    growth = "5MB"

cursor2.execute(f"""
    ALTER DATABASE [{safe_db_name}]
    MODIFY FILE (NAME = N'{file_name}', MAXSIZE = {size_limit}, FILEGROWTH = {growth});
""")
```

#### Fix 3: Frontend - App.jsx

**File:** `frontend/src/App.jsx`

**OPTION 1: Replace the entire file**
- Use the `App.jsx` from outputs folder

**OPTION 2: Find and replace (around line 172-205)**

Change these lines:
```javascript
// BEFORE
minSize={[200, 400]}
gutterSize={8}

// TO
minSize={[250, 600]}
gutterSize={10}
```

And change (around line 205):
```javascript
// BEFORE  
minSize={[100, 100]}
sizes={[50, 50]}

// TO
minSize={[200, 200]}
sizes={[45, 55]}
```

---

## 🔧 After Applying Fixes

### Step 1: Restart Backend
```bash
# In backend terminal, press Ctrl+C to stop
cd backend
python run.py
```

**Look for these success messages:**
```
INFO:app.startup:✓ SQL Server connection validated successfully
INFO:app.main:✓ Authentication database initialized
INFO:app.main:Backend API ready at: http://localhost:8000
```

### Step 2: Frontend Auto-Reloads
Vite will automatically reload. You should see:
```
[vite] page reload src/App.jsx
```

If not, refresh browser: `Ctrl+Shift+R`

### Step 3: Test Sandbox Registration

1. Go to http://localhost:5173
2. Click "Need a sandbox account? Register"
3. Enter:
   - Username: testuser
   - Email: test@example.com
   - Password: password123
4. Click "Create Sandbox Account"

**Expected backend logs:**
```
INFO:app.services.provisioner:Creating SQL login: sandbox_testuser_...
INFO:app.services.provisioner:Creating database: SandboxDB_testuser_...
INFO:app.services.provisioner:Setting size limit for file...
INFO:app.services.provisioner:Successfully created sandbox environment
```

**✅ Success indicators:**
- No "Incorrect syntax" errors
- Auto-login after registration
- Large, visible editor area
- Large, visible results section
- Schema tree loads properly
- Extend button works

---

## 🐛 Still Not Working?

### Issue: Backend still shows SQL syntax error

**Cause:** Old files still running

**Solution:**
```bash
# 1. Completely stop backend (Ctrl+C multiple times)
# 2. Verify files were updated:
findstr /C:"OPTIONS" backend\app\auth\middleware.py
# Should show: if request.method == "OPTIONS":

findstr /C:"USE \[{safe_db_name}\]" backend\app\services\provisioner.py  
# Should show: cursor.execute(f"USE [{safe_db_name}]")

# 3. Start fresh
cd backend
python run.py
```

### Issue: UI still looks small

**Cause:** Browser cache or Vite didn't reload

**Solution:**
```bash
# 1. Hard refresh browser
Ctrl+Shift+R (Chrome/Edge)
Ctrl+F5 (Firefox)

# 2. Or restart Vite
# In frontend terminal:
Ctrl+C
npm run dev
```

### Issue: Extend session not working

**Symptoms:** Clicking "Extend" does nothing

**Solution:**
1. Check browser console (F12 → Console)
2. Look for errors
3. Verify middleware fix was applied
4. Try logging out and logging back in

---

## 📊 Verification Checklist

After applying ALL fixes, verify:

**Backend:**
- [ ] `middleware.py` contains `if request.method == "OPTIONS":`
- [ ] `provisioner.py` has separate `cursor.execute(f"USE [{safe_db_name}]")` 
- [ ] `provisioner.py` has `FILEGROWTH = {growth}` in ALTER DATABASE
- [ ] Backend restarted successfully

**Frontend:**
- [ ] `App.jsx` has `minSize={[250, 600]}`
- [ ] `App.jsx` has `minSize={[200, 200]}`
- [ ] `App.jsx` has `gutterSize={10}`
- [ ] Vite reloaded or browser refreshed

**Functionality:**
- [ ] Sandbox registration succeeds (no SQL error)
- [ ] Editor is large and clearly visible
- [ ] Results section is large and clearly visible
- [ ] Schema tree loads
- [ ] Queries execute successfully
- [ ] Extend button opens dialog
- [ ] Logout works

---

## 🔄 Rollback Instructions

If something goes wrong:

### From Automated Script:
```powershell
# Find your backup folder (will be backup_YYYYMMDD_HHMMSS)
dir backup_*

# Restore files
Copy-Item backup_YYYYMMDD_HHMMSS\middleware.py.bak backend\app\auth\middleware.py -Force
Copy-Item backup_YYYYMMDD_HHMMSS\provisioner.py.bak backend\app\services\provisioner.py -Force
Copy-Item backup_YYYYMMDD_HHMMSS\App.jsx.bak frontend\src\App.jsx -Force
```

### From Manual Changes:
Just replace the files with the originals from the zip you uploaded earlier.

---

## 🎯 Root Cause Analysis

### Why Sandbox Registration Failed

**Technical Explanation:**

When you create a sandbox, the provisioner needs to:
1. CREATE LOGIN on SQL Server
2. CREATE DATABASE  
3. Switch context: USE database
4. CREATE USER in that database
5. GRANT permissions

The original code tried to do steps 3+4 in one command:
```python
cursor.execute(f"USE mydb; CREATE USER ...")  # ❌ FAILS
```

This syntax works in SSMS but NOT in pyodbc when `autocommit=True`.

pyodbc requires:
```python
cursor.execute(f"USE mydb")       # ✅ First, switch context
cursor.execute(f"CREATE USER ...") # ✅ Then, create user
```

### Why UI Was Tiny

React-Split's default `minSize={[100, 100]}` meant panels could shrink to 100px.
On a 1920x1080 screen with multiple splits, this resulted in:
- Editor: ~100px tall (3-4 lines of code visible)
- Results: ~100px tall (barely see results)

The fix increases minimums to 200-250px, ensuring visibility.

### Why Extend Might Not Work

The middleware was blocking all OPTIONS requests with 401.
When frontend tries to extend session, the preflight check fails.
Browser never sends the actual extend request.
