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

router.get('/logs', isLoggedIn, (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.send('⛔ Access denied. Admins only.');
    }

    const sql = `
  SELECT l.*, u.username AS user_name
  FROM logs l
  JOIN users u ON u.id = l.user_id
  ORDER BY l.created_at DESC
  LIMIT 100
`;

    db.query(sql, (err, results) => {

        const role = req.session.user?.role || '';
        const username = req.session.user?.username || 'Guest';

        if (err) return res.send('❌ Error loading logs'), console.error('❌ SQL Error:', err);

        let html = `

    <div style="background:#333; padding:10px; color:white;">
     <span style="margin-right:20px;">🧶 Yarn Inventory</span>
    </div> 
     <div style="background:#333; padding:10px; color:white;">
        <a href="/dashboard" style="color:white;">⬅ Dashboard</a>
        <span style="float:right;">${username} (${role})</span>
    </div>
    <hr>

    <h2>🧾 Admin - User Activity Log</h2>
    <table border="1" cellpadding="5">
    <tr>
      <th>Date</th><th>User</th><th>Action</th><th>Table</th><th>Details</th>
    </tr>`;

        results.forEach(log => {
            html += `<tr>
        <td>${log.created_at}</td>
        <td>${log.user_name}</td>
        <td>${log.action_type}</td>
        <td>${log.table_name}</td>
        <td>${log.description}</td>
      </tr>`;
        });

        html += `</table>`;
        res.send(html);
    });
});

module.exports = router;