const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'sohilsodha999@gmail.com',
    pass: 'aaxmqltcoxujguco' // Use App Password (not your actual password!)
  }
});

module.exports = transporter;
