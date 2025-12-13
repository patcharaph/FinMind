# FinMind Privacy Policy (Draft)

Last updated: 2025-12-14

## Data We Process
- Account data: email, display_name, plan.
- Financial data: assets, liabilities, transactions, advisor insights.
- Technical: logs/telemetry (if enabled), device/browser info.

## Storage & Retention
- Hosted Postgres for production; local/in-memory for dev.
- Data retained while the account is active; delete upon request or inactivity policies (to be defined).

## Security
- JWT auth; passwords hashed with bcrypt.
- HTTPS required in production; secrets via environment variables.
- Principle of least privilege for database access.

## Third Parties
- Optional LLM calls (OpenAI/OpenRouter) if LLM_API_KEY is configured. Metrics/rules may be sent to the provider to generate advice.
- Hosting/logging providers (TBD) when deployed.

## User Rights
- Request access, correction, or deletion of your data (email support TBD).

## Contact
- Add a support email/URL before launch.
