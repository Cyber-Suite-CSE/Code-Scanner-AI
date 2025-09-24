#!/usr/bin/env node

// Setup script to create example environment and test the AI-powered scanner
import fs from 'fs-extra';
import path from 'path';

async function createExampleEnvironment() {
  console.log('🔧 Setting up AI-powered Code Security Scanner example environment...\n');

  try {
    // Create .env file from template
    if (!await fs.pathExists('.env')) {
      await fs.copy('.env.example', '.env');
      console.log('✅ Created .env file from template');
      console.log('   ⚠️  Please update your ANTHROPIC_API_KEY in .env file\n');
    }

    // Create sample vulnerable code for testing
    const sampleCode = {
      'vulnerable-app.js': `
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
`,

      'package.json': `{
  "name": "vulnerable-demo-app",
  "version": "1.0.0",
  "description": "Intentionally vulnerable app for security scanning demo",
  "main": "vulnerable-app.js",
  "scripts": {
    "start": "node vulnerable-app.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "mysql2": "^3.6.0",
    "lodash": "^4.17.20"
  },
  "engines": {
    "node": ">=16.0.0"
  }
}`,

      'auth.py': `
# Sample vulnerable Python authentication module
import sqlite3
import hashlib
import os

class UserAuth:
    def __init__(self):
        # Hardcoded database path
        self.db_path = '/tmp/users.db'
        self.secret_key = 'hardcoded_secret_key_123'  # VULNERABILITY

    def authenticate(self, username, password):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # SQL injection vulnerability
        query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
        cursor.execute(query)

        result = cursor.fetchone()
        conn.close()

        return result is not None

    def hash_password(self, password):
        # Weak hashing algorithm
        return hashlib.md5(password.encode()).hexdigest()

    def generate_token(self, user_id):
        # Predictable token generation
        return f"token_{user_id}_{self.secret_key}"

    def log_access(self, username, password):
        # Logging sensitive data
        print(f"Access attempt: {username}:{password}")

        with open('/tmp/access.log', 'a') as f:
            f.write(f"User: {username}, Pass: {password}\\n")  # VULNERABILITY
`,

      'requirements.txt': `
flask==2.0.1
sqlite3
hashlib
requests==2.25.1
`
    };

    // Create sample directory
    const sampleDir = './sample-vulnerable-code';
    await fs.ensureDir(sampleDir);

    for (const [filename, content] of Object.entries(sampleCode)) {
      const filePath = path.join(sampleDir, filename);
      await fs.writeFile(filePath, content.trim());
      console.log(`✅ Created sample file: ${filename}`);
    }

    // Create zip file for testing
    console.log('\n📦 Creating test zip file...');

    // Note: This is a simplified example - in real usage you'd use a proper zip library
    console.log('   ℹ️  Sample vulnerable code created in:', sampleDir);
    console.log('   ℹ️  You can create a zip file from this directory for testing');

    console.log('\n🎯 Example setup completed!');
    console.log('\nNext steps:');
    console.log('1. Set your ANTHROPIC_API_KEY in .env file');
    console.log('2. Run: npm install');
    console.log('3. Create a zip from sample-vulnerable-code directory');
    console.log('4. Test: npm start scan sample-vulnerable-code.zip');
    console.log('\n⚡ The scanner will use AI to dynamically analyze the code and MCP tools for real-time research!');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

createExampleEnvironment();