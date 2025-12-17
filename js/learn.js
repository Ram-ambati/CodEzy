// ========== CONFIGURATION ==========
const API_BASE = `http://${window.location.hostname}:5000/api`;
const CURRENT_USER_KEY = 'codEzy_current_user';

// ========== STATE ==========
let currentUser = null;
let currentTopic = null;
let allTopics = [];
let codeEditor = null;  // CodeMirror editor instance

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
    initializePage();
});

async function initializePage() {
    // Check if user is authenticated
    const user = loadCurrentUser();
    if (!user) {
        showAuthModal();
        return;
    }
    
    currentUser = user;
    updateUserDisplay();
    
    // Load topics
    await loadAllTopics();
    
    // Initialize CodeMirror
    initializeCodeEditor();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load first topic
    if (allTopics.length > 0) {
        selectTopic(allTopics[0].id);
    }
}

// ========== CODEMIRROR EDITOR INITIALIZATION ==========
function initializeCodeEditor() {
    const editorElement = document.getElementById('codeEditor');
    if (!editorElement) return;
    
    codeEditor = CodeMirror(editorElement, {
        lineNumbers: true,
        mode: 'text/x-csrc',  // C language mode
        theme: 'material-darker',
        indentUnit: 4,
        indentWithTabs: false,
        lineWrapping: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        styleActiveLine: true,
        highlightSelectionMatches: { showToken: /\w/, annotateScrollbar: true },
        extraKeys: {
            'Ctrl-Space': 'autocomplete',
            'Cmd-Space': 'autocomplete'
        },
        value: ''  // Start empty, let topics load their code
    });
    
    // Auto-save on change
    codeEditor.on('change', () => {
        const topicId = currentTopic ? currentTopic.id : 'default';
        localStorage.setItem(`code_${topicId}`, codeEditor.getValue());
        localStorage.setItem('codEzy_editor_content', codeEditor.getValue());
    });
}

// ========== USER MANAGEMENT ==========
function loadCurrentUser() {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            return null;
        }
    }
    return null;
}

