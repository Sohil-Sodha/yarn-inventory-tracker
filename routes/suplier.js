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
       <div style="background:#333; padding:10px; color:white;">
        <span style="margin-right:20px;">🧶 Yarn Inventory</span>
       </div> 
      <div style="background:#333; padding:10px; color:white;">
        <a href="/dashboard" style="color:white;">⬅ Dashboard</a>
        <span style="float:right;">${username} (${role})</span>
      </div>
      <hr>
      <h2>Supplier List</h2>
      ${role === 'admin' ? `<a href="/add-supplier">➕ Add New Supplier</a>` : ''}
      <table border="1" cellpadding="8" style="margin-top:10px;">
        <tr>
          <th>ID</th><th>Name</th><th>Contact</th><th>Phone</th><th>Email</th><th>Address</th><th>Actions</th>
        </tr>
    `;

    results.forEach(supplier => {
      html += `
        <tr>
          <td>${supplier.id}</td>
          <td>${supplier.name}</td>
          <td>${supplier.contact_person || '-'}</td>
          <td>${supplier.phone || '-'}</td>
          <td>${supplier.email || '-'}</td>
          <td>${supplier.address || '-'}</td>
          <td>
            ${role === 'admin' ? `
              <a href="/edit-supplier/${supplier.id}">Edit</a> |
              <a href="/delete-supplier/${supplier.id}" onclick="return confirm('Delete this supplier?')">Delete</a>
            ` : '--'}
          </td>
        </tr>
      `;
    });

    html += `</table>`;
    res.send(html);
  });
});

router.get('/add-supplier', isLoggedIn, (req, res) => {
  if (!isAdmin(req)) return res.status(403).send('Access Denied');

  const role = req.session.user?.role || '';
  const username = req.session.user?.username || '';

  let html = `

    <div style="background:#333; padding:10px; color:white;">
     <span style="margin-right:20px;">🧶 Yarn Inventory</span>
    </div> 
     <div style="background:#333; padding:10px; color:white;">
        <a href="/dashboard" style="color:white;">⬅ Dashboard</a>
        <span style="float:right;">${username} (${role})</span>
      </div>
    <hr>

    <h2>Add New Supplier</h2>
    <form method="POST" action="/add-supplier">
      <input type="text" name="name" placeholder="Name" required><br><br>
      <input type="text" name="contact_person" placeholder="Contact Person"><br><br>
      <input type="text" name="phone" placeholder="Phone"><br><br>
      <input type="email" name="email" placeholder="Email"><br><br>
      <textarea name="address" placeholder="Address"></textarea><br><br>
      <button type="submit">Add Supplier</button>
    </form>
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
      res.redirect('/suppliers');
    }
  );
});

router.get('/edit-supplier/:id', isLoggedIn, (req, res) => {
  if (!isAdmin(req)) return res.status(403).send('Access Denied');

  const id = req.params.id;

  db.query('SELECT * FROM suppliers WHERE id = ?', [id], (err, results) => {
    if (err || results.length === 0) return res.send('Supplier not found');

    const s = results[0];

    let html = `
      <h2>Edit Supplier</h2>
      <form method="POST" action="/edit-supplier/${id}">
        <input type="text" name="name" value="${s.name}" required><br><br>
        <input type="text" name="contact_person" value="${s.contact_person || ''}"><br><br>
        <input type="text" name="phone" value="${s.phone || ''}"><br><br>
        <input type="email" name="email" value="${s.email || ''}"><br><br>
        <textarea name="address">${s.address || ''}</textarea><br><br>
        <button type="submit">Update Supplier</button>
      </form>
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
      res.redirect('/suppliers');
    }
  );
});

router.get('/delete-supplier/:id', isLoggedIn, (req, res) => {
  if (!isAdmin(req)) return res.status(403).send('Access Denied');

  const id = req.params.id;

  db.query('DELETE FROM suppliers WHERE id = ?', [id], (err) => {
    if (err) return res.send('Error deleting');
    res.redirect('/suppliers');
  });
});

module.exports = router;