# Backend handover

## Purpose and stack

Single-restaurant food-order API using Node.js 22.18+, Express 5.2.1, TypeScript 6.0.3, PostgreSQL, Prisma 7.10.0, Zod 4.6.5, bcrypt 6.0.0, JWT, Vitest 5.0.3, and Supertest 7.3.1. Currency is INR.

## Completed backend features

- Bearer login/current identity and database-backed ADMIN, OPERATOR, CUSTOMER authorization.
- Administrator staff-user management; food management, availability, and soft archive for staff; available-food listing for customers.
- Customer order creation/history/detail with ownership enforcement, exact server-calculated totals, food snapshots, and atomic PostgreSQL transactions.
- Staff order listing/status filtering/detail/notes and the enforced status state machine.

## Database, seed, and local setup

Install with `npm ci`; configure `.env` from `.env.example`; create the local `food_order_platform` PostgreSQL database; run `npm run prisma:generate`, `npm run db:migrate`, and `npm run db:seed`; start with `npm run dev`. The seed supplies local-only ADMIN, OPERATOR, and two CUSTOMER accounts. See [README](../README.md) and [database documentation](database.md).

The schema is managed by the initial database migration and the forward monetary-NaN constraint migration. No Phase 6A schema change was made.

## Tests, CI, and API reference

Tests require the isolated `food_order_platform_test` database configured through `.env.test`; apply migrations with `npx prisma migrate deploy` before `npm test`. The GitHub Actions workflow provides a dedicated PostgreSQL service and runs migrations, lint, typecheck, tests, and build. The local Phase 5 verification reported 112 passing tests. The workflow is configured but has no hosted run result until committed to a repository with GitHub Actions enabled.

The route inventory and business rules are in [API guide](api.md); the machine-readable contract is [OpenAPI 3.1](openapi.yaml).

## Known dependency audit findings

The current `npm audit` reports 5 findings: 4 high, 1 moderate, and 0 critical. npm reports no available automatic fix. The affected packages are Prisma-related and transitive dependencies, including `deepmerge-ts` and `mysql2`. These are known dependency/tooling findings; this review did not identify an application-level vulnerability in the implemented business logic. No `npm audit fix` or forced dependency upgrade was applied.

## Limitations and exclusions

- The React admin/customer interface is maintained separately; UI workflow instructions and screenshots remain frontend-dependent.
- The backend does not include payment integration, a mobile application, real-time updates, or production deployment.
- Actual development time: **[TO BE FILLED BY CANDIDATE]**.

## AI and reused material

AI assistance was used for architecture planning, implementation assistance, code review, test planning, and documentation. No application starter/template was identified. Duplicated Prisma skill files under `.agents`, `.claude`, `.cursor`, and `.devin` are developer-tool guidance, not application templates or runtime assets; `.gitignore` excludes these copies while leaving local files intact.
