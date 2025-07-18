// Modules
const express = require('express');
const router = express.Router();
const db = require('../db/db');

// Functions
function isLoggedIn(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.send(`<p>⏳ Session expired. <a href="/">Login again</a></p>`);
  }
}

function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') {
    return next();
  } else {
    return res.status(403).send('⛔ Access denied: Admins only.');
  }
}

router.get('/login', (req, res) => {
  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Yarn Inventory Tracker - Login</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 min-h-screen flex items-center justify-center">

  <div class="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full space-y-6">
    <div class="text-center">
      <h1 class="text-3xl font-bold text-indigo-700">Yarn Inventory Tracker</h1>
      <p class="text-gray-500 mt-2">Please login to continue</p>
    </div>

    <form class="space-y-5" action="/login" method="POST">
      <div>
        <label class="block text-sm font-medium text-gray-600">Username</label>
        <input type="text" name="username" required placeholder="Enter username"
          class="w-full px-4 py-2 mt-1 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-600">Password</label>
        <input type="password" name="password" required placeholder="Enter password"
          class="w-full px-4 py-2 mt-1 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400" />
      </div>

      <button type="submit"
        class="w-full bg-indigo-600 text-white font-semibold py-2 rounded-xl hover:bg-indigo-700 transition duration-300">
        Login
      </button>
    </form>
  </div>
</body>
</html>
  `;

  res.send(html);
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.query(
    'SELECT * FROM users WHERE username = ? AND password = ?',
    [username, password],
    (err, results) => {
      if (err) return res.send('DB error');

      if (results.length > 0) {
        req.session.user = {
          id: results[0].id,
          username: results[0].username,
          email: results[0].email,
          role: results[0].role,
          created_at: results[0].created_at
        };

        console.log('✅ Logged in:', req.session.user.username);
        db.query(`INSERT INTO logs (user_id, user_name, action_type, table_name, description) VALUES (?, ?, 'login', 'users', 'User logged in')`, [req.session.user.id, req.session.user.username]);

        res.redirect('/dashboard');
      } else {
        res.send('Invalid Credentials');
      }
    }
  );
});

router.post('/logout', (req, res) => {
  db.query(`INSERT INTO logs (user_id, user_name, action_type, table_name, description) VALUES (?, ?, 'logout', 'users', 'User logged out')`, [req.session.user.id, req.session.user.username]);

  req.session.destroy((err) => {
    if (err) return res.send('Logout failed');
    res.redirect('/');
  });
});

module.exports = {
  router,
  isLoggedIn,
  isAdmin
};