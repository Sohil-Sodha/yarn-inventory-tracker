const express = require('express');
const router = express.Router();
const db = require('../db/db');

const { isAdmin } = require('./auth');

function isLoggedIn(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.send(`<p>⏳ Session expired. <a href="/login">Login again</a></p>`);
  }
}

const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

const upload = multer({ dest: 'uploads/' });

const { createObjectCsvWriter } = require('csv-writer');

const transporter = require('../utils/mailer');

router.get('/add-stock', isLoggedIn, (req, res) => {
  const role = req.session.user?.role || '';
  const username = req.session.user?.username || 'Guest';

  db.query('SELECT name FROM suppliers ORDER BY name', (err, suppliers) => {
    if (err) return res.send('DB error');

    const options = suppliers.map(s => `<option value="${s.name}">${s.name}</option>`).join('');

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Add Yarn Stock</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 min-h-screen text-gray-800">

  <!-- Navbar -->
  <div class="bg-indigo-700 text-white p-4 flex justify-between items-center">
    <div class="text-lg font-semibold">🧶 Yarn Inventory</div>
    <div class="text-sm">${username} (${role})</div>
  </div>
  <div class="bg-indigo-600 text-white px-4 py-2">
    <a href="/dashboard" class="hover:underline">⬅ Dashboard</a>
  </div>

  <div class="max-w-3xl mx-auto my-10 bg-white p-6 rounded-2xl shadow-lg">
    <h2 class="text-2xl font-bold text-indigo-700 mb-6">➕ Add Yarn Stock</h2>
    <form method="POST" action="/stock/add-stock" class="grid grid-cols-1 gap-4">
      <input type="text" name="yarn_type" placeholder="Yarn Type" required class="input"/>
      <input type="text" name="color" placeholder="Color" required class="input"/>
      <input type="number" name="quantity" placeholder="Quantity" required class="input"/>
      <input type="text" name="unit" placeholder="Unit (e.g., kg)" required class="input"/>
      <input type="date" name="date_received" required class="input"/>

      <label class="text-sm font-semibold text-gray-600 mt-4">Supplier</label>
      <select name="supplier_name" required class="input">
        <option value="">-- Select Supplier --</option>
        ${options}
      </select>

      <button type="submit" class="bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 transition">➕ Add Yarn</button>
    </form>
  </div>

  <div class="max-w-3xl mx-auto my-10 bg-white p-6 rounded-2xl shadow-lg">
    <h2 class="text-xl font-bold text-indigo-700 mb-4">📥 Import Yarn Data (CSV)</h2>
    <form method="POST" action="/stock/upload-csv" enctype="multipart/form-data" class="space-y-4">
      <input type="file" name="csvfile" accept=".csv" required class="input" />
      <button type="submit" class="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition">📤 Upload CSV</button>
    </form>
  </div>

  <div class="text-center mt-4 mb-10">
    <a href="/stock/stock-list" class="text-indigo-600 font-medium hover:underline">📦 View Stock List</a>
  </div>

  <style>
    .input {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid #ccc;
      border-radius: 0.5rem;
      outline: none;
      transition: 0.3s;
    }
    .input:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
    }
  </style>

</body>
</html>
    `;

    res.send(html);
  });
});

router.post('/add-stock', isLoggedIn, (req, res) => {
  const role = req.session.user?.role || '';
  const username = req.session.user?.username || 'Guest';

  const { yarn_type, color, quantity, unit, date_received, supplier_name } = req.body;

  const sql = `
    INSERT INTO yarn_stock (yarn_type, color, quantity, unit, date_received, supplier_name)
    VALUES (?, ?, ?, ?, ?, ?)`;

  db.query(sql, [yarn_type, color, quantity, unit, date_received, supplier_name], (err, result) => {
    const status = err ? 'error' : 'success';
    const message = err
      ? '❌ Failed to save yarn stock. Please try again.'
      : '✅ Yarn stock added successfully!';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Add Stock Result</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 min-h-screen text-gray-800">

  <!-- Navbar -->
  <div class="bg-indigo-700 text-white p-4 flex justify-between items-center">
    <div class="text-lg font-semibold">🧶 Yarn Inventory</div>
    <div class="text-sm">${username} (${role})</div>
  </div>
  <div class="bg-indigo-600 text-white px-4 py-2">
    <a href="/dashboard" class="hover:underline">⬅ Dashboard</a>
  </div>

  <!-- Message Box -->
  <div class="max-w-xl mx-auto mt-16 bg-white rounded-xl shadow-lg p-6 text-center">
    <h2 class="text-2xl font-bold mb-4 ${status === 'success' ? 'text-green-600' : 'text-red-600'}">
      ${message}
    </h2>

    <div class="mt-6 space-y-3">
      <a href="/stock/add-stock" class="inline-block bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition">➕ Add More Yarn</a>
      <a href="/stock/stock-list" class="inline-block text-indigo-600 hover:underline">📦 View Yarn Stock</a>
    </div>
  </div>

</body>
</html>
    `;

    res.send(html);
  });
});

