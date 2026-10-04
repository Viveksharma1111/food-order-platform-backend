# Test database and verification

Tests use the separate PostgreSQL database `food_order_platform_test`. Vitest loads `.env.test` with override, then verifies the decoded database name is exactly `food_order_platform_test` before the suite starts. Each test clears the application tables in dependency order and creates fixtures. The order transaction test installs and removes a test-only PostgreSQL trigger. Do not run tests against production or a valuable development database.

## First-time setup

```sh
createdb food_order_platform_test
cp .env.test.example .env.test
# Edit .env.test with the local PostgreSQL role and a test-only JWT secret.
set -a
. ./.env.test
set +a
npx prisma migrate deploy
npm test
```

`.env.test` is ignored by Git. The workflow creates its own test-only `.env.test`, starts a PostgreSQL service, and applies migrations to that CI database before tests.

## Quality commands

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

The last complete local verification before this finalization task reported 112 passing tests across authentication/users, foods, and orders. The GitHub Actions result will be available after this workflow is committed and run by GitHub.