function saveCurrentUser(user) {
    currentUser = user;
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

function updateUserDisplay() {
    if (!currentUser) return;
    
    document.getElementById('userName').textContent = currentUser.username || 'User';
    document.getElementById('userXP').textContent = `${currentUser.xp || 0} XP`;
    document.getElementById('userAvatar').textContent = getAvatarEmoji(currentUser.username);
}

function awardXP(amount, reason = 'Activity') {
    if (!currentUser) return;
    
    currentUser.xp = (currentUser.xp || 0) + amount;
    saveCurrentUser(currentUser);
    updateUserDisplay();
    
    // Show XP notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        font-weight: 600;
        animation: slideIn 0.3s ease;
        z-index: 9999;
    `;
    notification.textContent = `+${amount} XP - ${reason}`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

function getAvatarEmoji(username) {
    const emojis = ['👨‍💻', '👩‍💻', '🧑‍💻', '👨‍🎓', '👩‍🎓', '🎯', '⭐'];
    const index = (username || '').length % emojis.length;
    return emojis[index];
}

// showAuthModal and showProfileModal removed - not used in current implementation

// ========== TOPIC MANAGEMENT ==========
async function loadAllTopics() {
    try {
        const response = await fetch(`${API_BASE}/topics`);
        const data = await response.json();
        
        if (data.success && data.topics) {
            allTopics = data.topics;
            renderTopicsList();
        } else {
            console.warn('Topics not in expected format:', data);
        }
    } catch (error) {
        console.error('Error loading topics:', error);
    }
}

function renderTopicsList() {
    const topicsList = document.getElementById('topicsList');
    topicsList.innerHTML = '';
    
    allTopics.forEach(topic => {
        const isCompleted = (currentUser.completedTopics || []).includes(topic.id);
        const topicBtn = document.createElement('button');
        topicBtn.className = 'topic-btn' + (isCompleted ? ' completed' : '');
        topicBtn.innerHTML = `
            <div class="topic-btn-content">
                <span class="topic-icon">${topic.icon || '📚'}</span>
                <span class="topic-name">${topic.title}</span>
                <span class="topic-difficulty ${topic.difficulty}">${topic.difficulty}</span>
                ${isCompleted ? '<i class="fas fa-check-circle"></i>' : ''}
            </div>
        `;
        topicBtn.onclick = () => selectTopic(topic.id);
        topicsList.appendChild(topicBtn);
    });
}

async function selectTopic(topicId) {
    try {
        const response = await fetch(`${API_BASE}/topic/${topicId}`);
        const data = await response.json();
        
        if (data.success) {
            currentTopic = data.topic;
            renderTopicContent();
            markTopicAsViewed(topicId);
        }
    } catch (error) {
        console.error('Error loading topic:', error);
    }
}

function renderTopicContent() {
    if (!currentTopic) return;
    
    // Update header
    document.getElementById('topicTitle').textContent = currentTopic.title;
    document.getElementById('topicDescription').textContent = currentTopic.description;
    document.getElementById('difficultyBadge').innerHTML = `${getDifficultyEmoji(currentTopic.difficulty)} ${currentTopic.difficulty}`;
    document.getElementById('difficultyBadge').className = `difficulty-badge ${currentTopic.difficulty}`;
    document.getElementById('topicDuration').textContent = `⏱️ ${currentTopic.estimatedTime || '~15 min'}`;
    
    // Load code editor with saved code or default code
    loadCodeEditor();
    
    // Clear output
    document.getElementById('outputConsole').innerHTML = '<p class="output-placeholder">Click "Run Code" to see output...</p>';
    document.getElementById('outputStatus').textContent = 'Ready';
    
    // Render introduction
    renderIntroduction();
    
    // Render concepts
    renderConcepts();
    
    // Render challenges
    renderChallenges();
}

function loadCodeEditor() {
    if (!codeEditor) return;
    
    const topicId = currentTopic.id;
    const savedCode = localStorage.getItem(`code_${topicId}`);
    
    let defaultCode = '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}';
    
    if (currentTopic.codeEditor && currentTopic.codeEditor.defaultCode) {
        defaultCode = currentTopic.codeEditor.defaultCode;
    }
    
    const codeToLoad = savedCode || defaultCode;
    codeEditor.setValue(codeToLoad);
}

function renderIntroduction() {
    if (!currentTopic.introduction) return;
    
    const intro = currentTopic.introduction;
    const introContent = document.getElementById('introContent');
    
    let html = `<p>${intro.content}</p>`;
    
    if (intro.keyPoints && intro.keyPoints.length > 0) {
        html += '<div class="key-points"><h4>📌 Key Points:</h4><ul>';
        intro.keyPoints.forEach(point => {
            html += `<li>${point}</li>`;
        });
        html += '</ul></div>';
    }
    
    introContent.innerHTML = html;
}

function renderConcepts() {
    if (!currentTopic.concepts || currentTopic.concepts.length === 0) return;
    
    const conceptsContainer = document.getElementById('conceptsContainer');
    conceptsContainer.innerHTML = '';
    
    currentTopic.concepts.forEach((concept, index) => {
        // Split content by double newlines (\n\n) for paragraphs
        let paragraphArray = concept.content.split(/\n\n+/);
        paragraphArray = paragraphArray.filter(p => p.trim().length > 0);
        const paragraphsHTML = paragraphArray
            .map(p => `<p>${p.trim()}</p>`)
            .join('');
        
        const conceptDiv = document.createElement('div');
        conceptDiv.className = 'concept-card';
        conceptDiv.innerHTML = `
            <div class="concept-header">
                <div class="concept-title-section">
                    <h3>${concept.title}</h3>
                    <span class="concept-badge">${index + 1}/${currentTopic.concepts.length}</span>
                </div>
            </div>
            <div class="concept-body">
                <div class="concept-text">
                    ${paragraphsHTML}
                </div>
                ${concept.codeExample ? `
                    <div class="concept-code">
                        <div class="code-label">💻 Example Code</div>
                        <pre><code>${escapeHtml(concept.codeExample)}</code></pre>
                    </div>
                ` : ''}
            </div>
        `;
        conceptsContainer.appendChild(conceptDiv);
    });
}

// ========== VISUALIZATION SCHEMA HANDLER ==========
// Schema-based visualization system - topic independent
// Each visualization must follow this schema:

// {
//   type: "table|array|flow|trace|pointer|custom",
//   title?: "Display Title",
//   description?: "Description text",
//   config?: { /* type-specific configuration */ },
//   data: { /* type-specific data */ }
// }

const VISUALIZATION_RENDERERS = {
    // Table: Renders any array of objects as a table
    table: (viz) => {
        if (!viz.data?.rows || viz.data.rows.length === 0) return '<p>No data</p>';
        
        const headers = viz.config?.columns || Object.keys(viz.data.rows[0]);
        const headerLabels = viz.config?.columnLabels || headers;
        
        const headerRow = headerLabels.map(h => `<th>${h}</th>`).join('');
        const rows = viz.data.rows.map(row => {
            const cells = headers.map(key => {
                const value = row[key];
                const isCodable = String(value).match(/[.:\[\]()0x]/);
                return `<td>${isCodable ? `<code>${escapeHtml(String(value))}</code>` : escapeHtml(String(value))}</td>`;
            }).join('');
            return `<tr>${cells}</tr>`;
        }).join('');
        
        return `<table class="data-table"><thead><tr>${headerRow}</tr></thead><tbody>${rows}</tbody></table>`;
    },
    
    // Array: Renders array elements with optional highlighting
    array: (viz) => {
        if (!viz.data?.items || viz.data.items.length === 0) return '<p>No data</p>';
        
        const cells = viz.data.items.map((item, idx) => `
            <div class="array-cell ${item.highlight ? 'highlighted' : ''}">
                <div class="array-index">[${item.index ?? idx}]</div>
                <div class="array-value">${escapeHtml(String(item.value))}</div>
            </div>
        `).join('');
        
        return `<div class="array-diagram"><div class="array-container">${cells}</div></div>`;
    },
    
    // Flow: Renders flowchart with steps and arrows
    flow: (viz) => {
        if (!viz.data?.steps || viz.data.steps.length === 0) return '<p>No data</p>';
        
        const steps = viz.data.steps.map(step => `
            <div class="flow-step">
                <div class="flow-box">
                    <strong>${escapeHtml(step.label)}</strong>
                    ${step.description ? `<p>${escapeHtml(step.description)}</p>` : ''}
                    ${step.condition ? `<div class="flow-condition">⚙️ ${escapeHtml(step.condition)}</div>` : ''}
                </div>
                ${step.hasNext !== false ? '<div class="flow-arrow">↓</div>' : ''}
            </div>
        `).join('');
        
        return `<div class="flow-diagram">${steps}</div>`;
    },
    
    // Execution Trace: Step-by-step code execution with variables
    trace: (viz) => {
        if (!viz.data?.steps || viz.data.steps.length === 0) return '<p>No data</p>';
        
        const steps = viz.data.steps.map(step => {
            const vars = step.variables ? Object.entries(step.variables)
                .map(([k, v]) => `<span class="var-item"><strong>${k}</strong>=<code>${escapeHtml(String(v))}</code></span>`)
                .join('') : '';
            
            return `
                <div class="trace-step">
                    <div class="trace-line">L${step.line}: <code>${escapeHtml(step.code)}</code></div>
                    ${vars ? `<div class="trace-vars">${vars}</div>` : ''}
                </div>
            `;
        }).join('');
        
        return `<div class="execution-trace">${steps}</div>`;
    },
    
    // Pointer/Reference: Shows variable references and addresses
    pointer: (viz) => {
        if (!viz.data?.items || viz.data.items.length === 0) return '<p>No data</p>';
        
        const items = viz.data.items.map(item => `
            <div class="pointer-item">
                <div class="pointer-name"><strong>${escapeHtml(item.name)}</strong></div>
                <div class="pointer-arrow">→</div>
                <div class="pointer-target">
                    ${item.pointsTo ? `refs: <code>${escapeHtml(item.pointsTo)}</code>` : `value: <code>${escapeHtml(String(item.value))}</code>`}
                </div>
                ${item.address ? `<div class="pointer-addr"><small>${escapeHtml(item.address)}</small></div>` : ''}
            </div>
        `).join('');
        
        return `<div class="pointer-diagram">${items}</div>`;
    },
    
    // Custom: User-defined HTML
    custom: (viz) => {
        return viz.data?.html || '<p>Custom visualization</p>';
    }
};

// renderSchemaVisualization removed - not used in current implementation

// renderCodeChallenge removed - not used in current implementation

function renderChallenges() {
    if (!currentTopic.challenges || currentTopic.challenges.length === 0) return;
    
    const challengesContainer = document.getElementById('challengesContainer');
    challengesContainer.innerHTML = '';
    
    currentTopic.challenges.forEach((challenge, index) => {
        const challengeDiv = document.createElement('div');
        challengeDiv.className = 'challenge-card';
        challengeDiv.innerHTML = `
            <div class="challenge-header">
                <h4>Challenge ${index + 1}: ${challenge.title}</h4>
            </div>
            <div class="challenge-body">
                <p class="challenge-description">${challenge.description}</p>
                ${challenge.hints && challenge.hints.length > 0 ? `
                    <details class="hints-section">
                        <summary>💡 Hints (${challenge.hints.length})</summary>
                        <ul class="hints-list">
                            ${challenge.hints.map(h => `<li>${h}</li>`).join('')}
                        </ul>
                    </details>
                ` : ''}
                <div class="challenge-actions">
                    <button class="btn btn-secondary" data-challenge-id="${challenge.id}">View Solution</button>
                </div>
            </div>
        `;
        challengesContainer.appendChild(challengeDiv);
    });
}

// ========== CODE EDITOR ==========
document.addEventListener('click', (e) => {
    if (e.target.id === 'runCodeBtn') {
        runCode();
    } else if (e.target.id === 'resetCodeBtn') {
        resetCode();
    } else if (e.target.id === 'saveCodeBtn') {
        saveCode();
    }
});

function runCode() {
    const code = codeEditor ? codeEditor.getValue() : document.getElementById('codeEditor').value;
    const outputConsole = document.getElementById('outputConsole');
    const outputStatus = document.getElementById('outputStatus');
    
    if (!code.trim()) {
        outputConsole.innerHTML = '<p class="error">❌ Please write some code first!</p>';
        outputStatus.textContent = 'Error';
        return;
    }
    
    outputStatus.textContent = 'Compiling...';
    outputConsole.innerHTML = '<p class="loading">⏳ Compiling and executing...</p>';
    
    // Send code to backend for compilation
    const topicId = currentTopic ? currentTopic.id : 'general';
    const compileUrl = `${API_BASE}/compile`;
    
    fetch(compileUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            code: code,
            topic: topicId,
            language: 'c'
        })
    })
    .then(response => response.json())
    .then(data => {
        
        if (data.success) {
            outputStatus.textContent = '✅ Success';
            
            // Format execution stats
            const stats = `
                <div class="execution-stats">
                    <span class="stat-item">⏱️ Compile: ${(data.compileTime * 1000).toFixed(2)}ms</span>
                    <span class="stat-item">▶️ Execute: ${(data.executionTime * 1000).toFixed(2)}ms</span>
                    <span class="stat-item">📍 Return Code: ${data.returnCode}</span>
                </div>
            `;
            
            outputConsole.innerHTML = `
                <div class="output-success">
                    <div class="output-section">
                        <p><strong>📤 Output:</strong></p>
                        <pre>${escapeHtml(data.output || '(no output)')}</pre>
                    </div>
                    ${stats}
                    ${data.error ? `<div class="output-section">
                        <p><strong>⚠️ Warnings/Errors:</strong></p>
                        <pre>${escapeHtml(data.error)}</pre>
                    </div>` : ''}
                </div>
            `;
            // Generate visualization from output
            analyzeOutputAndVisualize(data.output || '', code);
            
            // Award XP for successful code execution
            awardXP(5, 'Code Execution');
        } else {
            outputStatus.textContent = '❌ Error';
            outputConsole.innerHTML = `
                <div class="output-error">
                    <p><strong>❌ Compilation Error:</strong></p>
                    <pre>${escapeHtml(data.error || 'Unknown error')}</pre>
                    ${data.hint ? `<p class="hint-text">💡 Hint: ${data.hint}</p>` : ''}
                </div>
            `;
        }
    })
    .catch(error => {
        outputStatus.textContent = '⚠️ Error';
        outputConsole.innerHTML = `
            <div class="output-error">
                <p><strong>❌ Connection Error:</strong></p>
                <pre>${escapeHtml(error.message)}</pre>
            </div>
        `;
    });
}

// getAIFeedback removed - not used in current implementation

function markdownToHtml(text) {
    // Convert markdown-like formatting to HTML
    let html = text;
    
    // Replace bold **text** with bright cyan/blue
    html = html.replace(/\*\*(.+?)\*\*/g, '<span style="color: #06b6d4; font-weight: 700;">$1</span>');
    
    // Replace numbered lists like 1. Item with proper formatting
    html = html.split('\n').map(line => {
        // Numbered lists
        if (/^\d+\.\s/.test(line.trim())) {
            const content = line.replace(/^\d+\.\s/, '').trim();
            return `<div style="margin-left: 20px; margin-top: 8px; color: #e2e8f0;"><span style="color: #10b981; font-weight: bold;">✓</span> ${content}</div>`;
        }
        // Bullet lists
        else if (line.trim().startsWith('- ')) {
            const content = line.substring(line.indexOf('-') + 1).trim();
            return `<div style="margin-left: 20px; margin-top: 4px; color: #e2e8f0;"><span style="color: #10b981; font-weight: bold;">•</span> ${content}</div>`;
        }
        // Inline code
        else {
            line = line.replace(/`(.+?)`/g, '<code style="background: #1e293b; padding: 3px 8px; border-radius: 4px; color: #22d3ee; font-family: monospace; border: 1px solid #0ea5e9;">$1</code>');
            return line;
        }
    }).join('');
    
    // Replace multiple line breaks with proper spacing
    html = html.replace(/\n\n+/g, '<br><br>');
    
    // Wrap in styled container
    return `<div style="color: #e2e8f0; line-height: 1.8; word-break: break-word; font-size: 14px;">${html}</div>`;
}

// ========== OUTPUT TO VISUALIZATION CONVERTER ==========
// Analyzes code output and generates appropriate visualizations

function analyzeOutputAndVisualize(output, code) {
    const visualizerContainer = document.getElementById('visualizerContainer');
    if (!visualizerContainer) return;
    
    // Parse output lines
    const lines = output.trim().split('\n').filter(line => line.trim());
    if (lines.length === 0) {
        visualizerContainer.innerHTML = '<p>No output to visualize</p>';
        return;
    }
    
    // Try to detect visualization type from output pattern
    
    // 1. TABLE DETECTION: Multiple values with consistent format (col1: val1, col2: val2)
    const tableMatch = detectTableOutput(lines);
    if (tableMatch) {
        displayTableVisualization(tableMatch, visualizerContainer);
        return;
    }
    
    // 2. ARRAY/LIST DETECTION: Space or comma-separated numbers
    const arrayMatch = detectArrayOutput(lines);
    if (arrayMatch) {
        displayArrayVisualization(arrayMatch, visualizerContainer);
        return;
    }
    
    // 3. STEP-BY-STEP TRACE: Lines with variable assignments (var = value)
    const traceMatch = detectTraceOutput(lines);
    if (traceMatch) {
        displayTraceVisualization(traceMatch, visualizerContainer);
        return;
    }
    
    // 4. TREE/HIERARCHY DETECTION: Indented structure
    const treeMatch = detectTreeOutput(lines);
    if (treeMatch) {
        displayTreeVisualization(treeMatch, visualizerContainer);
        return;
    }
    
    // 5. DEFAULT: Show as plain text
    visualizerContainer.innerHTML = `
        <div class="output-visualization">
            <h4>Program Output</h4>
            <pre>${escapeHtml(output)}</pre>
        </div>
    `;
}

function detectTableOutput(lines) {
    // Look for structured data like:
    // Name: John Age: 25
    // Name: Jane Age: 30
    // OR: Name | Age
    //     John | 25
    
    const pipeLines = lines.filter(l => l.includes('|'));
    if (pipeLines.length >= 2) {
        const headers = pipeLines[0].split('|').map(h => h.trim());
        const rows = pipeLines.slice(1).map(line => 
            line.split('|').map(cell => cell.trim())
        );
        return { headers, rows, type: 'table' };
    }
    
    // Look for key: value patterns
    const keyValuePattern = /^([^:]+):\s*(.+)$/;
    const kvLines = lines.filter(l => keyValuePattern.test(l));
    if (kvLines.length >= 2) {
        const firstLine = kvLines[0];
        const keys = [];
        const rows = [];
        
        // Extract keys from first line
        firstLine.split(/\s+(?=[A-Za-z_]+=)/).forEach(pair => {
            const match = pair.match(/([^=]+)=(.+)/);
            if (match) keys.push(match[1].trim());
        });
        
        // Parse all lines as rows
        kvLines.forEach(line => {
            const rowData = {};
            let currentKey = null;
            line.split(/\s+/).forEach(part => {
                if (part.includes('=')) {
                    const [k, v] = part.split('=');
                    currentKey = k.trim();
                    rowData[currentKey] = v;
                }
            });
            if (Object.keys(rowData).length > 0) rows.push(rowData);
        });
        
        if (rows.length >= 2 && keys.length > 0) {
            return { headers: keys, rows, type: 'table' };
        }
    }
    
    return null;
}

function detectArrayOutput(lines) {
    // Look for lines with multiple space/comma-separated numbers
    const numberPattern = /[\s,]+/;
    const arrayLines = lines.filter(line => {
        const parts = line.split(numberPattern).filter(p => p && !isNaN(p));
        return parts.length >= 3;
    });
    
    if (arrayLines.length > 0) {
        const line = arrayLines[0];
        const items = line.split(/[\s,]+/)
            .filter(p => p && !isNaN(p))
            .map((value, idx) => ({ index: idx, value: parseInt(value) }));
        
        return items.length >= 3 ? items : null;
    }
    
    return null;
}

function detectTraceOutput(lines) {
    // Look for variable state lines like: x=10, y=20
    const assignmentPattern = /\b([a-zA-Z_]\w*)\s*=\s*([^\s,]+)/g;
    const steps = [];
    
    lines.forEach((line, idx) => {
        const variables = {};
        let match;
        while ((match = assignmentPattern.exec(line)) !== null) {
            variables[match[1]] = match[2];
        }
        
        if (Object.keys(variables).length > 0) {
            steps.push({
                line: idx + 1,
                code: line,
                variables: variables
            });
        }
    });
    
    return steps.length >= 2 ? steps : null;
}

function detectTreeOutput(lines) {
    // Look for indentation patterns
    const indentedLines = lines.filter(l => l.match(/^\s+/));
    if (indentedLines.length > 2) {
        const steps = lines.map(line => ({
            label: line.trim(),
            description: `Indent: ${line.match(/^\s*/)[0].length}`
        }));
        return steps;
    }
    return null;
}

function displayTableVisualization(data, container) {
    if (!data.rows || data.rows.length === 0) return;
    
    const headers = data.headers || Object.keys(data.rows[0]);
    const headerRow = headers.map(h => `<th>${escapeHtml(String(h))}</th>`).join('');
    
    const bodyRows = data.rows.map(row => {
        const cells = headers.map(key => {
            const value = row[key] || row[Object.keys(row)[headers.indexOf(key)]] || '';
            return `<td>${escapeHtml(String(value))}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
    }).join('');
    
    container.innerHTML = `
        <div class="output-visualization">
            <h4>📊 Data Table</h4>
            <table class="data-table">
                <thead><tr>${headerRow}</tr></thead>
                <tbody>${bodyRows}</tbody>
            </table>
        </div>
    `;
}