router.post('/upload-csv', isAdmin, isLoggedIn, upload.single('csvfile'), (req, res) => {
  const filePath = req.file.path;
  const yarnEntries = [];

  const role = req.session.user?.role || '';
  const username = req.session.user?.username || 'Guest';

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      yarnEntries.push([
        row.yarn_type,
        row.color,
        row.quantity,
        row.unit,
        row.date_received,
        row.supplier_name
      ]);
    })
    .on('end', () => {
      const insertSQL = `
        INSERT INTO yarn_stock 
        (yarn_type, color, quantity, unit, date_received, supplier_name) 
        VALUES ?`;

      db.query(insertSQL, [yarnEntries], (err) => {
        fs.unlinkSync(filePath); // Delete the uploaded file

        const status = err ? 'error' : 'success';
        const message = err
          ? '❌ CSV import failed! Please check the format or data.'
          : '✅ CSV data imported successfully!';

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>CSV Upload Result</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-purple-100 via-indigo-100 to-pink-100 min-h-screen text-gray-800">

  <!-- Navbar -->
  <div class="bg-indigo-700 text-white p-4 flex justify-between items-center">
    <div class="text-lg font-semibold">🧶 Yarn Inventory</div>
    <div class="text-sm">${username} (${role})</div>
  </div>
  <div class="bg-indigo-600 text-white px-4 py-2">
    <a href="/dashboard" class="hover:underline">⬅ Dashboard</a>
  </div>

  <!-- Message -->
  <div class="max-w-xl mx-auto mt-16 bg-white rounded-xl shadow-lg p-6 text-center">
    <h2 class="text-2xl font-bold mb-4 ${status === 'success' ? 'text-green-600' : 'text-red-600'}">
      ${message}
    </h2>

    <div class="mt-6 space-y-3">
      <a href="/stock/add-stock" class="inline-block bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition">➕ Add More Stock</a>
      <a href="/stock/stock-list" class="inline-block text-indigo-600 hover:underline">📦 View Yarn Stock</a>
    </div>
  </div>

</body>
</html>
        `;

        res.send(html);
      });
    });
});

router.get('/stock-list', isLoggedIn, (req, res) => {
  const search = req.query.search || '';
  const sortBy = req.query.sort || 'id';
  const selectedSupplier = req.query.supplier_name || '';
  const username = req.session.user?.username || 'Guest';
  const role = req.session.user?.role || '';
  const limit = 10;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;

  const sortOptions = [
    { value: 'id', label: 'ID' },
    { value: 'quantity', label: 'Quantity' },
    { value: 'date_received', label: 'Date Received' },
    { value: 'yarn_type', label: 'Yarn Type' }
  ];

  db.query('SELECT DISTINCT supplier_name FROM yarn_stock ORDER BY supplier_name', (err, supplierRows) => {
    if (err) return res.send('Supplier Load Error');

    let sql = 'SELECT * FROM yarn_stock';
    let countSql = 'SELECT COUNT(*) AS count FROM yarn_stock';
    let conditions = [];
    let values = [];

    if (search) {
      conditions.push('(yarn_type LIKE ? OR color LIKE ?)');
      const term = `%${search}%`;
      values.push(term, term);
    }

    if (selectedSupplier) {
      conditions.push('supplier_name = ?');
      values.push(selectedSupplier);
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      sql += whereClause;
      countSql += whereClause;
    }

    const allowedSorts = {
      id: 'id',
      quantity: 'quantity',
      date_received: 'date_received',
      yarn_type: 'yarn_type'
    };
    const sortColumn = allowedSorts[sortBy] || 'date_received';
    sql += ` ORDER BY ${sortColumn} DESC LIMIT ? OFFSET ?`;

    db.query(countSql, values, (err, countResult) => {
      if (err) return res.send('Database Count Error');
      const totalRows = countResult[0].count;
      const totalPages = Math.ceil(totalRows / limit);

      db.query(sql, [...values, limit, offset], (err, results) => {
        if (err) return res.send('Database error');

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Yarn Stock List</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-purple-100 via-indigo-100 to-pink-100 min-h-screen text-gray-800">
  <div class="bg-indigo-700 text-white p-4 flex justify-between items-center">
    <div class="text-lg font-semibold">🧶 Yarn Inventory</div>
    <div class="text-sm">${username} (${role})</div>
  </div>
  <div class="bg-indigo-600 text-white px-4 py-2">
    <a href="/dashboard" class="hover:underline">⬅ Dashboard</a>
  </div>
  <div class="max-w-6xl mx-auto p-4">
    <div class="flex flex-col sm:flex-row justify-between items-center mb-4">
      <h2 class="text-2xl font-bold text-indigo-700 mb-4 sm:mb-0">📦 Yarn Stock List</h2>
      <a href="/stock/add-stock" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition">➕ Add Yarn Stock</a>
    </div>
    <form method="GET" action="/stock/stock-list" class="bg-white p-4 rounded shadow-md grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <input type="text" name="search" placeholder="🔍 Search by type or color" value="${search}" class="input" />
      <select name="sort" onchange="this.form.submit()" class="input">
        ${sortOptions.map(opt => `<option value="${opt.value}" ${sortBy === opt.value ? 'selected' : ''}>Sort by: ${opt.label}</option>`).join('')}
      </select>
      <select name="supplier_name" onchange="this.form.submit()" class="input">
        <option value="">-- All Suppliers --</option>
        ${supplierRows.map(s => `<option value="${s.supplier_name}" ${s.supplier_name === selectedSupplier ? 'selected' : ''}>${s.supplier_name}</option>`).join('')}
      </select>
    </form>
    <div class="overflow-x-auto bg-white rounded shadow-md">
      <table class="w-full text-sm text-left border border-gray-300">
        <thead class="bg-indigo-100 text-gray-800">
          <tr>
            <th class="px-4 py-2">ID</th>
            <th class="px-4 py-2">Type</th>
            <th class="px-4 py-2">Color</th>
            <th class="px-4 py-2">Qty</th>
            <th class="px-4 py-2">Unit</th>
            <th class="px-4 py-2">Date</th>
            <th class="px-4 py-2">Supplier</th>
            <th class="px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${results.length === 0 ? `<tr><td colspan="8" class="text-center p-4">No stock items found</td></tr>` : results.map(stock => `
            <tr class="border-t">
              <td class="px-4 py-2">${stock.id}</td>
              <td class="px-4 py-2">${stock.yarn_type}</td>
              <td class="px-4 py-2">${stock.color}</td>
              <td class="px-4 py-2">${stock.quantity}</td>
              <td class="px-4 py-2">${stock.unit}</td>
              <td class="px-4 py-2">${stock.date_received}</td>
              <td class="px-4 py-2">${stock.supplier_name}</td>
              <td class="px-4 py-2 space-x-2">
                <a href="/stock/use-yarn/${stock.id}" class="text-blue-600 hover:underline">📤 Use</a>
                ${role === 'admin' ? `
                <a href="/stock/edit-stock/${stock.id}" class="text-green-600 hover:underline">Edit</a>
                <a href="/stock/delete-stock/${stock.id}" class="text-red-600 hover:underline" onclick="return confirm('Delete this stock?')">Delete</a>` : `<span class="text-gray-500">View only</span>`}
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="mt-6 flex justify-between items-center text-sm">
      ${page > 1 ? `<a href="/stock/stock-list?page=${page - 1}&search=${search}&sort=${sortBy}&supplier_name=${selectedSupplier}" class="text-indigo-600 hover:underline">⬅ Previous</a>` : '<span></span>'}
      Page ${page} of ${totalPages}
      ${page < totalPages ? `<a href="/stock/stock-list?page=${page + 1}&search=${search}&sort=${sortBy}&supplier_name=${selectedSupplier}" class="text-indigo-600 hover:underline">Next ➡</a>` : '<span></span>'}
    </div>
    <div class="mt-8 space-y-3">
      <form method="GET" action="/stock/stock-list/export">
        <input type="hidden" name="supplier_name" value="${selectedSupplier}">
        <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">⬇ Export CSV</button>
      </form><br>
      <a href="/stock/stock-list/report?supplier_name=${encodeURIComponent(selectedSupplier)}&search=${encodeURIComponent(search)}" target="_blank">
        <button class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">📄 Generate Report</button>
      </a>
      ${role === 'admin' ? `<a href="/stock/email-stock-report"><button class="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">📩 Email Stock Report</button></a>` : ''}
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
</html>`;

        res.send(html);
      });
    });
  });
});

router.get('/use-yarn/:id', isLoggedIn, (req, res) => {
  const id = req.params.id;

  db.query('SELECT * FROM yarn_stock WHERE id = ?', [id], (err, result) => {
    if (err || result.length === 0) return res.send('Yarn not found');

    const yarn = result[0];

    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Use Yarn</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 min-h-screen text-gray-800">
  <div class="bg-indigo-700 text-white p-4 flex justify-between items-center">
    <div class="text-lg font-semibold">🧶 Yarn Inventory</div>
    <a href="/dashboard" class="text-sm hover:underline">⬅ Dashboard</a>
  </div>
  <div class="max-w-xl mx-auto p-6 mt-10 bg-white shadow-lg rounded">
    <h2 class="text-2xl font-bold text-indigo-700 mb-4">Use Yarn</h2>
    <p class="mb-4">Yarn Type: <strong>${yarn.yarn_type}</strong><br>Color: <strong>${yarn.color}</strong><br>Available: <strong>${yarn.quantity} ${yarn.unit}</strong></p>

    <form method="POST" action="/stock/use-yarn/${id}" class="space-y-4">
      <div>
        <label class="block font-semibold">Used Quantity:</label>
        <input type="number" name="used_quantity" max="${yarn.quantity}" step="0.01" required class="input">
      </div>

      <div>
        <label class="block font-semibold">Used By:</label>
        <input type="text" name="used_by" required class="input">
      </div>

      <div>
        <label class="block font-semibold">Purpose:</label>
        <textarea name="purpose" class="input" rows="3"></textarea>
      </div>

      <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">Submit Usage</button>
    </form>
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
    `);
  });
});

