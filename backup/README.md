# Codezy - Programming Learning Platform

A simple, fun proof-of-concept frontend for exploring interactive programming education.

## 🎯 What is it?

Codezy is a **frontend-only learning platform** with:
- 📖 Clean landing page showcasing features
- 💻 Interactive learning interface
- 🧠 Concept explanations (Pointers & Memory, Recursion)
- 📊 Progress tracking with XP and achievements
- 🎨 Modern, responsive design

**Important:** The code editor and visualizers are UI placeholders - they don't execute custom code (no backend/compiler).

## 📁 Project Structure

```
CodEzy/
├── index.html           # Homepage
├── static/
│   └── learn.html      # Learning page
├── css/
│   ├── styles.css      # Homepage styles
│   └── learn.css       # Learning page styles
├── js/
│   └── learn.js        # Learning logic & data
└── README.md           # This file
```

## 🚀 How to Open

**Option 1 - Direct (easiest):**
- Open `index.html` in your browser

**Option 2 - Local server (recommended):**
```bash
# Python 3
python -m http.server 8000
# Visit: http://localhost:8000

# Or use VS Code Live Server extension
```

## 📚 Topics Covered

### Pointers & Memory
- What are pointers?
- Memory layout (stack vs heap)
- Address-of (&) and dereference (*) operators

### Recursion
- What is recursion?
- Call stack and stack frames
- Base case and termination conditions

## 🎮 Features

- **Homepage** - Landing page with feature showcase
- **Learning Platform** - Topic switching with sidebar
- **Concept Cards** - Well-formatted theory with examples
- **Progress Tracking** - XP, achievements, stats (localStorage)
- **Responsive Design** - Works on desktop and mobile
- **Chat Panel** - UI only, non-functional

## 🔧 How to Customize

### Edit Concept Explanations
In `js/learn.js`, edit the `topics` object:
```javascript
concepts: [
    {
        title: "Concept Title",
        description: "<strong>Bold</strong> <code>code</code> <ul><li>item</li></ul>"
    },
    // ... more concepts
]
```

Supports HTML: `<strong>`, `<code>`, `<ul>`, `<ol>`, `<li>`, `<br>`

### Add New Topics
In `js/learn.js`, add to `topics` object:
```javascript
newtopic: {
    title: "Topic Name",
    description: "Description here",
    code: "// Default code",
    concepts: [
        { title: "C1", description: "..." },
        { title: "C2", description: "..." },
        { title: "C3", description: "..." }
    ]
}
```

## ⚠️ Limitations

- ❌ Code editor cannot execute C code (no backend)
- ❌ Memory visualizer shows examples only (not live)
- ❌ Chat panel is UI only (no AI)
- ❌ Examples button is non-functional
- ❌ Leaderboard/Discussion are placeholders

## 🚀 To Make This Real, You'd Need

- **Backend API** - Compile and run C code (gcc, clang)
- **LLM Integration** - For AI chat and feedback
- **Database** - Store user progress and stats
- **Code Execution** - Docker or sandbox environment

## 📝 License

MIT License - Feel free to use and modify!

---

**Enjoy exploring! 🎉**