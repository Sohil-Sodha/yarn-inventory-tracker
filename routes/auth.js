const express = require('express');
const router = express.Router();
const db = require('../db/db');

router.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.query(
        'SELECT * FROM users WHERE username = ? AND password = ?',
        [username, password],
        (err, results) => {
            if (err) return res.send('DB error');

            if (results.length > 0) {
                req.session.user = {
                    id: results[0].id,
                    username: results[0].username,
                    email: results[0].email,
                    role: results[0].role,
                    created_at: results[0].created_at
                };

                console.log('✅ Logged in:', req.session.user.username);
                // after successful login
                db.query(`INSERT INTO logs (user_id, user_name, action_type, table_name, description) VALUES (?, ?, 'login', 'users', 'User logged in')`, [req.session.user.id, req.session.user.username]);

                res.redirect('/dashboard');
            } else {
                res.send('Invalid Credentials');
            }
        }
    );
});

router.get('/forgot-password', (req, res) => {
    res.send(`
    <h2>Forgot Password</h2>
    <form method="POST" action="/forgot-password">
      <input type="text" name="username" placeholder="Enter your username" required />
      <button type="submit">Request Reset Link</button>
    </form>
  `);
});

const crypto = require('crypto');

router.post('/forgot-password', (req, res) => {
    const { username } = req.body;
    const token = crypto.randomBytes(20).toString('hex');
    const expires = new Date(Date.now() + 30 * 60 * 1000); // expires in 30 mins

    db.query('SELECT * FROM users WHERE username = ?', [username], (err, result) => {
        if (err || result.length === 0) return res.send('User not found');

        db.query('INSERT INTO password_resets (username, token, expires_at) VALUES (?, ?, ?)',
            [username, token, expires],
            (err2) => {
                if (err2) return res.send('Error saving token');

                const resetLink = `http://localhost:3000/reset-password/${token}`;
                res.send(`<p>Password reset link (valid for 30 mins): <a href="${resetLink}">${resetLink}</a></p>`);
            });
    });
});

router.get('/reset-password/:token', (req, res) => {
    const token = req.params.token;

    db.query('SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW()', [token], (err, result) => {
        if (err || result.length === 0) return res.send('Invalid or expired link');

        res.send(`
      <h2>Reset Password</h2>
      <form method="POST" action="/reset-password/${token}">
        <input type="password" name="new_password" placeholder="Enter new password" required />
        <button type="submit">Reset Password</button>
      </form>
    `);
    });
});

router.post('/reset-password/:token', (req, res) => {
    const token = req.params.token;
    const newPassword = req.body.new_password;

    db.query('SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW()', [token], (err, result) => {
        if (err || result.length === 0) return res.send('Link expired');

        const username = result[0].username;

        // (Optional: hash password using bcrypt in future)
        db.query('UPDATE users SET password = ? WHERE username = ?', [newPassword, username], (err2) => {
            if (err2) return res.send('Password update failed');

            db.query('DELETE FROM password_resets WHERE username = ?', [username]); // Clean up
            res.send('<p>Password updated successfully. <a href="/login">Login</a></p>');
        });
    });
});

function isAdmin(req, res, next) {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    } else {
        return res.status(403).send('Access denied: Admins only.');
    }
}

module.exports = {
    router,
    isAdmin
};