router.post('/use-yarn/:id', isLoggedIn, (req, res) => {
  const id = req.params.id;
  const { used_quantity, used_by, purpose } = req.body;

  // Step 1: Check available quantity
  db.query('SELECT quantity FROM yarn_stock WHERE id = ?', [id], (err, result) => {
    if (err || result.length === 0) return res.send('Yarn not found');

    const currentQty = parseFloat(result[0].quantity);
    const usedQty = parseFloat(used_quantity);

    if (usedQty > currentQty) {
      return res.send('Error: Not enough stock available');
    }

    // Step 2: Insert usage record
    db.query('INSERT INTO yarn_usage (yarn_id, used_quantity, used_by, purpose) VALUES (?, ?, ?, ?)',
      [id, usedQty, used_by, purpose],
      (err2) => {
        if (err2) return res.send('Failed to record usage');

        // Step 3: Update stock quantity
        db.query('UPDATE yarn_stock SET quantity = quantity - ? WHERE id = ?', [usedQty, id]);

        // Step 4: Log activity
        // logActivity(db, req.session.user, 'Use Yarn', id, 'yarn_usage', `Used ${usedQty} units by ${used_by}`);

        req.session.message = { type: 'success', text: 'Yarn usage recorded!' };
        res.redirect('/stock/stock-list');
      }
    );
  });
});

