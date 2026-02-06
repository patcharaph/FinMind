const request = require('supertest');
// We need to export app from index.js to test it with supertest, 
// or we can just mock the requests if the server is running.
// Let's modify index.js slightly to export app, or just run a script that hits the running server.
// For simplicity in this environment, let's write a script that assumes the server is running on port 3000.

const API_URL = 'http://localhost:3000/api';

async function testBackend() {
    console.log('--- STARTING BACKEND SMOKE TEST ---');

    // 1. Health Check
    try {
        const health = await fetch(`${API_URL}/health`);
        const healthJson = await health.json();
        console.log('[PASS] Health Check:', healthJson);
    } catch (e) {
        console.error('[FAIL] Health Check:', e.message);
    }

    // 2. Create Snapshot
    let snapshotId;
    try {
        const res = await fetch(`${API_URL}/snapshots`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: 1,
                market_date: '2026-02',
                cash: 5000,
                savings: 10000,
                investments: 25000,
                debt: 2000,
                income: 6000,
                expenses: 4000
            })
        });
        const json = await res.json();
        if (json.success) {
            console.log('[PASS] Create Snapshot:', json);
            snapshotId = json.id;
        } else {
            console.error('[FAIL] Create Snapshot:', json);
        }
    } catch (e) {
        console.error('[FAIL] Create Snapshot:', e.message);
    }

    // 3. Get Snapshots
    try {
        const res = await fetch(`${API_URL}/snapshots?user_id=1`);
        const json = await res.json();
        if (json.snapshots && json.snapshots.length > 0) {
            console.log(`[PASS] Fetch Snapshots: Found ${json.snapshots.length} records.`);
            // Validate data integrity of the last record
            const latest = json.snapshots[0];
            if (latest.id === snapshotId) {
                console.log('[PASS] Data Integrity: Latest snapshot matches created ID.');
            }
        } else {
            console.error('[FAIL] Fetch Snapshots: No records found.');
        }
    } catch (e) {
        console.error('[FAIL] Fetch Snapshots:', e.message);
    }

    console.log('--- TEST COMPLETE ---');
}

testBackend();
