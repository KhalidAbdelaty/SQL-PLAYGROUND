# 🚀 Ever Wished You Could Practice SQL Without Breaking Production?

Yeah, me too. That's exactly why I built this.

Welcome to **SQL Playground** – a full-stack web application where you can write, execute, and experiment with SQL queries in a safe, isolated environment. No more "Oops, I just dropped the production table" moments. 😅

![SQL Playground](https://img.shields.io/badge/Status-Live-brightgreen) ![React](https://img.shields.io/badge/React-18-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-0.104-green) ![SQL Server](https://img.shields.io/badge/SQL%20Server-2019+-red)

---

## 💡 What Makes This Special?

This isn't just another SQL editor. Here's what sets it apart:

### 🎯 **Sandbox Environments**
Every user gets their own isolated SQL Server database. You can experiment, break things, and learn without consequences. It's like having your own personal SQL playground.

### 🔐 **Smart Security**
- Automatic detection of dangerous queries (DROP, TRUNCATE, etc.)
- Confirmation dialogs before destructive operations
- Rate limiting to prevent abuse
- JWT-based authentication with session management
- Database size limits (100MB per sandbox)

### ⚡ **Real-Time Experience**
- Monaco Editor with SQL syntax highlighting and IntelliSense
- Live query execution with performance metrics
- Interactive schema browser
- Query history with one-click re-execution
- Export results to CSV or JSON

### 🎨 **Beautiful UI**
Built with React and TailwindCSS, it's not just functional – it's actually pleasant to use. Dark mode included because, let's be honest, who codes with light mode? 🌙

---

## 🛠️ Tech Stack

I chose each technology deliberately to create a robust, scalable solution:

**Frontend:**
- **React 18** – Modern, component-based UI
- **Vite** – Lightning-fast development experience
- **Monaco Editor** – The same editor that powers VS Code
- **AG Grid** – Professional-grade data tables
- **TailwindCSS** – Utility-first styling
- **Axios** – HTTP client with interceptors

**Backend:**
- **FastAPI** – High-performance async Python framework
- **SQL Server** – Enterprise-grade database engine
- **SQLite** – Authentication and analytics storage
- **pyodbc** – Native SQL Server connectivity
- **JWT** – Secure token-based authentication
- **bcrypt** – Industry-standard password hashing

---

## 🎬 Quick Start

Get up and running in under 3 minutes:

### Prerequisites
- Python 3.8+
- Node.js 16+
- SQL Server 2019+ (with Windows or SQL authentication)
- ODBC Driver 17 for SQL Server

### Installation

**1. Clone the repository:**
```bash
git clone https://github.com/KhalidAbdelaty/SQL-PlAYGROUND.git
cd SQL-PlAYGROUND
```

**2. Backend Setup:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # On Windows
pip install -r requirements.txt
```

Create `backend/.env`:
```env
DB_SERVER=YOUR_SERVER_NAME
DB_DATABASE=master
DB_TRUSTED_CONNECTION=yes
DB_DRIVER=ODBC Driver 17 for SQL Server

JWT_SECRET=your-secret-key-here
ADMIN_SETUP_KEY=your-setup-key-here

HOST=0.0.0.0
PORT=8000
CORS_ORIGINS=http://localhost:5173
```

**3. Frontend Setup:**
```bash
cd ../frontend
npm install
```

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

**4. Launch:**
```bash
# Terminal 1 - Backend
cd backend
python run.py

# Terminal 2 - Frontend
cd frontend
npm run dev
```

**5. Access:**
- Frontend: http://localhost:5173
- API Docs: http://localhost:8000/docs

---

## 🎮 Features Walkthrough

### For Administrators
- Full database access with your SQL Server credentials
- Execute any query (with safety confirmations)
- Access to all databases on the server
- Query performance analytics

### For Sandbox Users
- Personal isolated database (automatically provisioned)
- Safe environment to learn and experiment
- All CRUD operations supported
- Limited to your own database (security by design)

### Query Editor
- **Syntax Highlighting** – SQL keywords, functions, and more
- **IntelliSense** – Auto-completion as you type
- **Execute with Ctrl+Enter** – Fast keyboard shortcuts
- **Query History** – Never lose a query again
- **Performance Metrics** – See execution time and row counts

### Schema Browser
- Expand/collapse database objects
- View table structures with column details
- One-click table preview
- Quick SELECT generation

### Results Grid
- Sortable columns
- Filterable data
- Pagination for large datasets
- Export to CSV or JSON
- Copy to clipboard

---

## 🔒 Security Features

I take security seriously. Here's what's built-in:

✅ **SQL Injection Protection** – Parameterized queries everywhere  
✅ **Rate Limiting** – 60 requests per minute per IP  
✅ **Dangerous Query Detection** – Warns before DROP, TRUNCATE, DELETE  
✅ **Sandbox Isolation** – Users can't access each other's data  
✅ **Session Management** – Automatic logout after 8 hours  
✅ **Audit Logging** – All authentication events tracked  
✅ **Password Hashing** – bcrypt with salt  
✅ **Database Size Limits** – Prevent resource abuse  

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Monaco Editor│  │  AG Grid     │  │ Auth Context │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                         HTTPS/WSS
                            │
┌─────────────────────────────────────────────────────────────┐
│                      Backend (FastAPI)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auth Service │  │Query Executor│  │ Provisioner  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                    ┌───────┴───────┐
                    │               │
            ┌───────▼──────┐ ┌─────▼──────┐
            │  SQL Server  │ │  SQLite    │
            │  (Queries)   │ │  (Auth)    │
            └──────────────┘ └────────────┘
```

---

## 📊 API Endpoints

### Authentication
- `POST /api/auth/setup-admin` – Create first admin user
- `POST /api/auth/login` – Login (admin or sandbox)
- `POST /api/auth/register-sandbox` – Create sandbox account
- `POST /api/auth/logout` – Logout and cleanup
- `POST /api/auth/extend-session` – Extend session duration

### Query Execution
- `POST /api/query/execute` – Execute SQL query
- `GET /api/query/history` – Get query history
- `DELETE /api/query/history` – Clear history

### Schema Management
- `GET /api/schema/databases` – List databases
- `GET /api/schema/tables` – List tables
- `GET /api/schema/columns` – Get table structure
- `GET /api/schema/preview` – Preview table data

### Health & Analytics
- `GET /health` – System health check
- `GET /api/analytics/stats` – Usage statistics

**Full API Documentation:** http://localhost:8000/docs

---

## 🎯 Use Cases

### 👨‍🎓 Learning SQL
Perfect for students and beginners who want to practice SQL without setting up their own database server.

### 🧪 Testing Queries
Test complex queries in a safe environment before running them in production.

### 👨‍🏫 Teaching
Instructors can give students isolated environments for assignments and exercises.

### 🔬 Experimentation
Try out new SQL features, test performance, or prototype database designs.

---

## 🚧 Roadmap

Here's what's coming next:

- [ ] Query execution plans visualization
- [ ] Collaborative query sharing
- [ ] Saved query templates
- [ ] Database diagram generator
- [ ] Multi-database support (PostgreSQL, MySQL)
- [ ] Query performance comparison
- [ ] Dark/Light theme toggle
- [ ] Mobile responsive design improvements

---

## 🤝 Contributing

Found a bug? Have a feature idea? Contributions are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License – feel free to use it, modify it, and build upon it.

---

## 👨‍💻 About Me

I'm **Khalid Abdelaty**, a Data Engineer passionate about building tools that make data work easier and more accessible. This project combines my love for SQL, full-stack development, and creating practical solutions to real problems.

**Connect with me:**
- 💼 [LinkedIn](https://www.linkedin.com/in/khalidabdelaty/)
- 🐙 [GitHub](https://github.com/KhalidAbdelaty)

---

## 🙏 Acknowledgments

Built with:
- ☕ Coffee (lots of it)
- 🎵 Music (even more of it)
- 💡 The desire to make SQL accessible to everyone

---

## ⚡ Final Thoughts

SQL is powerful, but it can be intimidating. My goal with this project is to remove that intimidation and make SQL fun, safe, and accessible.

Whether you're a beginner learning your first SELECT statement or an experienced developer testing complex queries, I hope this tool makes your life a little easier.

**Happy Querying!** 🎉

---

<div align="center">
  <sub>Built with ❤️ by Khalid Abdelaty</sub>
</div>

