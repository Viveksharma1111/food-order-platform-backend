# Architecture and scope

## Stack

| Component | Version / use |
| --- | --- |
| Node.js | 22.18 or newer |
| Express | 5.2.1; HTTP API |
| TypeScript | 6.0.3 |
| PostgreSQL | Persistent database; local development has been verified with PostgreSQL 17 |
| Prisma ORM / Client / PostgreSQL adapter | 7.10.0 |
| Zod | 4.6.5 request and environment validation |
| bcrypt | 6.0.0 password hashing |
| jsonwebtoken | 9.0.3 bearer JWTs |
| Vitest / Supertest | 5.0.3 / 7.3.1 integration tests |

Versions reflect the project lockfile/current installed dependencies; Node is supported at 22.18 or newer.

## Backend structure

```text
src/
  config/       environment validation
  middleware/   authentication, roles, and error handling
  modules/
    auth/       login and current identity
    users/      administrator-managed staff accounts
    foods/      staff food management and customer available listing
    orders/     customer orders and staff processing
  lib/          Prisma client and PostgreSQL adapter
  routes/       health endpoint
  types/        authenticated request identity types
  app.ts        middleware and route mounting
  server.ts     HTTP listener
```

Requests flow through **Route → Controller → Service → Prisma → PostgreSQL**. Routes attach authentication and role middleware. Controllers validate request data and format HTTP responses; Zod schemas reject unsupported fields. Services own persistence and business rules. Prisma selects and response mappers keep password hashes and unrelated database fields out of API responses. The centralized error handler maps validation, authorization, not-found, conflict, and unexpected failures into the common JSON error format.

There is **no `src/modules/admin`**. `ADMIN` is a role with permissions over users, foods, and orders; `OPERATOR` manages foods and orders; `CUSTOMER` uses the customer food and own-order APIs.

## Assumptions and scope

- The platform serves one restaurant and one currency, INR.
- `ADMIN` and `OPERATOR` are staff roles; `CUSTOMER` is an authenticated API identity.
- Food archive is a soft delete; the database row remains for order history.
- A customer can read only their own orders; staff can process all orders.
- Staff can cancel an order only while it is `PLACED`; `COMPLETED` and `CANCELLED` are terminal.
- Customer cancellation is not implemented because it is not required.
- The backend does not include the mobile application, payment integration, real-time updates, or production deployment.

## AI and reused material disclosure

AI assistance was used during development for architecture planning, implementation assistance, code review, test planning, and documentation. The implementation was reviewed and exercised with the repository's automated PostgreSQL tests.

No application starter/template was identified in the repository. The `.agents`, `.claude`, `.cursor`, and `.devin` copies are duplicated Prisma skill guidance for developer tooling, not application templates or runtime dependencies. They are excluded from Git by `.gitignore`; they are left on disk for local tools.
