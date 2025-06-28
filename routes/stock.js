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

    let options = suppliers.map(s => `<option value="${s.name}">${s.name}</option>`).join('');

    const html = `
    <div style="background:#333; padding:10px; color:white;">
     <span style="margin-right:20px;">🧶 Yarn Inventory</span>
    </div> 
     <div style="background:#333; padding:10px; color:white;">
        <a href="/dashboard" style="color:white;">⬅ Dashboard</a>
        <span style="float:right;">${username} (${role})</span>
      </div>
      <hr>

      <h2>Add Yarn Stock</h2>
      <form method="POST" action="/add-stock">
        <input type="text" name="yarn_type" placeholder="Yarn Type" required><br><br>
        <input type="text" name="color" placeholder="Color" required><br><br>
        <input type="number" name="quantity" placeholder="Quantity" required><br><br>
        <input type="text" name="unit" placeholder="Unit (e.g., kg)" required><br><br>
        <input type="date" name="date_received" required><br><br>
        <label>Supplier:</label>
        <select name="supplier_name" required>
          <option value="">-- Select Supplier --</option>
          ${options}
        </select><br><br>
        <button type="submit">Add Yarn</button>
      </form>

      <h2>📥 Import Yarn Data (CSV)</h2>
     <form method="POST" action="/upload-csv" enctype="multipart/form-data">
      <input type="file" name="csvfile" accept=".csv" required />
      <button type="submit">Upload CSV</button>
     </form>

    <br><a href="/stock-list">Back to List</a>
  `;
    res.send(html);
  });
});

router.post('/add-stock', isLoggedIn, (req, res) => {

  const role = req.session.user?.role || '';
  const username = req.session.user?.username || 'Guest';

  let html = ` 
  <div style="background:#333; padding:10px; color:white;">
    <span style="margin-right:20px;">🧶 Yarn Inventory</span>
  </div> 
  <div style="background:#333; padding:10px; color:white;">
    <a href="/dashboard" style="color:white;">⬅ Dashboard</a>
    <span style="float:right;">${username} (${role})</span>
  </div>
  <hr>`;

  const { yarn_type, color, quantity, unit, date_received, supplier_name } = req.body;

  const sql = `INSERT INTO yarn_stock (yarn_type, color, quantity, unit, date_received, supplier_name)
  VALUES (?, ?, ?, ?, ?, ?)`;

  db.query(sql, [yarn_type, color, quantity, unit, date_received, supplier_name], (err, result) => {
    if (err) {
      console.error('❌ Error adding stock:', err);
      return res.send(html + 'Error while saving stock!');
    }

    console.log('✅ Stock added!');
    res.send(html + 'Yarn stock added successfully. <a href="/add-stock">Add More</a>');
  });
});

