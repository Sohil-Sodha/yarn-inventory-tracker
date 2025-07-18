// Modules
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

// Global variables
const app = express();
const port = 3000;

// Routes
const { router: authRoutes } = require('./routes/auth');
const dashboardRoute = require('./routes/dashboard');
const stockRoute = require('./routes/stock');
const supplierRoute = require('./routes/suplier');
const logsRoute = require('./routes/logs');

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files  

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset maxAge on every response
  cookie: {
    maxAge: 10 * 60 * 1000  // ⏱️ 10 minutes
  }
}));

// app.use((req, res, next) => {
//   if (req.session) {
//     req.session._garbage = Date();
//     req.session.touch();
//   }
//   next();
// });

app.use('/', authRoutes);
app.use('/dashboard', dashboardRoute);
app.use('/stock', stockRoute);
app.use('/suplier', supplierRoute);
app.use('/logs', logsRoute);

app.get('/', (req, res) => {

  let html = `
  <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Yarn Inventory Tracker</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      background: linear-gradient(135deg, #1e1b4b, #312e81, #4f46e5);
      background-size: 200% 200%;
      animation: gradientShift 8s ease infinite;
    }
    @keyframes gradientShift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
  </style>
</head>
<body class="text-white min-h-screen flex items-center justify-center">

  <div class="text-center px-6 sm:px-10 max-w-3xl">
    <h1 class="text-4xl sm:text-6xl font-bold mb-6 leading-tight drop-shadow-xl">
      Yarn Inventory Tracker
    </h1>
    <p class="text-lg sm:text-xl text-gray-200 mb-8 leading-relaxed drop-shadow">
      Simplify your textile management with real-time tracking of yarn types, colors, quantities, and suppliers — all in one clean dashboard.
    </p>

    <a href="/login" class="inline-block bg-white text-indigo-800 font-semibold px-6 py-3 rounded-full shadow-lg hover:bg-indigo-200 transition duration-300 text-lg">
      Login
    </a>

    <p class="mt-12 text-sm text-gray-300">
      © 2025 Yarn Inventory System | Built by Sohil Sodha
    </p>
  </div>

</body>
</html>
  `;

  res.send(html);
});

// Start server
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});