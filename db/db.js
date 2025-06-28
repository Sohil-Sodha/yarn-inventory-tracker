const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // your MySQL password here
    database: 'yarn_inventory'
});

connection.connect((err) => {
    if (err) {
        console.error('❌ Error connecting to DB:', err);
        return;
    }
    console.log('✅ Connected to MySQL Database!');
});

module.exports = connection;
