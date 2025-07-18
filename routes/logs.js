const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { isAdmin, isLoggedIn } = require('./auth');

router.get('/user-logs', isAdmin, isLoggedIn, (req, res) => {
    const { username, action, table, from_date, to_date, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let filters = [];
    let params = [];

    if (username) {
        filters.push('u.username LIKE ?');
        params.push(`%${username}%`);
    }
    if (action) {
        filters.push('l.action_type = ?');
        params.push(action);
    }
    if (table) {
        filters.push('l.table_name = ?');
        params.push(table);
    }
    if (from_date) {
        filters.push('DATE(l.created_at) >= ?');
        params.push(from_date);
    }
    if (to_date) {
        filters.push('DATE(l.created_at) <= ?');
        params.push(to_date);
    }

    const whereClause = filters.length > 0 ? 'WHERE ' + filters.join(' AND ') : '';

    const sql = `
    SELECT l.*, u.username AS user_name
    FROM logs l
    JOIN users u ON u.id = l.user_id
    ${whereClause}
    ORDER BY l.created_at DESC
    LIMIT ? OFFSET ?
  `;

    params.push(Number(limit), Number(offset));

    db.query(sql, params, (err, results) => {
        const role = req.session.user?.role || '';
        const sessionUsername = req.session.user?.username || 'Guest';

        if (err) return res.send('❌ Error loading logs'), console.error('❌ SQL Error:', err);

        const queryParams = new URLSearchParams({
            username: username || '',
            action: action || '',
            table: table || '',
            from_date: from_date || '',
            to_date: to_date || '',
            limit
        });

        const nextPage = Number(page) + 1;
        const prevPage = Number(page) - 1;

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>User Logs</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-gray-100 via-indigo-100 to-purple-100 min-h-screen text-gray-800">

  <!-- Header -->
  <div class="bg-indigo-700 text-white p-4 flex justify-between items-center">
    <div class="text-lg font-semibold">🧶 Yarn Inventory</div>
    <div class="text-sm">${sessionUsername} (${role})</div>
  </div>

  <!-- Subnav -->
  <div class="bg-indigo-600 text-white px-4 py-2">
    <a href="/dashboard" class="hover:underline">⬅ Dashboard</a>
  </div>

  <div class="max-w-6xl mx-auto p-6">
    <h2 class="text-2xl font-bold text-indigo-700 mb-4">🧾 Admin - User Activity Logs</h2>

    <form method="get" class="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6 bg-white p-4 rounded shadow">
      <input name="username" placeholder="User" value="${username || ''}" class="input">
      <input name="action" placeholder="Action" value="${action || ''}" class="input">
      <input name="table" placeholder="Table" value="${table || ''}" class="input">
      <input name="from_date" type="date" value="${from_date || ''}" class="input">
      <input name="to_date" type="date" value="${to_date || ''}" class="input">
      <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">🔍 Filter</button>
    </form>

    <div class="overflow-x-auto">
      <table class="min-w-full bg-white border border-gray-300 shadow rounded">
        <thead class="bg-indigo-100">
          <tr>
            <th class="border px-4 py-2">Date</th>
            <th class="border px-4 py-2">User</th>
            <th class="border px-4 py-2">Action</th>
            <th class="border px-4 py-2">Table</th>
            <th class="border px-4 py-2">Details</th>
          </tr>
        </thead>
        <tbody>
          ${results.map(log => `
            <tr class="hover:bg-gray-50">
              <td class="border px-4 py-2">${log.created_at}</td>
              <td class="border px-4 py-2">${log.user_name}</td>
              <td class="border px-4 py-2">${log.action_type}</td>
              <td class="border px-4 py-2">${log.table_name}</td>
              <td class="border px-4 py-2">${log.description}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="mt-6 flex justify-between items-center">
      ${page > 1 ? `<a href="/logs/user-logs?${queryParams.toString()}&page=${prevPage}" class="text-indigo-600 hover:underline">⬅️ Previous</a>` : '<span></span>'}
      <span class="font-medium text-gray-700">Page ${page}</span>
      ${results.length === Number(limit) ? `<a href="/logs/user-logs?${queryParams.toString()}&page=${nextPage}" class="text-indigo-600 hover:underline">Next ➡️</a>` : '<span></span>'}
    </div>
  </div>

  <style>
    .input {
      padding: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 0.375rem;
      outline: none;
      width: 100%;
    }
    .input:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
    }
  </style>
</body>
</html>
    `;

        res.send(html);
    });
});

module.exports = router;