function displayArrayVisualization(items, container) {
    const cells = items.map(item => `
        <div class="array-cell">
            <div class="array-index">[${item.index}]</div>
            <div class="array-value">${escapeHtml(String(item.value))}</div>
        </div>
    `).join('');
    
    container.innerHTML = `
        <div class="output-visualization">
            <h4>📦 Array Visualization</h4>
            <div class="array-diagram"><div class="array-container">${cells}</div></div>
        </div>
    `;
}

function displayTraceVisualization(steps, container) {
    const stepHTML = steps.map(step => `
        <div class="trace-step">
            <div class="trace-line">L${step.line}: <code>${escapeHtml(step.code)}</code></div>
            <div class="trace-vars">
                ${Object.entries(step.variables).map(([k, v]) => 
                    `<span class="var-item"><strong>${k}</strong>=<code>${escapeHtml(String(v))}</code></span>`
                ).join('')}
            </div>
        </div>
    `).join('');
    
    container.innerHTML = `
        <div class="output-visualization">
            <h4>🔍 Execution Trace</h4>
            <div class="execution-trace">${stepHTML}</div>
        </div>
    `;
}

function displayTreeVisualization(steps, container) {
    const stepHTML = steps.map(step => `
        <div class="flow-step">
            <div class="flow-box">
                <strong>${escapeHtml(step.label)}</strong>
            </div>
            <div class="flow-arrow">↓</div>
        </div>
    `).join('');
    
    container.innerHTML = `
        <div class="output-visualization">
            <h4>🌳 Flow Diagram</h4>
            <div class="flow-diagram">${stepHTML}</div>
        </div>
    `;
}

