const express = require('express');
const router = express.Router();
const db = require('../db/db');


function isLoggedIn(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.send(`<p>⏳ Session expired. <a href="/login">Login again</a></p>`);
  }
}

const transporter = require('../utils/mailer');

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
            <a href="/email-stock-report">📩 Email Yarn Stock Report</a>

            ` : ''}
        
        </div>
        `;

        res.send(html);
      });
    });
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
        from: 'Windows Computer',
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

router.get('/send-test-mail', (req, res) => {
  const mailOptions = {
    from: 'yourEmail@gmail.com',
    to: 'receiver@example.com',
    subject: '🧶 Yarn Report Test Email',
    text: 'This is a test email from your Yarn Inventory System'
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) return res.send('❌ Failed to send: ' + err.message);
    res.send('✅ Email sent: ' + info.response);
  });
});
