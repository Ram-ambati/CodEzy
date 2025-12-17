/* ============================================
   Auth Page JavaScript - Backend-driven
   ============================================ */

class AuthManager {
  constructor() {
    console.log('AuthManager constructor called');
    this.init();
  }

  init() {
    console.log('AuthManager init called');
    this.setupEventListeners();
    this.setupFormValidation();
    this.autoFocusFirstInput();
    console.log('AuthManager initialized');
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.target.closest('.tab-btn')));
    });

    // Form submission
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    if (loginForm) loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    if (signupForm) signupForm.addEventListener('submit', (e) => this.handleSignup(e));

    // Password toggle
    document.querySelectorAll('.toggle-password').forEach(btn => {
      btn.addEventListener('click', (e) => this.togglePasswordVisibility(e.target.closest('button')));
    });

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', () => this.closeAllModals()));
  }

  switchTab(tabBtn) {
    if (!tabBtn) return;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    tabBtn.classList.add('active');
    const tabName = tabBtn.getAttribute('data-tab');
    const tabEl = document.getElementById(`${tabName}-tab`);
    if (tabEl) tabEl.classList.add('active');
    this.autoFocusFirstInput();
  }

  setupFormValidation() {
    document.querySelectorAll('.form-input').forEach(input => {
      input.addEventListener('input', () => this.validateField(input));
    });
  }

  validateField(field) {
    if (!field) return true;
    const value = field.value.trim();
    const id = field.id || '';
    let valid = true;

    if (!value) valid = false;
    if (id.includes('email') && value && !this.isValidEmail(value)) valid = false;
    if (id.includes('password') && value && value.length < 6) valid = false;

    // visual feedback
    if (valid) {
      field.classList.remove('error');
      field.classList.add('success');
    } else {
      field.classList.remove('success');
      field.classList.add('error');
    }

    return valid;
  }

  isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  togglePasswordVisibility(btn) {
    if (!btn) return;
    const target = btn.getAttribute('data-target');
    const input = document.getElementById(target);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  }

  async handleLogin(e) {
    e.preventDefault();
    const usernameOrEmail = (document.getElementById('login-email') || {}).value || '';
    const password = (document.getElementById('login-password') || {}).value || '';
    const btn = e.target.querySelector('.auth-btn');

    if (!usernameOrEmail || password.length < 1) {
      this.showNotification('Please enter credentials', 'error');
      return;
    }

    this.setButtonLoading(btn, true);

    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameOrEmail, password })
      });
      const data = await res.json();
      this.setButtonLoading(btn, false);
      if (data && data.success) {
        localStorage.setItem('codEzy_current_user', JSON.stringify(data.user));
        this.showNotification(`Welcome ${data.user.username}!`, 'success');
        setTimeout(() => { window.location.href = '/learn'; }, 800);
      } else {
        this.showNotification((data && data.error) || 'Login failed', 'error');
      }
    } catch (err) {
      this.setButtonLoading(btn, false);
      console.error(err);
      this.showNotification('Network error', 'error');
    }
  }

  async handleSignup(e) {
    e.preventDefault();
    const username = (document.getElementById('signup-name') || {}).value || '';
    const email = (document.getElementById('signup-email') || {}).value || '';
    const password = (document.getElementById('signup-password') || {}).value || '';
    const confirm = (document.getElementById('signup-confirm') || {}).value || '';
    const terms = (document.getElementById('terms-checkbox') || {}).checked;
    const btn = e.target.querySelector('.auth-btn');

    if (!username || username.length < 2) { this.showNotification('Choose a username', 'error'); return; }
    if (!this.isValidEmail(email)) { this.showNotification('Enter a valid email', 'error'); return; }
    if (password.length < 6) { this.showNotification('Password too short', 'error'); return; }
    if (password !== confirm) { this.showNotification('Passwords do not match', 'error'); return; }
    if (!terms) { this.showNotification('Accept terms', 'error'); return; }

    this.setButtonLoading(btn, true);

    try {
      const res = await fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      const data = await res.json();
      this.setButtonLoading(btn, false);
      if (data && data.success) {
        localStorage.setItem('codEzy_current_user', JSON.stringify(data.user));
        this.showNotification('Account created — redirecting...', 'success');
        setTimeout(() => { window.location.href = '/learn'; }, 900);
      } else {
        this.showNotification((data && data.error) || 'Signup failed', 'error');
      }
    } catch (err) {
      this.setButtonLoading(btn, false);
      console.error(err);
      this.showNotification('Network error', 'error');
    }
  }

  // helpers
  setButtonLoading(btn, isLoading) { 
    if (!btn) return; 
    btn.disabled = !!isLoading; 
    btn.classList.toggle('loading', !!isLoading); 
  }

  showNotification(msg, type='info') { 
    const t = document.getElementById('notification-toast'); 
    if (t) { 
      t.textContent = msg; 
      t.className = `toast show ${type}`; 
      setTimeout(()=>t.classList.remove('show'), 3500); 
    } 
  }

  autoFocusFirstInput() { 
    setTimeout(()=>{ 
      const active = document.querySelector('.auth-form.active'); 
      if (!active) return; 
      const inp = active.querySelector('.form-input'); 
      if (inp) inp.focus(); 
    }, 100); 
  }

  closeAllModals() { 
    document.querySelectorAll('.modal').forEach(m=>m.classList.remove('active')); 
    document.body.style.overflow='auto'; 
  }
}

// initialization
document.addEventListener('DOMContentLoaded', () => {
  console.log('Auth page DOMContentLoaded');
  
  // Check if already logged in - if so, redirect to learn
  const user = localStorage.getItem('codEzy_current_user');
  console.log('Stored user in localStorage:', user ? 'exists' : 'not found');
  
  if (user) {
    try {
      JSON.parse(user); // Validate JSON
      console.log('Valid user found, redirecting to /learn');
      window.location.href = '/learn';
      return;
    } catch (e) {
      // Invalid JSON, clear and proceed to auth
      console.log('Invalid JSON, clearing localStorage');
      localStorage.removeItem('codEzy_current_user');
    }
  }
  
  console.log('Initializing AuthManager');
  // Not logged in, initialize auth manager
  new AuthManager();
});
