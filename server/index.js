const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5173;

// Middleware
app.use(cors());
app.use(express.json());

// DB Connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize DB Schema
const initDB = async () => {
    try {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS logs (
        id UUID PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        type TEXT NOT NULL,
        encrypted_blob TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('Database initialized');
    } catch (err) {
        console.error('Database initialization failed', err);
    }
};
initDB();

// Simple Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Auth Routes
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id',
            [username, hash]
        );
        const token = jwt.sign({ id: result.rows[0].id, username }, process.env.JWT_SECRET || 'fallback_secret');
        res.json({ token });
    } catch (err) {
        res.status(400).json({ error: 'Username already exists' });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'User not found' });

    const valid = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'Invalid password' });

    const token = jwt.sign({ id: result.rows[0].id, username }, process.env.JWT_SECRET || 'fallback_secret');
    res.json({ token });
});

// Sync Routes
app.post('/api/sync/push', authenticateToken, async (req, res) => {
    const { entries } = req.body; // Array of { id, type, encrypted_blob, created_at }
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            for (const entry of entries) {
                await client.query(
                    `INSERT INTO logs (id, user_id, type, encrypted_blob, created_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE SET encrypted_blob = EXCLUDED.encrypted_blob, updated_at = CURRENT_TIMESTAMP`,
                    [entry.id, req.user.id, entry.type, entry.encrypted_blob, new Date(entry.timestamp)]
                );
            }
            await client.query('COMMIT');
            res.json({ success: true });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/sync/pull', authenticateToken, async (req, res) => {
    const { lastSync } = req.query;
    try {
        const result = await pool.query(
            'SELECT id, type, encrypted_blob, created_at as timestamp FROM logs WHERE user_id = $1 AND updated_at > $2',
            [req.user.id, lastSync ? new Date(parseInt(lastSync)) : new Date(0)]
        );
        res.json({ entries: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Serve Frontend
app.use(express.static(path.join(__dirname, '../dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