router.post('/upload-csv', isAdmin, isLoggedIn, upload.single('csvfile'), (req, res) => {
  const filePath = req.file.path;
  const yarnEntries = [];

  const role = req.session.user?.role || '';
  const username = req.session.user?.username || 'Guest';

  let html = ` 
  <div style="background:#333; padding:10px; color:white;">
    <span style="margin-right:20px;">🧶 Yarn Inventory</span>
  </div> 
  <div style="background:#333; padding:10px; color:white;">
    <a href="/dashboard" style="color:white;">⬅ Dashboard</a>
    <span style="float:right;">${username} (${role})</span>
  </div>
  <hr>`;

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      // Push each row as an object
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
      // Insert all rows in bulk
      const insertSQL = `INSERT INTO yarn_stock 
        (yarn_type, color, quantity, unit, date_received, supplier_name) 
        VALUES ?`;

      db.query(insertSQL, [yarnEntries], (err) => {
        fs.unlinkSync(filePath); // clean up uploaded file

        if (err) return res.send('Import failed! Check CSV format.');
        req.session.message = { type: 'success', text: 'CSV data imported successfully!' };
        res.send(html + 'Yarn stock added successfully. <a href="/add-stock">Add More</a>');
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

  // Define allowed sort options
  const sortOptions = [
    { value: 'id', label: 'ID' },
    { value: 'quantity', label: 'Quantity' },
    { value: 'date_received', label: 'Date Received' },
    { value: 'yarn_type', label: 'Yarn Type' }
  ];

  // Start building HTML
  let html = `
    <div style="background:#333; padding:10px; color:white;">
      <span style="margin-right:20px;">🧶 Yarn Inventory</span>
    </div> 
    <div style="background:#333; padding:10px; color:white;">
      <a href="/dashboard" style="color:white;">⬅ Dashboard</a>
      <span style="float:right;">${username} (${role})</span>
    </div>
    <hr>

    <h2>Yarn Stock List</h2>

    <form method="GET" action="/stock-list">
      <div style="margin-bottom: 10px;">
        <input type="text" name="search" placeholder="Search by type or color" value="${search}">
        <button type="submit">Search</button>
        <a href="/stock-list" style="margin-left: 10px;">Reset</a>
      </div>

      <div style="display: flex; gap: 20px; margin-bottom: 20px;">
        <div>
          <label>Sort by:</label>
          <select name="sort" onchange="this.form.submit()">
            ${sortOptions.map(opt => `
              <option value="${opt.value}" ${sortBy === opt.value ? 'selected' : ''}>
                ${opt.label}
              </option>
            `).join('')}
          </select>
        </div>
  `;

  // First query to get distinct suppliers for dropdown
  db.query('SELECT DISTINCT supplier_name FROM yarn_stock ORDER BY supplier_name', (err, supplierRows) => {
    if (err) return res.send('Supplier Load Error');

    // Add supplier filter to HTML
    html += `
        <div>
          <label>Filter by Supplier:</label>
          <select name="supplier_name" onchange="this.form.submit()">
            <option value="">-- All Suppliers --</option>
            ${supplierRows.map(s => `
              <option value="${s.supplier_name}" ${s.supplier_name === selectedSupplier ? 'selected' : ''}>
                ${s.supplier_name}
              </option>
            `).join('')}
          </select>
        </div>
      </div>
    </form>
    <br>
    `;

    // Build SQL query based on filters
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
      sql += ' WHERE ' + conditions.join(' AND ');
      countSql += ' WHERE ' + conditions.join(' AND ');
    }

    // Add sorting
    const allowedSorts = {
      id: 'id',
      quantity: 'quantity',
      date_received: 'date_received',
      yarn_type: 'yarn_type'
    };
    const sortColumn = allowedSorts[sortBy] || 'date_received';
    sql += ` ORDER BY ${sortColumn} DESC LIMIT ? OFFSET ?`;

    // Query the total count
    db.query(countSql, values, (err, countResult) => {
      const totalRows = countResult[0].count;
      const totalPages = Math.ceil(totalRows / limit);

      // Query the yarn stock with pagination
      db.query(sql, [...values, limit, offset], (err, results) => {
        if (err) return res.send('Database error');

        // Build table
        html += `
        <table border="1" cellpadding="6">
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Color</th>
              <th>Quantity</th>
              <th>Unit</th>
              <th>Date Received</th>
              <th>Supplier</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
        `;

        if (results.length === 0) {
          html += `
            <tr>
              <td colspan="8" style="text-align: center;">No stock items found</td>
            </tr>
          `;
        } else {
          results.forEach(stock => {
            html += `
            <tr>
              <td>${stock.id}</td>
              <td>${stock.yarn_type}</td>
              <td>${stock.color}</td>
              <td>${stock.quantity}</td>
              <td>${stock.unit}</td>
              <td>${stock.date_received}</td>
              <td>${stock.supplier_name}</td>
              <td>
                <a href="/use-yarn/${stock.id}">📤 Use</a> |
                ${role === 'admin' ? `
                <a href="/edit-stock/${stock.id}">Edit</a> | 
                <a href="/delete-stock/${stock.id}" onclick="return confirm('Delete this stock?')">Delete</a>
                ` : 'View only'}
              </td>
            </tr>
            `;
          });
        }

        html += `
          </tbody>
        </table>
        <div style="margin-top: 10px;">
        `;

        if (page > 1) {
          html += `<a href="/stock-list?page=${page - 1}&search=${encodeURIComponent(search)}&sort=${sortBy}&supplier_name=${encodeURIComponent(selectedSupplier)}">⬅️ Previous</a> `;
        }
        if (page < totalPages) {
          html += `<a href="/stock-list?page=${page + 1}&search=${encodeURIComponent(search)}&sort=${sortBy}&supplier_name=${encodeURIComponent(selectedSupplier)}">Next ➡️</a>`;
        }

        html += `
        </div>
        <div style="margin-top: 20px;">

            ${role === 'admin' ? `

            <form method="GET" action="/stock-list/export" style="margin-bottom: 10px;">
             <input type="hidden" name="supplier_name" value="${selectedSupplier}">
             <button type="submit">⬇️ Export to CSV</button>
            </form>     
            <a href="/stock-list/report?supplier_name=${encodeURIComponent(selectedSupplier)}&search=${encodeURIComponent(search)}" target="_blank">
             <button>📄 Generate Report</button></a>
            <a href="/email-stock-report"><button>📩 Email Yarn Stock Report</button></a>

            ` : ''}
        
        </div>
        `;

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
      <h2>Use Yarn: ${yarn.yarn_type} (${yarn.color})</h2>
      <form method="POST" action="/use-yarn/${id}">
        <label>Used Quantity:</label>
        <input type="number" name="used_quantity" step="0.01" max="${yarn.quantity}" required /><br>
        <label>Used By:</label>
        <input type="text" name="used_by" required /><br>
        <label>Purpose:</label>
        <textarea name="purpose"></textarea><br>
        <button type="submit">Submit Usage</button>
      </form>
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
        res.redirect('/stock-list');
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

   <div style="background:#333; padding:10px; color:white;">
    <span style="margin-right:20px;">🧶 Yarn Inventory</span>
   </div> 
    <div style="background:#333; padding:10px; color:white;">
      <a href="/dashboard" style="color:white;">⬅ Dashboard</a>
      <span style="float:right;">${username} (${role})</span>
    </div>
    <hr>

      <h2>Edit Yarn Stock</h2>
      <form action="/update-stock/${stock.id}" method="POST">
        <label>Yarn Type:</label><br>
        <input type="text" name="yarn_type" value="${stock.yarn_type}" required><br><br>

        <label>Color:</label><br>
        <input type="text" name="color" value="${stock.color}" required><br><br>

        <label>Quantity:</label><br>
        <input type="number" name="quantity" value="${stock.quantity}" required><br><br>

        <label>Unit:</label><br>
        <input type="text" name="unit" value="${stock.unit}" required><br><br>

        <label>Date Received:</label><br>
        <input type="date" name="date_received" value="${stock.date_received.toISOString().slice(0, 10)}" required><br><br>

        <label>Supplier Name:</label><br>
        <input type="text" name="supplier_name" value="${stock.supplier_name || ''}"><br><br>

        <button type="submit">Update</button>
      </form>
      <br><a href="/stock-list">Back</a>
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
    res.redirect('/stock-list');
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
    res.redirect('/stock-list');
  });
});

router.get('/stock-list/report', isAdmin, isLoggedIn, (req, res) => {
  db.query('SELECT * FROM yarn_stock ORDER BY date_received DESC', (err, rows) => {
    if (err) return res.send('DB Error');

    let html = `
      <html>
      <head>
        <title>Yarn Stock Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 30px; }
          h2 { text-align: center; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #333; padding: 8px; text-align: center; }
          th { background-color: #f0f0f0; }
          .print-btn {
            margin-bottom: 20px;
            text-align: right;
          }
          @media print {
            .print-btn { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="print-btn">
          <button onclick="window.print()">🖨️ Print / Save as PDF</button>
        </div>
        <h2>🧶 Yarn Stock Report</h2>
        <table>
          <tr>
            <th>ID</th>
            <th>Yarn Type</th>
            <th>Color</th>
            <th>Quantity</th>
            <th>Unit</th>
            <th>Date Received</th>
            <th>Supplier</th>
          </tr>
    `;

    rows.forEach(row => {
      html += `
        <tr>
          <td>${row.id}</td>
          <td>${row.yarn_type}</td>
          <td>${row.color}</td>
          <td>${row.quantity}</td>
          <td>${row.unit}</td>
          <td>${row.date_received}</td>
          <td>${row.supplier_name}</td>
        </tr>
      `;
    });

    html += `
        </table>
      </body>
      </html>
    `;

    res.send(html);
  });
});

router.get('/stock-list/export', isAdmin, isLoggedIn, (req, res) => {
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

router.get('/yarn-usage', isAdmin, isLoggedIn, (req, res) => {
  const username = req.session.user?.username || 'Guest';
  const role = req.session.user?.role || '';
  const { yarn_type, used_by, from_date, to_date } = req.query;
  const limit = 10;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;

  let html = `
    <div style="background:#333; padding:10px; color:white;">
      <span style="margin-right:20px;">🧶 Yarn Inventory</span>
    </div> 
    <div style="background:#333; padding:10px; color:white;">
      <a href="/dashboard" style="color:white;">⬅ Dashboard</a>
      <span style="float:right;">${username} (${role})</span>
    </div>
    <hr>

    <h2>🧾 Yarn Usage History</h2>

    <form method="GET" action="/yarn-usage">
      <input type="text" name="yarn_type" placeholder="Yarn type" value="${yarn_type || ''}"/>
      <input type="text" name="used_by" placeholder="Used by" value="${used_by || ''}"/>
      <input type="date" name="from_date" value="${from_date || ''}"/>
      <input type="date" name="to_date" value="${to_date || ''}"/>
      <button type="submit">🔍 Filter</button>
    </form>

      <table border="1" cellpadding="6">
        <tr>
          <th>ID</th><th>Yarn</th><th>Used Quantity</th>
          <th>Used By</th><th>Purpose</th><th>Date</th>
        </tr>`;

  let query = `
    SELECT y.yarn_type, y.color, u.* 
    FROM yarn_usage u 
    JOIN yarn_stock y ON u.yarn_id = y.id 
    WHERE 1
  `;
  let countQuery = `
    SELECT COUNT(*) AS count
    FROM yarn_usage u 
    JOIN yarn_stock y ON u.yarn_id = y.id 
    WHERE 1
  `;
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

      rows.forEach(r => {
        html += `
          <tr>
            <td>${r.id}</td>
            <td>${r.yarn_type} (${r.color})</td>
            <td>${r.used_quantity}</td>
            <td>${r.used_by}</td>
            <td>${r.purpose}</td>
            <td>${r.used_on}</td>
          </tr>
        `;
      });

      html += `</table><br>`;

      // Pagination links
      html += `<div style="margin-top:10px;">`;
      if (page > 1) {
        html += `<a href="/yarn-usage?page=${page - 1}&yarn_type=${encodeURIComponent(yarn_type || '')}&used_by=${encodeURIComponent(used_by || '')}&from_date=${encodeURIComponent(from_date || '')}&to_date=${encodeURIComponent(to_date || '')}">⬅️ Previous</a> `;
      }
      if (page < totalPages) {
        html += `<a href="/yarn-usage?page=${page + 1}&yarn_type=${encodeURIComponent(yarn_type || '')}&used_by=${encodeURIComponent(used_by || '')}&from_date=${encodeURIComponent(from_date || '')}&to_date=${encodeURIComponent(to_date || '')}">Next ➡️</a>`;
      }
      html += `</div><br>`;
      html += `<a href="/export-usage" target="_blank">📤 Export Yarn Usage (CSV)</a><br>`;
      html += `<a href="/usage-graph" target="_blank"><button>📊 Yarn Usage Chart</button></a>`;
      res.send(html);
    });
  });
});

router.get('/export-usage', (req, res) => {
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

router.get('/usage-graph', isAdmin, isLoggedIn, (req, res) => {
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
      <html>
        <head>
          <title>Yarn Usage Chart</title>
          <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        </head>
        <body style="text-align:center">
          <h2>🧵 Yarn Usage by Type</h2>
          <canvas id="usageChart" width="400" height="300"></canvas>
          <script>
            const ctx = document.getElementById('usageChart').getContext('2d');
            new Chart(ctx, {
              type: 'bar',
              data: {
                labels: ${JSON.stringify(labels)},
                datasets: [{
                  label: 'Total Used Quantity',
                  data: ${JSON.stringify(data)},
                  backgroundColor: 'rgba(75, 192, 192, 0.7)',
                  borderColor: 'rgba(75, 192, 192, 1)',
                  borderWidth: 1
                }]
              },
              options: {
                scales: {
                  y: {
                    beginAtZero: true
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