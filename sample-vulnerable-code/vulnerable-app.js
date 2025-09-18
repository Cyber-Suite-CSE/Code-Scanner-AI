// Sample vulnerable Node.js application for security scanning demo
const express = require('express');
const mysql = require('mysql2');
const app = express();

// Hardcoded database credentials (CRITICAL VULNERABILITY)
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'admin',
  password: 'password123',  // Hardcoded password
  database: 'myapp'
});

app.use(express.json());

// SQL Injection vulnerability
app.get('/user/:id', (req, res) => {
  const userId = req.params.id;
  const query = 'SELECT * FROM users WHERE id = ' + userId; // SQL injection

  connection.execute(query, (err, results) => {
    if (err) {
      res.status(500).send('Database error');
    } else {
      res.json(results);
    }
  });
});

// XSS vulnerability
app.post('/comment', (req, res) => {
  const comment = req.body.comment;
  // No sanitization - XSS vulnerability
  const html = '<div>' + comment + '</div>';
  res.send(html);
});

// Command injection vulnerability
app.get('/ping/:host', (req, res) => {
  const host = req.params.host;
  const { exec } = require('child_process');
  exec('ping -c 1 ' + host, (error, stdout, stderr) => { // Command injection
    if (error) {
      res.status(500).send('Error: ' + error.message);
    } else {
      res.send(stdout);
    }
  });
});

// Insecure file upload
app.post('/upload', (req, res) => {
  const filename = req.body.filename;
  const content = req.body.content;

  // No validation - path traversal vulnerability
  fs.writeFileSync('./uploads/' + filename, content);
  res.send('File uploaded: ' + filename);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});