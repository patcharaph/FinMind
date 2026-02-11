
const { upsertSnapshot, getLatestSnapshot, initDb } = require('../server/db');

// Ensure DB is initialized (and migrated)
initDb();

const TEST_USER_ID = 999;
const TEST_DATE = '2099-12';

console.log("Starting Age Persistence Verification...\n");

// 1. Upsert a snapshot with Age
const input = {
    user_id: TEST_USER_ID,
    market_date: TEST_DATE,
    cash_savings: 10000,
    age: 45, // Test Age
    risk_level: 'moderate'
};

console.log(`[1] Saving snapshot with Age: ${input.age}`);
upsertSnapshot(input);

// 2. Retrieve the snapshot
const saved = getLatestSnapshot(TEST_USER_ID);
console.log(`[2] Retrieved snapshot. Age: ${saved.age}`);

// 3. Verify
if (saved.age === 45) {
    console.log("\n[PASS] Age was correctly saved and retrieved.");
} else {
    console.error(`\n[FAIL] Expected age 45, got ${saved.age}`);
    process.exit(1);
}
