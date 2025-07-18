// const mysql = require('mysql2');

// const db = mysql.createConnection({
//     host: 'localhost',
//     user: 'root',
//     password: '', // your MySQL password here
//     database: 'yarn_inventory'

//     // host: process.env.DB_HOST,
//     // user: process.env.DB_USER,
//     // password: process.env.DB_PASSWORD,
//     // database: process.env.DB_NAME
// });

// db.connect((err) => {
//     if (err) {
//         console.error('❌ Error connecting to DB:', err);
//         return;
//     }
//     console.log('✅ Connected to MySQL Database!');
// });

// module.exports = db;






var mysql = require("mysql");

var hostname = "co9j78.h.filess.io";
var database = "YarnInventory_taxpretty";
var port = "3307";
var username = "YarnInventory_taxpretty";
var password = "55aa3ab43f45874fa6e09002c7fafbe6b61a9c12";

var db = mysql.createConnection({
    host: hostname,
    user: username,
    password,
    database,
    port,
});

db.connect(function (err) {
    if (err) throw err;
    console.log("Connected!");
});

db.query("SELECT 1+1").on("result", function (row) {
    console.log(row);
});

module.exports = db;