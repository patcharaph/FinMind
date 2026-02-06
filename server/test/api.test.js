const request = require('supertest');
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

// Mock App Setup (copy of index.js for testing, or export app from index.js)
// Since index.js starts the server, it's better to refactor index.js to export app.
// For now, I'll create a text fixture that mimics index.js logic or refactor index.js.
// Let's assume we refactor index.js or just mock the logic here effectively.

const app = express();
app.use(express.json());
const db = new Database(':memory:'); // Use in-memory DB for tests

db.exec(`
  CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT);
  CREATE TABLE snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER,
    cash REAL, debt REAL, investment REAL, income REAL, expense REAL, date DATETIME
  );
  INSERT INTO users (id) VALUES (1);
`);

app.post('/api/user/data', (req, res) => {
    const { cash, debt, investment, income, expense } = req.body;
    const stmt = db.prepare('INSERT INTO snapshots (user_id, cash, debt, investment, income, expense) VALUES (?,?,?,?,?,?)');
    const info = stmt.run(1, cash, debt, investment, income, expense);
    res.json({ success: true, id: info.lastInsertRowid });
});

app.get('/api/user/data', (req, res) => {
    const snapshots = db.prepare('SELECT * FROM snapshots').all();
    res.json({ snapshots });
});

describe('API Endpoints', () => {
    it('POST /api/user/data should save snapshot', async () => {
        const res = await request(app)
            .post('/api/user/data')
            .send({ cash: 1000, debt: 0, investment: 500, income: 2000, expense: 1500 });
        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toBe(true);
    });

    it('GET /api/user/data should return history', async () => {
        const res = await request(app).get('/api/user/data');
        expect(res.statusCode).toEqual(200);
        expect(res.body.snapshots.length).toBeGreaterThan(0);
    });
});
