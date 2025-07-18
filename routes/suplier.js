const express = require('express');
const router = express.Router();
const db = require('../db/db');

function isAdmin(req) {
  return req.session.user && req.session.user.role === 'admin';
}

function isLoggedIn(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.send(`<p>⏳ Session expired. <a href="/login">Login again</a></p>`);
  }
}

router.get('/suppliers', isLoggedIn, (req, res) => {
  db.query('SELECT * FROM suppliers', (err, results) => {
    if (err) return res.send('DB Error');

    const role = req.session.user?.role || '';
    const username = req.session.user?.username || '';

    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Suppliers</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-gray-100 via-indigo-100 to-purple-100 min-h-screen text-gray-800">

  <!-- Header -->
  <div class="bg-indigo-700 text-white p-4 flex justify-between items-center">
    <div class="text-lg font-semibold">🧶 Yarn Inventory</div>
    <div class="text-sm">${username} (${role})</div>
  </div>

  <!-- Subnav -->
  <div class="bg-indigo-600 text-white px-4 py-2">
    <a href="/dashboard" class="hover:underline">⬅ Dashboard</a>
  </div>

  <!-- Main Content -->
  <div class="max-w-6xl mx-auto px-6 py-10">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-indigo-700">🏭 Supplier List</h2>
      ${role === 'admin' ? `<a href="/suplier/add-supplier" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">➕ Add Supplier</a>` : ''}
    </div>

    <div class="overflow-x-auto">
      <table class="min-w-full border border-gray-300 bg-white rounded shadow">
        <thead class="bg-indigo-100">
          <tr>
            <th class="px-4 py-2 border">ID</th>
            <th class="px-4 py-2 border">Name</th>
            <th class="px-4 py-2 border">Contact Person</th>
            <th class="px-4 py-2 border">Phone</th>
            <th class="px-4 py-2 border">Email</th>
            <th class="px-4 py-2 border">Address</th>
            <th class="px-4 py-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
    `;

    results.forEach(supplier => {
      html += `
          <tr class="hover:bg-gray-50">
            <td class="px-4 py-2 border text-center">${supplier.id}</td>
            <td class="px-4 py-2 border">${supplier.name}</td>
            <td class="px-4 py-2 border">${supplier.contact_person || '-'}</td>
            <td class="px-4 py-2 border">${supplier.phone || '-'}</td>
            <td class="px-4 py-2 border">${supplier.email || '-'}</td>
            <td class="px-4 py-2 border">${supplier.address || '-'}</td>
            <td class="px-4 py-2 border text-center">
              ${role === 'admin'
          ? `
                <a href="/suplier/edit-supplier/${supplier.id}" class="text-blue-600 hover:underline">Edit</a> |
                <a href="/suplier/delete-supplier/${supplier.id}" class="text-red-600 hover:underline" onclick="return confirm('Delete this supplier?')">Delete</a>
              `
          : '--'
        }
            </td>
          </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>
    `;

    res.send(html);
  });
});

router.get('/add-supplier', isLoggedIn, (req, res) => {
  if (!isAdmin(req)) return res.status(403).send('Access Denied');

  const role = req.session.user?.role || '';
  const username = req.session.user?.username || '';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Add New Supplier</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-gray-100 via-indigo-100 to-purple-100 min-h-screen text-gray-800">

  <!-- Header -->
  <div class="bg-indigo-700 text-white p-4 flex justify-between items-center">
    <div class="text-lg font-semibold">🧶 Yarn Inventory</div>
    <div class="text-sm">${username} (${role})</div>
  </div>

  <!-- Subnav -->
  <div class="bg-indigo-600 text-white px-4 py-2">
    <a href="/dashboard" class="hover:underline">⬅ Dashboard</a>
  </div>

  <!-- Form Card -->
  <div class="max-w-xl mx-auto p-6 mt-10 bg-white shadow-lg rounded">
    <h2 class="text-2xl font-bold text-indigo-700 mb-6">➕ Add New Supplier</h2>
    <form method="POST" action="/suplier/add-supplier" class="space-y-4">
      <div>
        <label class="block font-semibold">Supplier Name:</label>
        <input type="text" name="name" required class="input" placeholder="e.g. Shree Threads Pvt Ltd">
      </div>
      <div>
        <label class="block font-semibold">Contact Person:</label>
        <input type="text" name="contact_person" class="input" placeholder="e.g. Mr. Mehta">
      </div>
      <div>
        <label class="block font-semibold">Phone:</label>
        <input type="text" name="phone" class="input" placeholder="e.g. +91-9876543210">
      </div>
      <div>
        <label class="block font-semibold">Email:</label>
        <input type="email" name="email" class="input" placeholder="e.g. supplier@example.com">
      </div>
      <div>
        <label class="block font-semibold">Address:</label>
        <textarea name="address" class="input" rows="3" placeholder="e.g. GIDC, Ahmedabad, Gujarat"></textarea>
      </div>
      <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">Add Supplier</button>
    </form>
    <div class="mt-4">
      <a href="/suplier/suppliers" class="text-indigo-600 hover:underline">⬅ Back to Supplier List</a>
    </div>
  </div>

  <style>
    .input {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 0.5rem;
      outline: none;
      transition: border-color 0.3s;
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

router.post('/add-supplier', isLoggedIn, (req, res) => {
  if (!isAdmin(req)) return res.status(403).send('Access Denied');

  const { name, contact_person, phone, email, address } = req.body;

  db.query(
    'INSERT INTO suppliers (name, contact_person, phone, email, address) VALUES (?, ?, ?, ?, ?)',
    [name, contact_person, phone, email, address],
    (err) => {
      if (err) return res.send('Error inserting');
      res.redirect('/suplier/suppliers');
    }
  );
});

router.get('/edit-supplier/:id', isLoggedIn, (req, res) => {
  if (!isAdmin(req)) return res.status(403).send('Access Denied');

  const id = req.params.id;
  const role = req.session.user?.role || '';
  const username = req.session.user?.username || '';

  db.query('SELECT * FROM suppliers WHERE id = ?', [id], (err, results) => {
    if (err || results.length === 0) return res.send('Supplier not found');

    const s = results[0];

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Edit Supplier</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-gray-100 via-indigo-100 to-purple-100 min-h-screen text-gray-800">

  <!-- Header -->
  <div class="bg-indigo-700 text-white p-4 flex justify-between items-center">
    <div class="text-lg font-semibold">🧶 Yarn Inventory</div>
    <div class="text-sm">${username} (${role})</div>
  </div>

  <!-- Subnav -->
  <div class="bg-indigo-600 text-white px-4 py-2">
    <a href="/dashboard" class="hover:underline">⬅ Dashboard</a>
  </div>

  <!-- Form Card -->
  <div class="max-w-xl mx-auto p-6 mt-10 bg-white shadow-lg rounded">
    <h2 class="text-2xl font-bold text-indigo-700 mb-6">✏️ Edit Supplier</h2>
    <form method="POST" action="/suplier/edit-supplier/${id}" class="space-y-4">
      <div>
        <label class="block font-semibold">Supplier Name:</label>
        <input type="text" name="name" value="${s.name}" required class="input">
      </div>
      <div>
        <label class="block font-semibold">Contact Person:</label>
        <input type="text" name="contact_person" value="${s.contact_person || ''}" class="input">
      </div>
      <div>
        <label class="block font-semibold">Phone:</label>
        <input type="text" name="phone" value="${s.phone || ''}" class="input">
      </div>
      <div>
        <label class="block font-semibold">Email:</label>
        <input type="email" name="email" value="${s.email || ''}" class="input">
      </div>
      <div>
        <label class="block font-semibold">Address:</label>
        <textarea name="address" class="input" rows="3">${s.address || ''}</textarea>
      </div>
      <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">Update Supplier</button>
    </form>
    <div class="mt-4">
      <a href="/suplier/suppliers" class="text-indigo-600 hover:underline">⬅ Back to Supplier List</a>
    </div>
  </div>

  <style>
    .input {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 0.5rem;
      outline: none;
      transition: border-color 0.3s;
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

router.post('/edit-supplier/:id', isLoggedIn, (req, res) => {
  if (!isAdmin(req)) return res.status(403).send('Access Denied');

  const id = req.params.id;
  const { name, contact_person, phone, email, address } = req.body;

  db.query(
    'UPDATE suppliers SET name=?, contact_person=?, phone=?, email=?, address=? WHERE id=?',
    [name, contact_person, phone, email, address, id],
    (err) => {
      if (err) return res.send('Error updating');
      res.redirect('/suplier/suppliers');
    }
  );
});

router.get('/delete-supplier/:id', isLoggedIn, (req, res) => {
  if (!isAdmin(req)) return res.status(403).send('Access Denied');

  const id = req.params.id;

  db.query('DELETE FROM suppliers WHERE id = ?', [id], (err) => {
    if (err) return res.send('Error deleting');
    res.redirect('/suplier/suppliers');
  });
});

module.exports = router;