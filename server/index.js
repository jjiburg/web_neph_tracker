import express from 'express';
import cors from 'cors';
import pg from 'pg';
const { Pool } = pg;
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
dotenv.config();
import setupVoiceRoutes from './gemini.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 5173;

// Middleware
// Configure CORS for web and Capacitor (iOS/Android)
app.use(cors({
    origin: true, // Allow all origins (for Capacitor)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' })); // Increased for voice audio

// Health check endpoint (for diagnostics)
app.get('/api/health', (req, res) => {
    console.log('[HEALTH] Health check from:', req.headers.origin || req.ip);
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'development'
    });
});

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
      DROP TABLE IF EXISTS logs;
      CREATE TABLE logs (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        id UUID NOT NULL,
        type TEXT NOT NULL,
        encrypted_blob TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL,
        client_updated_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted BOOLEAN NOT NULL DEFAULT FALSE,
        deleted_at TIMESTAMP,
        PRIMARY KEY (user_id, id)
      );
      CREATE INDEX IF NOT EXISTS logs_user_updated_idx ON logs (user_id, updated_at);
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
            const acceptedIds = [];
            const skippedIds = [];
            for (const entry of entries) {
                const clientUpdatedAt = entry.client_updated_at || entry.updatedAt || entry.timestamp || Date.now();
                const createdAt = entry.timestamp || Date.now();
                const deletedAt = entry.deleted_at ? new Date(entry.deleted_at) : null;
                const result = await client.query(
                    `INSERT INTO logs (user_id, id, type, encrypted_blob, created_at, client_updated_at, deleted, deleted_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (user_id, id) DO UPDATE SET
             type = EXCLUDED.type,
             encrypted_blob = EXCLUDED.encrypted_blob,
             client_updated_at = EXCLUDED.client_updated_at,
             deleted = EXCLUDED.deleted,
             deleted_at = EXCLUDED.deleted_at,
             updated_at = CURRENT_TIMESTAMP
           WHERE EXCLUDED.client_updated_at >= logs.client_updated_at
           RETURNING id`,
                    [
                        req.user.id,
                        entry.id,
                        entry.type,
                        entry.encrypted_blob,
                        new Date(createdAt),
                        new Date(clientUpdatedAt),
                        Boolean(entry.deleted),
                        deletedAt,
                    ]
                );
                if (result.rowCount > 0) {
                    acceptedIds.push(entry.id);
                } else {
                    skippedIds.push(entry.id);
                }
            }
            await client.query('COMMIT');
            res.json({ success: true, acceptedIds, skippedIds });
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

app.post('/api/sync/clear', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM logs WHERE user_id = $1', [req.user.id]);
        res.json({ success: true, deleted: result.rowCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/sync/pull', authenticateToken, async (req, res) => {
    const { since, limit } = req.query;
    const limitValue = Math.min(parseInt(limit || '500', 10), 1000);
    try {
        const result = await pool.query(
            `SELECT id, type, encrypted_blob, created_at as timestamp, client_updated_at, updated_at, deleted, deleted_at
       FROM logs
       WHERE user_id = $1 AND updated_at > $2
       ORDER BY updated_at ASC
       LIMIT $3`,
            [req.user.id, since ? new Date(parseInt(since, 10)) : new Date(0), limitValue]
        );
        const maxUpdatedAt = result.rows.reduce((max, row) => {
            const ts = new Date(row.updated_at).getTime();
            return Math.max(max, ts);
        }, since ? parseInt(since, 10) : 0);
        res.json({ entries: result.rows, nextCursor: maxUpdatedAt, serverTime: Date.now() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Voice API (Gemini)
setupVoiceRoutes(app);

// Serve Frontend
app.use(express.static(path.join(__dirname, '../dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
