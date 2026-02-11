
const { computeMetrics } = require('../server/db');

// Mock snapshot data
const testCases = [
    {
        name: "Healthy Finance",
        input: {
            cash_savings: 30000,
            investments: 50000,
            personal_assets: 20000,
            other_assets: 0,
            short_term_debt: 1000,
            long_term_debt: 0,
            income: 5000,
            expenses: 3000
        },
        expected: {
            netWorth: 99000, // (30k+50k+20k) - 1k
            runwayMonths: 10, // 30k / 3k
            savingsRate: 0.4, // (5k-3k)/5k
            investmentRatio: 0.625 // 50k / (30k+50k)
        }
    },
    {
        name: "Debt Heavy",
        input: {
            cash_savings: 2000,
            investments: 0,
            personal_assets: 10000,
            other_assets: 0,
            short_term_debt: 5000,
            long_term_debt: 20000,
            income: 3000,
            expenses: 2800
        },
        expected: {
            netWorth: -13000, // (2k+10k) - (5k+20k) = 12k - 25k
            runwayMonths: 0.7, // 2000 / 2800 ~= 0.71
            savingsRate: 0.0667, // 200/3000
        }
    }
];

console.log("Starting Financial Logic Verification...\n");

testCases.forEach((test, index) => {
    console.log(`Test Case ${index + 1}: ${test.name}`);
    const result = computeMetrics(test.input);

    let passed = true;
    for (const [key, expectedVal] of Object.entries(test.expected)) {
        const actualVal = result[key];
        // Allow small floating point differences
        const diff = Math.abs(actualVal - expectedVal);
        if (diff > 0.01) {
            console.error(`  [FAIL] ${key}: Expected ${expectedVal}, got ${actualVal}`);
            passed = false;
        } else {
            console.log(`  [PASS] ${key}: ${actualVal}`);
        }
    }
    console.log(passed ? "  -> User Scenario Verified OK" : "  -> Verification FAILED");
    console.log("---------------------------------------------------");
});
