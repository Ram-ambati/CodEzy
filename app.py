from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os
from datetime import datetime
import hashlib
from groq import Groq

app = Flask(__name__, template_folder='.', static_folder='.')

# ========== CONFIG ==========
# Enable CORS for all routes
CORS(app, origins="*", supports_credentials=False)

# Handle preflight requests
@app.before_request
def handle_preflight():
    if request.method == 'OPTIONS':
        response = jsonify({'success': True})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Max-Age'] = '3600'
        return response, 200

# Add CORS headers to all responses
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Expose-Headers'] = 'Content-Type'
    return response

TOPICS_DIR = 'topics'
USERS_FILE = 'users.json'
GROQ_API_KEY = 'your-key-here'

# ========== USER MANAGEMENT ==========
def load_users():
    """Load all users from file"""
    if os.path.exists(USERS_FILE):
        try:
            with open(USERS_FILE, 'r') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_users(users):
    """Save users to file"""
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f, indent=2)

def hash_password(password):
    """Hash a password"""
    return hashlib.sha256(password.encode()).hexdigest()

# ========== TOPIC MANAGEMENT ==========
def load_topic(topic_id):
    """Load a topic from JSON file by ID or filename"""
    # First, try to load directly by topic_id
    filepath = os.path.join(TOPICS_DIR, f'{topic_id}.json')
    
    # If not found, search for a file where the JSON id field matches
    if not os.path.exists(filepath):
        if os.path.exists(TOPICS_DIR):
            for file in os.listdir(TOPICS_DIR):
                if file.endswith('.json'):
                    try:
                        with open(os.path.join(TOPICS_DIR, file), 'r', encoding='utf-8') as f:
                            content = json.load(f)
                            if content.get('id') == topic_id:
                                filepath = os.path.join(TOPICS_DIR, file)
                                break
                    except:
                        continue
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return None

def get_all_topics():
    """Get list of all available topics"""
    topics = []
    if os.path.exists(TOPICS_DIR):
        for file in os.listdir(TOPICS_DIR):
            if file.endswith('.json'):
                topic_name = file.replace('.json', '')
                topics.append(topic_name)
    return sorted(topics)

def query_ai(question, context=''):
    """Query AI for coding help using Groq API with Python SDK"""
    try:
        client = Groq(api_key=GROQ_API_KEY)
        
        system_message = "You are an expert C programming tutor. Answer coding questions concisely and clearly with code examples when helpful. Keep responses under 200 words."
        
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",  # Fast and reliable model
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": f"Context: {context}\n\nQuestion: {question}"}
            ],
            max_tokens=500,
            temperature=0.7
        )
        
        ai_response = completion.choices[0].message.content
        return ai_response
        
    except Exception as e:
        return get_fallback_response(question, context)

def get_fallback_response(question, context=''):
    """Fallback response when Groq API is unavailable"""
    question_lower = question.lower()
    
    # Simple keyword matching
    responses = {
        'pointer': 'Pointers store memory addresses. Use & to get address, * to dereference.',
        'recursion': 'Recursion is when a function calls itself. Always need a base case to stop.',
        'loop': 'Loops repeat code. Use for, while, or do-while loops in C.',
        'array': 'Arrays store multiple values. Access with index [0], [1], etc.',
        'function': 'Functions are reusable blocks of code. Define with return type and parameters.',
        'variable': 'Variables store data. Declare with type: int x = 5;',
        'string': 'Strings are arrays of characters. Declare as char str[] or use string.h',
    }
    
    for keyword, response in responses.items():
        if keyword in question_lower:
            return response
    
    # Default response
    return "Great question! In C, you can solve this by thinking about the basic fundamentals: variables, loops, functions, and memory management. What specific concept would you like to explore?"

# ========== ROUTES ========== 

@app.route('/')
def index():
    """Landing page"""
    return render_template('index.html')

@app.route('/learn')
def learn():
    """Learn page"""
    return render_template('static/learn.html')

@app.route('/auth')
@app.route('/static/auth.html')
def auth():
    """Auth page"""
    return render_template('static/auth.html')

# ========== STATIC FILE ROUTES ==========

