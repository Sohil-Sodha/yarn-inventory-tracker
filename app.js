const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const db = require('./db/db');

const { router: authRoutes, router } = require('./routes/auth');
const stockRoutes = require('./routes/stock');
const supplierRouter = require('./routes/suplier');
const logsRouter = require('./routes/logs');

const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files  

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 15 * 60 * 1000  // ⏱️ 15 minutes
  }
}));

app.use((req, res, next) => {
  if (req.session) {
    req.session._garbage = Date();
    req.session.touch();
  }
  next();
});

// Routes
app.use('/', authRoutes);
app.use('/', stockRoutes);
app.use('/', supplierRouter);
app.use('/', logsRouter);

function isLoggedIn(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.send(`<p>⏳ Session expired. <a href="/login">Login again</a></p>`);
  }
}

app.get('/', (req, res) => {
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  // res.sendFile(path.join(__dirname, '/views/login.html'));
  let html = `
  <!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>Login - Yarn Inventory System</title>
    <link rel="stylesheet" href="/css/style.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>

<body>
    <h2>Login</h2>
    <form action="/login" method="POST">
        <label>Username:</label><br>
        <input type="text" name="username" required><br><br>

        <label>Password:</label><br>
        <input type="password" name="password" required><br><br>

        <button type="submit">Login</button>

        <p><a href="/forgot-password">Forgot Password?</a></p>

    </form>
</body>

</html>
  `;
  res.send(html);
});

app.get('/dashboard', isLoggedIn, (req, res) => {
  const user = req.session.user;
  if (!user) return res.redirect('/login');

  const isAdmin = user.role === 'admin';

  // Run 4 queries in parallel
  const stats = {};

  db.query('SELECT COUNT(DISTINCT yarn_type) AS total_types FROM yarn_stock', (err, result1) => {
    stats.totalTypes = result1[0].total_types;

    db.query('SELECT SUM(quantity) AS total_qty FROM yarn_stock', (err2, result2) => {
      stats.totalQty = result2[0].total_qty || 0;

      db.query('SELECT COUNT(DISTINCT supplier_name) AS total_suppliers FROM yarn_stock', (err3, result3) => {
        stats.totalSuppliers = result3[0].total_suppliers;

        db.query('SELECT COUNT(*) AS total_rows FROM yarn_stock', (err4, result4) => {
          stats.totalRows = result4[0].total_rows;

          // Now render dashboard
          let html = `
            <html>
            <head>
              <title>Dashboard</title>
              <style>
                body { font-family: Arial; background: #f0f0f0; padding: 40px; }
                .container { background: white; padding: 30px; border-radius: 10px; max-width: 800px; margin: auto; box-shadow: 0 0 10px #aaa; }
                h2 { text-align: center; margin-bottom: 30px; }
                .stats { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 20px; }
                .stat { background: #e6f2ff; padding: 20px; border-radius: 10px; flex: 1; text-align: center; }
                .links a { margin: 10px 0; font-weight: bold; color: #0066cc; text-decoration: none; }
                .profile { margin: 10px 0; font-weight: bold; color:rgb(0, 0, 0); text-decoration: none; float: right; }  
              </style>
            </head>
            <body>
              <div class="container">
                <div class="profile"><a href="/dashboard/profile">👤 View profile</a><br><br></div>
                <h2>Welcome, ${user.username} (${user.role})</h2>
                <h2>📊 Yarn Inventory Dashboard</h2>
                <div class="stats">
                  <div class="stat">🧵 <strong>${stats.totalTypes}</strong><br>Yarn Types</div>
                  <div class="stat">📦 <strong>${stats.totalQty}</strong><br>Total Quantity</div>
                  <div class="stat">👥 <strong>${stats.totalSuppliers}</strong><br>Suppliers</div>
                  <div class="stat">🧾 <strong>${stats.totalRows}</strong><br>Total Entries</div>
                </div>
                <div class="links">
                  <a href="/add-stock">➕ Add Yarn Stock</a><br><br>
                  <a href="/stock-list">📦 View Yarn Stock</a><br><br>
                  ${isAdmin ? '<a href="/suppliers">👤 Manage Suppliers</a><br><br>' : '<a href="/suppliers">👤 View Suppliers</a><br><br>'}
                  <a href="/yarn-usage">📉 View Yarn Usage</a><br><br>
                  ${isAdmin ? '<a href="/logs">📋 View All User Logs</a><br><br>' : ''}
                  <form method="POST" action="/logout"><button>🚪 Logout</button></form>
                </div>
              </div>
            </body>
            </html>
          `;

          res.send(html);
        });
      });
    });
  });
});

app.get('/dashboard/profile', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  const user = req.session.user;

  let html = `
    <html>
      <head>
        <title>My Profile</title>
        <style>
          body { font-family: Arial; padding: 30px; background: #f2f2f2; }
          .card {
            background: white; padding: 20px; border-radius: 10px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.2); width: 400px; margin: auto;
          }
          h2 { text-align: center; }
          .info { margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>👤 My Profile</h2>
          <div class="info"><strong>Name:</strong> ${user.username || 'Guest'}</div>
          <div class="info"><strong>Email:</strong> ${user.email || ''}</div>
          <div class="info"><strong>Role:</strong> ${user.role || ''}</div>
          <div class="info"><strong>Joined:</strong> ${user.created_at || 'N/A'}</div>
          <hr>
          <a href="/dashboard">⬅️ Go to dashboard</a>
        </div>
      </body>
    </html>
  `;

  res.send(html);
});

app.post('/logout', (req, res) => {
  // after successful logout
  db.query(`INSERT INTO logs (user_id, user_name, action_type, table_name, description) VALUES (?, ?, 'logout', 'users', 'User logged out')`, [req.session.user.id, req.session.user.username]);
  req.session.destroy((err) => {
    if (err) return res.send('Logout failed');
    res.redirect('/login');
  });
});

app.get('/add-stock', (req, res) => {
  if (!req.session.user) return res.send('Access denied');
  // res.sendFile(__dirname + '/views/add-stock.html');
  res.redirect('/add-stock');
});

// Start server
// app.listen(port, () => {
//   console.log(`✅ Server running at http://localhost:${port}`);
// });

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

function isLoggedIn(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.send(`<p>⏳ Session expired. <a href="/login">Login again</a></p>`);
  }
}
