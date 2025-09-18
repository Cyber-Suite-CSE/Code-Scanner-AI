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
            f.write(f"User: {username}, Pass: {password}\n")  # VULNERABILITY