router.get('/edit-stock/:id', isAdmin, isLoggedIn, (req, res) => {
  const stockId = req.params.id;
  const username = req.session.user?.username || 'Guest';
  const role = req.session.user?.role || '';

  db.query('SELECT * FROM yarn_stock WHERE id = ?', [stockId], (err, results) => {
    if (err || results.length === 0) {
      return res.send('Stock not found');
    }

    const stock = results[0];

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Edit Yarn Stock</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-gray-100 via-indigo-100 to-purple-100 min-h-screen text-gray-800">
  <div class="bg-indigo-700 text-white p-4 flex justify-between items-center">
    <div class="text-lg font-semibold">🧶 Yarn Inventory</div>
    <div class="text-sm">${username} (${role})</div>
  </div>
  <div class="bg-indigo-600 text-white px-4 py-2">
    <a href="/dashboard" class="hover:underline">⬅ Dashboard</a>
  </div>

  <div class="max-w-xl mx-auto p-6 mt-10 bg-white shadow-lg rounded">
    <h2 class="text-2xl font-bold text-indigo-700 mb-6">✏️ Edit Yarn Stock</h2>
    <form action="/stock/update-stock/${stock.id}" method="POST" class="space-y-4">
      <div>
        <label class="block font-semibold">Yarn Type:</label>
        <input type="text" name="yarn_type" value="${stock.yarn_type}" required class="input">
      </div>
      <div>
        <label class="block font-semibold">Color:</label>
        <input type="text" name="color" value="${stock.color}" required class="input">
      </div>
      <div>
        <label class="block font-semibold">Quantity:</label>
        <input type="number" name="quantity" value="${stock.quantity}" required class="input">
      </div>
      <div>
        <label class="block font-semibold">Unit:</label>
        <input type="text" name="unit" value="${stock.unit}" required class="input">
      </div>
      <div>
        <label class="block font-semibold">Date Received:</label>
        <input type="date" name="date_received" value="${stock.date_received.toISOString().slice(0, 10)}" required class="input">
      </div>
      <div>
        <label class="block font-semibold">Supplier Name:</label>
        <input type="text" name="supplier_name" value="${stock.supplier_name || ''}" class="input">
      </div>
      <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">Update</button>
    </form>
    <div class="mt-4">
      <a href="/stock/stock-list" class="text-indigo-600 hover:underline">⬅ Back to Stock List</a>
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

router.get('/delete-stock/:id', isAdmin, isLoggedIn, (req, res) => {
  const stockId = req.params.id;

  db.query('DELETE FROM yarn_stock WHERE id = ?', [stockId], (err, result) => {
    if (err) {
      console.error('❌ Delete Error:', err);
      return res.send('Failed to delete stock');
    }

    console.log(`✅ Deleted stock ID: ${stockId}`);
    res.redirect('/stock/stock-list');
  });
});

router.post('/update-stock/:id', isAdmin, isLoggedIn, (req, res) => {
  const stockId = req.params.id;
  const { yarn_type, color, quantity, unit, date_received, supplier_name } = req.body;

  const sql = `
    UPDATE yarn_stock
    SET yarn_type = ?, color = ?, quantity = ?, unit = ?, date_received = ?, supplier_name = ?
    WHERE id = ?
  `;

  db.query(sql, [yarn_type, color, quantity, unit, date_received, supplier_name, stockId], (err, result) => {
    if (err) {
      console.error('❌ Update Error:', err);
      return res.send('Failed to update stock');
    }

    console.log(`✅ Updated stock ID: ${stockId}`);
    res.redirect('/stock/stock-list');
  });
});

router.get('/edit-stock/:id', isAdmin, isLoggedIn, (req, res) => {
  const stockId = req.params.id;
  const username = req.session.user?.username || 'Guest';
  const role = req.session.user?.role || '';

  db.query('SELECT * FROM yarn_stock WHERE id = ?', [stockId], (err, results) => {
    if (err || results.length === 0) {
      return res.send('Stock not found');
    }

    const stock = results[0];

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Edit Yarn Stock</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-gray-100 via-indigo-100 to-purple-100 min-h-screen text-gray-800">
  <div class="bg-indigo-700 text-white p-4 flex justify-between items-center">
    <div class="text-lg font-semibold">🧶 Yarn Inventory</div>
    <div class="text-sm">${username} (${role})</div>
  </div>
  <div class="bg-indigo-600 text-white px-4 py-2">
    <a href="/dashboard" class="hover:underline">⬅ Dashboard</a>
  </div>

  <div class="max-w-xl mx-auto p-6 mt-10 bg-white shadow-lg rounded">
    <h2 class="text-2xl font-bold text-indigo-700 mb-6">✏️ Edit Yarn Stock</h2>
    <form action="/stock/update-stock/${stock.id}" method="POST" class="space-y-4">
      <div>
        <label class="block font-semibold">Yarn Type:</label>
        <input type="text" name="yarn_type" value="${stock.yarn_type}" required class="input">
      </div>
      <div>
        <label class="block font-semibold">Color:</label>
        <input type="text" name="color" value="${stock.color}" required class="input">
      </div>
      <div>
        <label class="block font-semibold">Quantity:</label>
        <input type="number" name="quantity" value="${stock.quantity}" required class="input">
      </div>
      <div>
        <label class="block font-semibold">Unit:</label>
        <input type="text" name="unit" value="${stock.unit}" required class="input">
      </div>
      <div>
        <label class="block font-semibold">Date Received:</label>
        <input type="date" name="date_received" value="${stock.date_received.toISOString().slice(0, 10)}" required class="input">
      </div>
      <div>
        <label class="block font-semibold">Supplier Name:</label>
        <input type="text" name="supplier_name" value="${stock.supplier_name || ''}" class="input">
      </div>
      <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">Update</button>
    </form>
    <div class="mt-4">
      <a href="/stock/stock-list" class="text-indigo-600 hover:underline">⬅ Back to Stock List</a>
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

router.get('/stock-list/report', isLoggedIn, (req, res) => {
  db.query('SELECT * FROM yarn_stock ORDER BY date_received DESC', (err, rows) => {
    if (err) return res.send('DB Error');

    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Yarn Stock Report</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {
      .print-btn { display: none; }
    }
  </style>
</head>
<body class="bg-white text-gray-800 p-6">
  <div class="print-btn flex justify-end mb-4">
    <button onclick="window.print()" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">🖨️ Print / Save as PDF</button>
  </div>
  <h2 class="text-3xl font-bold text-center text-indigo-700 mb-6">🧶 Yarn Stock Report</h2>
  <div class="overflow-x-auto">
    <table class="min-w-full border border-gray-300">
      <thead class="bg-indigo-100">
        <tr>
          <th class="border px-4 py-2">ID</th>
          <th class="border px-4 py-2">Yarn Type</th>
          <th class="border px-4 py-2">Color</th>
          <th class="border px-4 py-2">Quantity</th>
          <th class="border px-4 py-2">Unit</th>
          <th class="border px-4 py-2">Date Received</th>
          <th class="border px-4 py-2">Supplier</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => `
        <tr>
          <td class="border px-4 py-2">${row.id}</td>
          <td class="border px-4 py-2">${row.yarn_type}</td>
          <td class="border px-4 py-2">${row.color}</td>
          <td class="border px-4 py-2">${row.quantity}</td>
          <td class="border px-4 py-2">${row.unit}</td>
          <td class="border px-4 py-2">${row.date_received}</td>
          <td class="border px-4 py-2">${row.supplier_name}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>
    `;

    res.send(html);
  });
});

router.get('/stock-list/export', isLoggedIn, (req, res) => {
  const { supplier_name } = req.query;

  let query = 'SELECT * FROM yarn_stock';
  let params = [];

  if (supplier_name) {
    query += ' WHERE supplier_name = ?';
    params.push(supplier_name);
  }

  query += ' ORDER BY date_received DESC';

  db.query(query, params, (err, rows) => {
    if (err) return res.send('CSV Export Error');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="yarn_stock.csv"');

    let csv = 'ID,Yarn Type,Color,Quantity,Unit,Date Received,Supplier Name\n';

    rows.forEach(r => {
      csv += `"${r.id}","${r.yarn_type}","${r.color}","${r.quantity}","${r.unit}","${r.date_received}","${r.supplier_name}"\n`;
    });

    res.send(csv);
  });
});

router.get('/yarn-usage', isLoggedIn, (req, res) => {
  const username = req.session.user?.username || 'Guest';
  const role = req.session.user?.role || '';
  const { yarn_type, used_by, from_date, to_date } = req.query;
  const limit = 10;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;

  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Yarn Usage History</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-gray-100 via-purple-100 to-indigo-100 text-gray-800 min-h-screen">
  <div class="bg-indigo-700 text-white p-4 flex justify-between">
    <div class="text-lg font-semibold">🧶 Yarn Inventory</div>
    <div class="text-sm">${username} (${role})</div>
  </div>
  <div class="bg-indigo-600 text-white px-4 py-2">
    <a href="/dashboard" class="hover:underline">⬅ Dashboard</a>
  </div>

  <div class="max-w-7xl mx-auto p-6">
    <h2 class="text-2xl font-bold text-indigo-700 mb-4">🧾 Yarn Usage History</h2>

    <form method="GET" class="flex flex-wrap gap-4 mb-6 bg-white p-4 rounded shadow">
      <input type="text" name="yarn_type" placeholder="Yarn Type" value="${yarn_type || ''}" class="input w-48">
      <input type="text" name="used_by" placeholder="Used By" value="${used_by || ''}" class="input w-48">
      <input type="date" name="from_date" value="${from_date || ''}" class="input w-44">
      <input type="date" name="to_date" value="${to_date || ''}" class="input w-44">
      <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">🔍 Filter</button>
    </form>
`;

  let query = `
    SELECT y.yarn_type, y.color, u.* 
    FROM yarn_usage u 
    JOIN yarn_stock y ON u.yarn_id = y.id 
    WHERE 1`;
  let countQuery = `
    SELECT COUNT(*) AS count
    FROM yarn_usage u 
    JOIN yarn_stock y ON u.yarn_id = y.id 
    WHERE 1`;
  const params = [];
  const countParams = [];

  if (yarn_type) {
    query += ' AND y.yarn_type LIKE ?';
    countQuery += ' AND y.yarn_type LIKE ?';
    params.push(`%${yarn_type}%`);
    countParams.push(`%${yarn_type}%`);
  }
  if (used_by) {
    query += ' AND u.used_by LIKE ?';
    countQuery += ' AND u.used_by LIKE ?';
    params.push(`%${used_by}%`);
    countParams.push(`%${used_by}%`);
  }
  if (from_date) {
    query += ' AND u.used_on >= ?';
    countQuery += ' AND u.used_on >= ?';
    params.push(from_date);
    countParams.push(from_date);
  }
  if (to_date) {
    query += ' AND u.used_on <= ?';
    countQuery += ' AND u.used_on <= ?';
    params.push(to_date);
    countParams.push(to_date);
  }

  query += ' ORDER BY u.used_on DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  db.query(countQuery, countParams, (err, countResult) => {
    if (err) return res.send('Failed to count usage history');

    const totalRows = countResult[0].count;
    const totalPages = Math.ceil(totalRows / limit);

    db.query(query, params, (err, rows) => {
      if (err) return res.send('Failed to load usage history');

      html += `
      <div class="overflow-x-auto">
        <table class="min-w-full table-auto border border-gray-300 bg-white shadow-sm">
          <thead class="bg-indigo-100">
            <tr>
              <th class="border px-4 py-2">ID</th>
              <th class="border px-4 py-2">Yarn</th>
              <th class="border px-4 py-2">Used Quantity</th>
              <th class="border px-4 py-2">Used By</th>
              <th class="border px-4 py-2">Purpose</th>
              <th class="border px-4 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
      `;

      if (rows.length === 0) {
        html += `<tr><td colspan="6" class="text-center px-4 py-4">No usage records found</td></tr>`;
      } else {
        rows.forEach(r => {
          html += `
          <tr>
            <td class="border px-4 py-2">${r.id}</td>
            <td class="border px-4 py-2">${r.yarn_type} (${r.color})</td>
            <td class="border px-4 py-2">${r.used_quantity}</td>
            <td class="border px-4 py-2">${r.used_by}</td>
            <td class="border px-4 py-2">${r.purpose}</td>
            <td class="border px-4 py-2">${r.used_on}</td>
          </tr>
          `;
        });
      }

      html += `
          </tbody>
        </table>
      </div><br>`;

      // Pagination
      html += `<div class="mt-4 flex justify-between">`;
      if (page > 1) {
        html += `<a href="/stock/yarn-usage?page=${page - 1}&yarn_type=${encodeURIComponent(yarn_type || '')}&used_by=${encodeURIComponent(used_by || '')}&from_date=${encodeURIComponent(from_date || '')}&to_date=${encodeURIComponent(to_date || '')}" class="text-indigo-600 hover:underline">⬅️ Previous</a>`;
      } else {
        html += `<span></span>`;
      }

      if (page < totalPages) {
        html += `<a href="/stock/yarn-usage?page=${page + 1}&yarn_type=${encodeURIComponent(yarn_type || '')}&used_by=${encodeURIComponent(used_by || '')}&from_date=${encodeURIComponent(from_date || '')}&to_date=${encodeURIComponent(to_date || '')}" class="text-indigo-600 hover:underline">Next ➡️</a>`;
      }

      html += `</div><br>`;

      html += `
      <div class="flex gap-4 mt-6">
        <a href="/stock/export-usage" target="_blank">
          <button class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">📤 Export Usage CSV</button>
        </a>
        <a href="/stock/usage-graph" target="_blank">
          <button class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">📊 View Usage Chart</button>
        </a>
      </div>
    </div>

  <style>
    .input {
      padding: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 0.5rem;
      outline: none;
    }
    .input:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
    }
  </style>

</body>
</html>`;

      res.send(html);
    });
  });
});

router.get('/export-usage', isLoggedIn, (req, res) => {
  const sql = `
    SELECT u.id, y.yarn_type, y.color, u.used_quantity, u.used_by, u.purpose, u.used_on 
    FROM yarn_usage u
    JOIN yarn_stock y ON y.id = u.yarn_id
  `;

  db.query(sql, (err, rows) => {
    if (err) return res.send('Export failed');

    const filePath = './exports/yarn_usage.csv';

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'id', title: 'ID' },
        { id: 'yarn_type', title: 'Yarn Type' },
        { id: 'color', title: 'Color' },
        { id: 'used_quantity', title: 'Used Quantity' },
        { id: 'used_by', title: 'Used By' },
        { id: 'purpose', title: 'Purpose' },
        { id: 'used_on', title: 'Used On' }
      ]
    });

    csvWriter.writeRecords(rows)
      .then(() => {
        res.download(filePath, 'yarn_usage.csv');
      });
  });
});

router.get('/usage-graph', isLoggedIn, (req, res) => {
  const sql = `
    SELECT y.yarn_type, SUM(u.used_quantity) AS total 
    FROM yarn_usage u 
    JOIN yarn_stock y ON y.id = u.yarn_id 
    GROUP BY y.yarn_type
  `;

  db.query(sql, (err, result) => {
    if (err) return res.send('Error loading chart data');

    const labels = result.map(row => row.yarn_type);
    const data = result.map(row => row.total);

    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Yarn Usage Chart</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body class="bg-gradient-to-br from-gray-100 via-purple-100 to-indigo-100 min-h-screen text-gray-800">

  <div class="bg-indigo-700 text-white p-4 flex justify-between items-center">
    <div class="text-lg font-semibold">🧶 Yarn Inventory</div>
    <a href="/stock/yarn-usage" class="text-sm hover:underline">⬅ Back to Usage List</a>
  </div>

  <div class="max-w-4xl mx-auto mt-12 bg-white rounded shadow-lg p-6">
    <h2 class="text-2xl font-bold text-center text-indigo-700 mb-6">📊 Yarn Usage by Type</h2>
    <canvas id="usageChart" height="120"></canvas>
  </div>

  <script>
    const ctx = document.getElementById('usageChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(labels)},
        datasets: [{
          label: 'Total Used Quantity',
          data: ${JSON.stringify(data)},
          backgroundColor: 'rgba(99, 102, 241, 0.6)',
          borderColor: 'rgba(99, 102, 241, 1)',
          borderWidth: 1,
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#333' }
          },
          title: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: '#4B5563'
            }
          },
          x: {
            ticks: {
              color: '#4B5563'
            }
          }
        }
      }
    });
  </script>

</body>
</html>
    `);
  });
});

router.get('/email-stock-report', (req, res) => {
  const sql = 'SELECT * FROM yarn_stock';

  db.query(sql, (err, rows) => {
    if (err) return res.send('Error generating report');

    const filePath = './exports/yarn_stock.csv';
    const csvWriter = require('csv-writer').createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'id', title: 'ID' },
        { id: 'yarn_type', title: 'Yarn Type' },
        { id: 'color', title: 'Color' },
        { id: 'quantity', title: 'Quantity' },
        { id: 'unit', title: 'Unit' },
        { id: 'date_received', title: 'Date Received' },
        { id: 'supplier_name', title: 'Supplier Name' }
      ]
    });

    csvWriter.writeRecords(rows).then(() => {
      const mailOptions = {
        from: 'sohilsodha999@gmail.com',
        to: 'sodhasohil43@gmail.com',
        subject: '📊 Yarn Stock Report',
        text: 'Attached is the latest yarn stock report.',
        attachments: [{ filename: 'yarn_stock.csv', path: filePath }]
      };

      transporter.sendMail(mailOptions, (err2, info) => {
        if (err2) return res.send('Failed to send email');
        res.send('✅ Email sent with attachment');
      });
    });
  });
});

module.exports = router;