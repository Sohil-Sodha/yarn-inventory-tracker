const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: process.env.DB_HOST,        // ✅ NOT hardcoded
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect((err) => {
  if (err) {
    console.error("❌ Error connecting to DB:", err);
  } else {
    console.log("✅ Connected to MySQL database");
  }
});

module.exports = connection;
