const mysql = require('mysql2');

const connection = mysql.createConnection({
    // host: 'localhost',
    // user: 'root',
    // password: '', // your MySQL password here
    // database: 'yarn_inventory'

    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

connection.connect((err) => {
    if (err) {
        console.error('❌ Error connecting to DB:', err);
        return;
    }
    console.log('✅ Connected to MySQL Database!');
});

module.exports = connection;