function resetCode() {
    if (!currentTopic) return;
    
    let defaultCode = '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}';
    
    if (currentTopic.codeEditor && currentTopic.codeEditor.defaultCode) {
        defaultCode = currentTopic.codeEditor.defaultCode;
    }
    
    if (codeEditor) {
        codeEditor.setValue(defaultCode);
    } else {
        document.getElementById('codeEditor').value = defaultCode;
    }
    
    // Clear output
    document.getElementById('outputConsole').innerHTML = '<p class="output-placeholder">Click "Run Code" to see output...</p>';
    document.getElementById('outputStatus').textContent = 'Ready';
    
    // Auto-save
    saveCode();
}

function saveCode() {
    let code = '';
    
    if (codeEditor) {
        code = codeEditor.getValue();
    } else {
        code = document.getElementById('codeEditor').value;
    }
    
    const topicId = currentTopic ? currentTopic.id : 'default';
    const key = `code_${topicId}`;
    
    localStorage.setItem(key, code);
    localStorage.setItem('codEzy_editor_content', code);
}

// ========== UTILITY FUNCTIONS ==========
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatChatResponse(text) {
    // Split by code blocks
    const parts = text.split(/(```[\s\S]*?```)/);
    let codeBlockIndex = 0;
    
    return parts.map(part => {
        if (part.startsWith('```') && part.endsWith('```')) {
            // This is a code block
            const code = part.slice(3, -3).trim();
            // Extract language if specified (e.g., ```c or ```javascript)
            const lines = code.split('\n');
            const firstLine = lines[0];
            const language = /^[a-z]+$/.test(firstLine) ? firstLine : 'c';
            const codeContent = /^[a-z]+$/.test(firstLine) ? lines.slice(1).join('\n') : code;
            
            const codeId = `chat-code-${codeBlockIndex++}`;
            const escapedCode = escapeHtml(codeContent);
            
            return `
                <div class="code-block-wrapper" style="position: relative; margin: 10px 0;">
                    <button class="insert-code-btn" onclick="insertChatCodeIntoEditor('${codeId}')" title="Insert code into editor">
                        📋 Insert
                    </button>
                    <pre><code class="language-${language}" id="${codeId}" data-code="${escapedCode.replace(/"/g, '&quot;')}">${escapedCode}</code></pre>
                </div>
            `;
        } else if (part.trim()) {
            // Regular text - preserve line breaks and format as paragraphs
            return `<p>${escapeHtml(part).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;
        }
        return '';
    }).join('');
}

function insertChatCodeIntoEditor(codeId) {
    const codeElement = document.getElementById(codeId);
    if (!codeElement) {
        console.error('Code block not found:', codeId);
        return;
    }
    
    // Get the code content from the data attribute (has escaped HTML)
    const code = codeElement.getAttribute('data-code');
    if (!code) {
        console.error('No code content found');
        return;
    }
    
    // Unescape HTML entities
    const textarea = document.createElement('textarea');
    textarea.innerHTML = code;
    const decodedCode = textarea.value;
    
    // Insert into CodeMirror editor
    if (codeEditor) {
        codeEditor.setValue(decodedCode);
        codeEditor.focus();
        
        // Show visual feedback
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.style.borderColor = '#10b981';
            chatInput.placeholder = '✅ Code inserted! Now you can execute or modify it.';
            setTimeout(() => {
                chatInput.style.borderColor = '';
                chatInput.placeholder = 'Ask me anything about C programming...';
            }, 3000);
        }
    } else {
        console.error('Code editor not available');
    }
}

// ========== SEND CHAT MESSAGE ==========
function sendChatMessage() {
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');
    
    if (!chatInput || !chatMessages) {
        console.error('❌ Chat elements not found');
        return;
    }
    
    const message = chatInput.value.trim();
    if (!message) return;
    
    // Display user message
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'chat-message user-message';
    userMessageDiv.innerHTML = `
        <div class="message-avatar">👤</div>
        <div class="message-content">
            <p>${escapeHtml(message)}</p>
        </div>
    `;
    chatMessages.appendChild(userMessageDiv);
    chatInput.value = '';
    
    // Display loading message
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat-message bot-message';
    loadingDiv.id = 'loadingMessage';
    loadingDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <p>⏳ Thinking...</p>
        </div>
    `;
    chatMessages.appendChild(loadingDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Call AI API
    fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            question: message,
            context: currentTopic ? currentTopic.title : ''
        })
    })
    .then(response => response.json())
    .then(data => {
        // Remove loading message
        const loading = document.getElementById('loadingMessage');
        if (loading) loading.remove();
        
        if (data.success) {
            // Display bot response
            const botMessageDiv = document.createElement('div');
            botMessageDiv.className = 'chat-message bot-message';
            botMessageDiv.innerHTML = `
                <div class="message-avatar">🤖</div>
                <div class="message-content">
                    ${formatChatResponse(data.response)}
                </div>
            `;
            chatMessages.appendChild(botMessageDiv);
        } else {
            // Display error message
            const errorDiv = document.createElement('div');
            errorDiv.className = 'chat-message bot-message';
            errorDiv.innerHTML = `
                <div class="message-avatar">⚠️</div>
                <div class="message-content">
                    <p>Sorry, I couldn't process your question. ${data.error || ''}</p>
                </div>
            `;
            chatMessages.appendChild(errorDiv);
        }
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    })
    .catch(error => {
        console.error('❌ Chat error:', error);
        
        // Remove loading message
        const loading = document.getElementById('loadingMessage');
        if (loading) loading.remove();
        
        // Display error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'chat-message bot-message';
        errorDiv.innerHTML = `
            <div class="message-avatar">⚠️</div>
            <div class="message-content">
                <p>Error connecting to AI. Please try again.</p>
            </div>
        `;
        chatMessages.appendChild(errorDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

function getDifficultyEmoji(difficulty) {
    const emojis = { beginner: '🟢', intermediate: '🟡', advanced: '🔴' };
    return emojis[difficulty] || '🟢';
}

function markTopicAsViewed(topicId) {
    if (!currentUser.viewedTopics) {
        currentUser.viewedTopics = [];
    }
    if (!currentUser.viewedTopics.includes(topicId)) {
        currentUser.viewedTopics.push(topicId);
        saveCurrentUser(currentUser);
    }
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    
    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.removeItem(CURRENT_USER_KEY);
        window.location.href = '/static/auth.html';
    });
    
    // Topics toggle
    document.getElementById('topicsToggle')?.addEventListener('click', function() {
        const content = document.getElementById('topicsContent');
        content.classList.toggle('closed');
        this.querySelector('.section-toggle-icon').style.transform = 
            content.classList.contains('closed') ? 'rotate(0deg)' : 'rotate(180deg)';
    });
    
    // ===== MOBILE AI CHAT FLOATING ICON =====
    const aiChatSidebar = document.getElementById('aiChatSidebar');
    if (aiChatSidebar && window.innerWidth <= 768) {
        // Click anywhere on sidebar (floating icon) to open chat
        aiChatSidebar.addEventListener('click', (e) => {
            if (!aiChatSidebar.classList.contains('active')) {
                aiChatSidebar.classList.add('active');
            }
        });
    }
    
    // Close button for mobile chat
    const aiChatCloseBtn = document.getElementById('aiChatCloseBtn');
    if (aiChatCloseBtn) {
        aiChatCloseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            aiChatSidebar?.classList.remove('active');
        });
    }
    
    // ===== CHAT EVENT LISTENERS =====
    const sendBtn = document.getElementById('sendChatBtn');
    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            sendChatMessage();
        });
    } else {
        console.error('❌ sendChatBtn element not found in DOM');
    }
    
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }
}