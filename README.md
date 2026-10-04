# Food Order Platform Backend

REST API for a single restaurant. The backend uses PostgreSQL and INR; it provides authentication, staff user and food management, and customer/staff order workflows. The separate React frontend is not part of this repository.

## Quick start

Prerequisites: Node.js 22.18 or newer, npm, and a local PostgreSQL server.

```sh
npm ci
createdb food_order_platform
cp .env.example .env
# Set DATABASE_URL and JWT_SECRET in .env; see the environment reference below.
npm run prisma:generate
npm run db:migrate
npm run db:seed
npm run dev
```

`npm run dev` serves the API at `http://localhost:5000`; `npm start` runs the compiled server after `npm run build`. Never point local tests at a production or important development database.

## Environment variables

| Variable | Required | Purpose | Safe example |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection for the app and Prisma | `postgresql://USER:PASSWORD@localhost:5432/food_order_platform?schema=public` |
| `JWT_SECRET` | Yes | Signs/verifies bearer tokens; minimum 32 characters | `<generate-a-local-random-secret-of-32-or-more-characters>` |
| `JWT_EXPIRES_IN` | No (defaults to `1h`) | Token lifetime; accepted values are `15m`, `30m`, `1h`, `2h`, `8h` | `1h` |
| `PORT` | Yes | HTTP port | `5000` |
| `CORS_ORIGIN` | Yes | Single allowed browser origin | `http://localhost:5173` |

Copy `.env.example` to `.env`. Keep `.env` and `.env.test` local; they are ignored by Git. The test workflow uses separate CI-only credentials and a separate database.

## Commands

| Command | Purpose |
| --- | --- |
| `npm ci` | Install the lockfile-pinned dependencies |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run db:migrate` | Develop/apply migrations locally |
| `npm run db:deploy` | Apply committed migrations without creating a new migration |
| `npm run db:seed` | Upsert local development data |
| `npm run dev` | Run the TypeScript development server |
| `npm start` | Run the compiled server (build first) |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Type-check application and tests |
| `npm test` | Run integration tests against the isolated test database |
| `npm run build` | Compile TypeScript to `dist/` |

## Local development accounts — LOCAL DEVELOPMENT ONLY

All seed accounts use `LocalOnly@123!`. The seed hashes the password with bcrypt. These public credentials are for local development only; they are not production credentials.

| Role | Local account |
| --- | --- |
| ADMIN | `admin@example.com` |
| OPERATOR | `operator@example.com` |
| CUSTOMER A | `asha@example.com` |
| CUSTOMER B | `ravi@example.com` |

## Documentation

- [Architecture, assumptions, and scope](docs/architecture.md)
- [Schema, relationships, migrations, and seed](docs/database.md)
- [API routes and business rules](docs/api.md)
- [OpenAPI 3.1 specification](docs/openapi.yaml)
- [Test database setup](docs/testing.md)
- [Backend handover](docs/handover.md)

Actual development time: **[TO BE FILLED BY CANDIDATE]**. Do not estimate this from commit timestamps.