@app.route('/css/<path:filename>')
def serve_css(filename):
    """Serve CSS files from css folder"""
    return send_from_directory('css', filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    """Serve JS files from js folder"""
    return send_from_directory('js', filename)

# ========== API ROUTES ==========

@app.route('/api/topics', methods=['GET'])
def api_topics():
    """Get all available topics"""
    topics = get_all_topics()
    topic_data = []
    
    for topic_name in topics:
        topic = load_topic(topic_name)
        if topic:
            topic_data.append({
                'id': topic.get('id', topic_name),  # Use id from JSON, fallback to filename
                'title': topic.get('title', topic_name),
                'description': topic.get('description', ''),
                'icon': topic.get('icon', '📚'),
                'difficulty': topic.get('difficulty', 'beginner'),
                'estimatedTime': topic.get('estimatedTime', '~15 min'),
                'order': topic.get('order', 999)
            })
    
    # Sort by order field
    topic_data.sort(key=lambda x: x['order'])
    
    return jsonify({
        'success': True,
        'topics': topic_data
    })


@app.route('/api/topic/<topic_name>', methods=['GET'])
def api_topic(topic_name):
    """Get specific topic"""
    topic = load_topic(topic_name)
    
    if not topic:
        return jsonify({
            'success': False,
            'error': 'Topic not found'
        }), 404
    
    return jsonify({
        'success': True,
        'topic': topic
    })

@app.route('/api/ai/ask', methods=['POST'])
def api_ai_ask():
    """Ask AI a coding question"""
    data = request.get_json()
    
    if not data or 'question' not in data:
        return jsonify({
            'success': False,
            'error': 'Question required'
        }), 400
    
    question = data.get('question', '')
    context = data.get('context', '')  # Can include current topic
    
    if not question.strip():
        return jsonify({
            'success': False,
            'error': 'Question cannot be empty'
        }), 400
    
    response = query_ai(question, context)
    
    return jsonify({
        'success': True,
        'question': question,
        'response': response,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/user/progress', methods=['POST'])
def api_user_progress():
    """Save user progress (XP, achievements, completed topics)"""
    data = request.get_json()
    
    # In production, save to database
    # For now, just acknowledge
    return jsonify({
        'success': True,
        'message': 'Progress saved',
        'data': data
    })

@app.route('/api/user/progress', methods=['GET'])
def get_user_progress():
    """Get user progress"""
    # In production, fetch from database
    # For now, return default
    return jsonify({
        'success': True,
        'xp': 0,
        'achievements': [],
        'completedTopics': [],
        'username': 'Guest'
    })

# ========== AUTH ROUTES ==========

@app.route('/auth/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.get_json()
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    
    if not username or not email or not password:
        return jsonify({'success': False, 'error': 'Missing fields'}), 400
    
    users = load_users()
    
    if username in users:
        return jsonify({'success': False, 'error': 'Username already exists'}), 400
    
    # Create new user
    users[username] = {
        'email': email,
        'password': hash_password(password),
        'xp': 0,
        'createdAt': datetime.now().isoformat(),
        'completedTopics': [],
        'achievements': [],
        'viewedTopics': []
    }
    
    save_users(users)
    
    return jsonify({
        'success': True,
        'message': 'User registered successfully',
        'user': {
            'username': username,
            'email': email,
            'xp': 0,
            'completedTopics': [],
            'achievements': [],
            'joinedAt': users[username]['createdAt']
        }
    }), 201

@app.route('/auth/login', methods=['POST'])
def login():
    """Login user"""
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    if not username or not password:
        return jsonify({'success': False, 'error': 'Missing fields'}), 400
    
    users = load_users()
    # Allow login by either username or email. If the client supplied an email, find the username.
    lookup_username = username
    if '@' in username:
        # find user with this email
        found = None
        for uname, udata in users.items():
            if udata.get('email', '').lower() == username.lower():
                found = uname
                break
        if found:
            lookup_username = found

    if lookup_username not in users:
        return jsonify({'success': False, 'error': 'Invalid credentials'}), 401

    user_data = users[lookup_username]

    # Special-case compatibility for demo password 'password' (helps demo/login confusion)
    if user_data.get('password') != hash_password(password):
        # allow the literal demo password for the built-in demo account
        if lookup_username == 'demo' and password == 'password':
            pass
        else:
            return jsonify({'success': False, 'error': 'Invalid credentials'}), 401
    
    return jsonify({
        'success': True,
        'message': 'Login successful',
        'user': {
            'username': lookup_username,
            'email': user_data['email'],
            'xp': user_data.get('xp', 0),
            'completedTopics': user_data.get('completedTopics', []),
            'achievements': user_data.get('achievements', []),
            'viewedTopics': user_data.get('viewedTopics', []),
            'joinedAt': user_data.get('createdAt', datetime.now().isoformat())
        }
    }), 200

@app.route('/auth/update-progress', methods=['POST'])
def update_progress():
    """Update user progress"""
    data = request.get_json()
    username = data.get('username')
    
    if not username:
        return jsonify({'success': False, 'error': 'Username required'}), 400
    
    users = load_users()
    
    if username not in users:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    
    # Update user data
    user = users[username]
    if 'xp' in data:
        user['xp'] = data['xp']
    if 'completedTopics' in data:
        user['completedTopics'] = data['completedTopics']
    if 'achievements' in data:
        user['achievements'] = data['achievements']
    
    save_users(users)
    
    return jsonify({'success': True, 'message': 'Progress updated'}), 200

@app.route('/api/compile', methods=['POST', 'OPTIONS'])
def api_compile():
    """Compile and run C code"""
    data = request.get_json()
    
    if not data:
        return jsonify({
            'success': False,
            'error': 'No data provided'
        }), 400
    
    code = data.get('code', '')
    topic = data.get('topic', 'general')
    language = data.get('language', 'c')
    stdin_input = data.get('input', '')  # For interactive programs
    
    if not code.strip():
        return jsonify({
            'success': False,
            'error': 'Code cannot be empty',
            'output': ''
        }), 400
    
    try:
        import subprocess
        import tempfile
        import os
        import platform
        import time
        
        # Check if GCC is available
        try:
            subprocess.run(['gcc', '--version'], capture_output=True, timeout=2)
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return jsonify({
                'success': False,
                'error': 'GCC compiler not found. Please install MinGW (Windows) or GCC (Linux/Mac).',
                'output': '',
                'hint': 'Windows: Download MinGW from mingw-w64.org or use: choco install mingw-w64'
            }), 500
        
        # Create temporary files for compilation
        with tempfile.TemporaryDirectory() as tmpdir:
            # Write source code
            source_file = os.path.join(tmpdir, 'main.c')
            with open(source_file, 'w') as f:
                f.write(code)
            
            # Compile
            output_file = os.path.join(tmpdir, 'main.exe' if os.name == 'nt' else 'main')
            compile_cmd = ['gcc', source_file, '-o', output_file]
            
            compile_start = time.time()
            compile_result = subprocess.run(compile_cmd, capture_output=True, text=True, timeout=10)
            compile_time = time.time() - compile_start
            
            if compile_result.returncode != 0:
                error_msg = compile_result.stderr or 'Unknown compilation error'
                return jsonify({
                    'success': False,
                    'error': error_msg,
                    'output': '',
                    'compileTime': compile_time
                }), 400
            
            # Run compiled program in temporary directory (so any files created stay in tmpdir)
            run_cmd = output_file
            run_start = time.time()
            
            # Use stdin if provided, otherwise None
            stdin_data = stdin_input if stdin_input else None
            
            run_result = subprocess.run(
                run_cmd, 
                capture_output=True, 
                text=True, 
                timeout=5,
                input=stdin_data,
                cwd=tmpdir  # Run in temp directory so files created there are auto-cleaned
            )
            
            run_time = time.time() - run_start
            
            output = run_result.stdout
            error = run_result.stderr
            
            return jsonify({
                'success': True,
                'output': output,
                'error': error,
                'returnCode': run_result.returncode,
                'compileTime': compile_time,
                'executionTime': run_time,
                'timestamp': time.time()
            }), 200
            
    except subprocess.TimeoutExpired:
        print('❌ Code execution timeout')
        return jsonify({
            'success': False,
            'error': 'Code execution timeout (max 5 seconds)',
            'output': ''
        }), 408
    except FileNotFoundError:
        return jsonify({
            'success': False,
            'error': 'GCC compiler not found. Please install MinGW or GCC.',
            'output': ''
        }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'output': ''
        }), 500

# ========== AI FEEDBACK ==========

@app.route('/api/ai-feedback', methods=['POST', 'OPTIONS'])
def api_ai_feedback():
    """Get AI feedback on code using Groq API"""
    data = request.get_json()
    
    if not data:
        return jsonify({
            'success': False,
            'error': 'No data provided'
        }), 400
    
    code = data.get('code', '')
    topic = data.get('topic', 'general')
    error = data.get('error', '')
    output = data.get('output', '')
    
    if not code.strip():
        return jsonify({
            'success': False,
            'error': 'Code cannot be empty'
        }), 400
    
    # Check if API key is set
    if not GROQ_API_KEY or GROQ_API_KEY == 'PASTE HERE':
        return jsonify({
            'success': False,
            'error': 'AI service not configured',
            'feedback': 'To use AI feedback, please configure your Groq API key in app.py'
        }), 501
    
    try:
        client = Groq(api_key=GROQ_API_KEY)
        
        # Build context for AI
        context = f"""You are an expert C programming tutor helping students learn. 
The student is learning about: {topic}

Student's Code:
```c
{code}
```
"""
        
        if error:
            context += f"\nError encountered:\n{error}\n"
        
        if output:
            context += f"\nActual Output:\n{output}\n"
        
        context += """
Please provide helpful feedback in this format:
1. **What's Good**: What the student did well
2. **Issues**: Any bugs or improvements needed (be specific)
3. **Explanation**: Brief explanation of what could be improved
4. **Suggestion**: Show correct approach if there's an issue
5. **Learning Point**: Key concept to understand

Keep feedback concise, encouraging, and educational. Use a friendly tone."""
        
        # Call Groq API with correct method
        completion = client.chat.completions.create(
            model="qwen/qwen3-32b",
            max_tokens=1024,
            messages=[
                {"role": "user", "content": context}
            ]
        )
        
        feedback_text = completion.choices[0].message.content
        
        return jsonify({
            'success': True,
            'feedback': feedback_text,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        print(f'❌ AI Feedback Error: {str(e)}')
        return jsonify({
            'success': False,
            'error': f'AI service error: {str(e)}',
            'feedback': 'Unable to get AI feedback at this time.'
        }), 500

# ========== ERROR HANDLERS ==========

@app.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'error': 'Not found'}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({'success': False, 'error': 'Server error'}), 500

# ========== MAIN ==========

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)