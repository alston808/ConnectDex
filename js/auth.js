import { signIn, signUp, getCurrentUser, signOut } from './db.js';

async function checkAuth() {
  const { data } = await getCurrentUser();
  if (data.user) {
    if (!window.location.pathname.includes('index.html')) {
      window.location.href = 'index.html';
    }
  } else {
    if (!window.location.pathname.includes('login.html') && !window.location.pathname.includes('register.html')) {
      window.location.href = 'login.html';
    }
  }
}

checkAuth().then(async () => {
  const current = await getCurrentUser();
  window.currentUser = current.data.user;
});

const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
      window.location.href = 'index.html';
    } catch (error) {
      alert('Error logging in: ' + error.message);
    }
  });
}

const registerForm = document.getElementById('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
      const { error } = await signUp(email, password);
      if (error) throw error;
      alert('Registration successful! Please check your email to confirm your account.');
      window.location.href = 'login.html';
    } catch (error) {
      alert('Error registering: ' + error.message);
    }
  });
}

const logoutButton = document.getElementById('logout-button');
if (logoutButton) {
  logoutButton.addEventListener('click', async () => {
    await signOut();
    window.location.href = 'login.html';
  });
}