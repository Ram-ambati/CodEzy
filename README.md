# CodEzy - Interactive C Programming Learning Platform

A full-stack web application for learning C programming with AI-powered tutoring. Built to demonstrate dynamic, schema-driven architecture principles with real-time data rendering.

## 🎯 Key Features

- **Dynamic Content Rendering** - Topics load via JSON without page reloads using AJAX
- **AI Tutor Integration** - Groq API powered coding assistant for instant help
- **User Authentication** - Secure login with SHA-256 password hashing
- **Progress Tracking** - Track user progress, XP, and completed topics
- **Schema-Driven Architecture** - Add new topics by simply creating JSON files; no code changes needed
- **Responsive UI** - Clean, modern interface for seamless learning experience
- **RESTful API** - Fully documented endpoints for content and user management

## � Application Screenshots

<div align="center">
  <img src="static/landing%20page.png" width="700" alt="Landing Page">
  <p><em>Landing Page - Topic selection and user dashboard</em></p>
</div>

<div align="center">
  <img src="static/learning%20page.png" width="700" alt="Learning Page">
  <p><em>Learning Page - Interactive learning with AI tutoring</em></p>
</div>

## �🛠 Tech Stack

**Backend:**
- Flask (Python) - REST API & server-side routing
- JSON - Data persistence (topics, users, progress)
- Groq API - AI-powered tutoring

**Frontend:**
- HTML5, CSS3, JavaScript (vanilla)
- Fetch API - Asynchronous client-server communication
- DOM Manipulation - Dynamic UI updates

## 📚 What You'll Learn From This Project

This project demonstrates critical full-stack concepts:

1. **Dynamic Web Applications** - How modern SPAs work with JSON data and JS rendering
2. **Schema-Driven Scaling** - Separate data from presentation for infinite scalability
3. **RESTful API Design** - Building clean, maintainable backend endpoints
4. **User Management** - Authentication, password security, and data persistence
5. **Security Basics** - Password hashing and CORS handling
6. **AJAX Pattern** - Real-time data fetching without page reloads

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- pip (Python package manager)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd CodEzy
```

2. Create and activate virtual environment
```bash
# Windows
python -m venv venv
.\venv\Scripts\Activate.ps1

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

3. Install dependencies
```bash
pip install -r requirements.txt
```

4. Set up Groq API key (optional, for AI features)
```bash
# Edit app.py(37) and add your Groq API key
GROQ_API_KEY = 'your-key-here'
```

5. Run the application
```bash
python app.py
```

6. Open browser and navigate to
```
http://localhost:5000
```

## 📁 Project Structure

```
CodEzy/
├── app.py                    # Flask backend & API routes
├── index.html               # Homepage
├── requirements.txt         # Python dependencies
├── users.json              # User data storage
│
├── static/
│   ├── auth.html          # Authentication page
│   └── learn.html         # Learning dashboard
│
├── css/
│   ├── auth.css           # Auth page styles
│   ├── learn.css          # Learning page styles
│   └── styles.css         # Global styles
│
├── js/
│   ├── auth.js            # Login/register logic
│   └── learn.js           # Content rendering & interactivity
│
└── topics/
    ├── 01_basics.json     # Topic content (schema-driven)
    ├── 02_variables.json
    ├── 03_operators.json
    └── ... (more topics)
```

## 🔌 API Endpoints

### Topics
- `GET /api/topics` - Get all available topics
- `GET /api/topic/<topic_name>` - Get specific topic content

### AI Tutoring
- `POST /api/ai/ask` - Ask AI a coding question
  ```json
  {
    "question": "How do pointers work?",
    "context": "topic_name"
  }
  ```

### User Management
- `POST /api/user/progress` - Save user progress
- `POST /api/user/register` - Register new user
- `POST /api/user/login` - Authenticate user

## 💡 Architecture Highlights

### Schema-Driven Design
Each topic is a JSON file with consistent structure. The frontend doesn't care about content—it reads and renders any valid JSON:

```json
{
  "id": "01_basics",
  "title": "C Basics",
  "description": "Learn C fundamentals",
  "difficulty": "beginner",
  "estimatedTime": "~15 min",
  "content": "..."
}
```

**Benefit:** Add 100 new courses without touching HTML or JavaScript. Content is decoupled from presentation.

### Asynchronous Data Loading
All data loads via JSON API calls without full page reloads:

```javascript
// Frontend fetches data dynamically
fetch('/api/topics')
  .then(res => res.json())
  .then(data => renderTopics(data.topics)) // Dynamic rendering
```

## 🔒 Security Features

- **Password Hashing** - SHA-256 hashing for user passwords
- **CORS Handling** - Preflight request management
- **Input Validation** - Server-side validation on all endpoints

## 📈 Future Enhancements

- [ ] Database integration (PostgreSQL/MongoDB) for scalability
- [ ] Advanced password hashing (bcrypt, argon2)
- [ ] User dashboard with progress visualization
- [ ] Code execution sandbox for practice problems
- [ ] Leaderboard & gamification
- [ ] Dark mode support
- [ ] Mobile optimization

## 📝 License

MIT License - Feel free to use and modify for learning purposes.

## 👨‍💻 About

Built as a full-stack learning project to master:
- RESTful API design
- Frontend-backend communication
- Database-less data persistence
- Schema-driven architecture
- Modern web development patterns

---

**Happy coding! 🚀**