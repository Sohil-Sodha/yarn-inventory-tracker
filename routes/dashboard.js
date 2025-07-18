// Modules
const express = require('express');
const router = express.Router();
const db = require('../db/db');

const { isLoggedIn } = require('./auth'); // ✅ use middleware if needed

router.get('/', isLoggedIn, (req, res) => {
  const user = req.session.user;
  if (!user) return res.redirect('/login');

  const stats = {};

  db.query('SELECT COUNT(DISTINCT yarn_type) AS total_types FROM yarn_stock', (err1, result1) => {
    stats.totalTypes = result1[0].total_types;

    db.query('SELECT SUM(quantity) AS total_qty FROM yarn_stock', (err2, result2) => {
      stats.totalQty = result2[0].total_qty || 0;

      db.query('SELECT COUNT(DISTINCT supplier_name) AS total_suppliers FROM yarn_stock', (err3, result3) => {
        stats.totalSuppliers = result3[0].total_suppliers;

        db.query('SELECT COUNT(*) AS total_rows FROM yarn_stock', (err4, result4) => {
          stats.totalRows = result4[0].total_rows;

          const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Dashboard | Yarn Inventory Tracker</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 min-h-screen text-gray-800">

  <div class="max-w-5xl mx-auto p-6">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-3xl font-bold text-indigo-700">📊 Yarn Inventory Dashboard</h1>
        <p class="text-sm text-gray-600 mt-1">Welcome, <span class="font-semibold">${user.username}</span> (${user.role})</p>
      </div>
      <div>
        <a href="/dashboard/profile" class="text-sm text-indigo-600 hover:underline font-medium">👤 View Profile</a>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div class="bg-white rounded-xl shadow-md p-6 text-center">
        <div class="text-3xl">🧵</div>
        <p class="text-lg font-bold">${stats.totalTypes}</p>
        <p class="text-sm text-gray-500">Yarn Types</p>
      </div>

      <div class="bg-white rounded-xl shadow-md p-6 text-center">
        <div class="text-3xl">📦</div>
        <p class="text-lg font-bold">${stats.totalQty}</p>
        <p class="text-sm text-gray-500">Total Quantity</p>
      </div>

      <div class="bg-white rounded-xl shadow-md p-6 text-center">
        <div class="text-3xl">👥</div>
        <p class="text-lg font-bold">${stats.totalSuppliers}</p>
        <p class="text-sm text-gray-500">Suppliers</p>
      </div>

      <div class="bg-white rounded-xl shadow-md p-6 text-center">
        <div class="text-3xl">🧾</div>
        <p class="text-lg font-bold">${stats.totalRows}</p>
        <p class="text-sm text-gray-500">Total Entries</p>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-md p-6 space-y-4">
      <h2 class="text-xl font-semibold text-indigo-700 mb-2">📁 Navigation</h2>
      <ul class="space-y-2 text-sm font-medium">
        <li><a href="/stock/stock-list" class="text-indigo-600 hover:underline">📦 Yarn Stock</a></li>
        <li><a href="/suplier/suppliers" class="text-indigo-600 hover:underline">👥 Suppliers</a></li>
        <li><a href="/stock/yarn-usage" class="text-indigo-600 hover:underline">📉 Yarn Usage</a></li>
        ${user.role === "admin" ? '<li><a href="/logs/user-logs" class="text-indigo-600 hover:underline">📋 User Logs</a></li>' : ''}
      </ul>
      <form method="POST" action="/logout" class="pt-2">
        <button class="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition">🚪 Logout</button>
      </form>
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

router.get('/profile', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const user = req.session.user;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>My Profile</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-purple-100 via-indigo-100 to-pink-100 min-h-screen flex items-center justify-center">

  <div class="bg-white shadow-lg rounded-2xl max-w-md w-full p-6 mx-4">
    <h2 class="text-2xl font-bold text-indigo-700 text-center mb-6">👤 My Profile</h2>
    
    <div class="space-y-4 text-gray-700">
      <div><span class="font-semibold">Name:</span> ${user.username || 'Guest'}</div>
      <div><span class="font-semibold">Email:</span> ${user.email || 'Not provided'}</div>
      <div><span class="font-semibold">Role:</span> ${user.role || 'User'}</div>
      <div><span class="font-semibold">Joined:</span> ${user.created_at || 'N/A'}</div>
    </div>

    <hr class="my-6">

    <div class="text-center">
      <a href="/dashboard" class="text-indigo-600 hover:underline font-medium">⬅️ Go to Dashboard</a>
    </div>
  </div>

</body>
</html>
  `;

  res.send(html);
});

module.exports = router;