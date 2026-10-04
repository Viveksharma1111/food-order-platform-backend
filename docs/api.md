# API guide

Base URL for local development: `http://localhost:5000/api/v1`. Requests and responses are JSON. The detailed OpenAPI 3.1 document at [openapi.yaml](openapi.yaml) contains request/response schemas and examples for every route.

## Authentication and response conventions

`POST /auth/login` is public. Other endpoints require `Authorization: Bearer <token>` as specified below. The API reloads the authenticated identity from PostgreSQL; clients cannot authorize themselves by submitting a role. Success responses use `{ "success": true, "data": ... }`. Errors use `{ "success": false, "error": { "code": "...", "message": "..." } }`.

| Method | URL | Authorization | Purpose | Request |
| --- | --- | --- | --- | --- |
| GET | `/health` | Public | Health status | None |
| POST | `/auth/login` | Public | Staff/customer sign-in | Email and password |
| GET | `/auth/me` | Any authenticated user | Current identity | None |
| GET | `/users` | ADMIN | List staff users | None |
| POST | `/users` | ADMIN | Create staff user | Name, email, password, role; optional active |
| GET | `/users/{id}` | ADMIN | View staff user | ID in path |
| PATCH | `/users/{id}` | ADMIN | Update supported staff fields | Nonempty subset of name, role, active |
| GET | `/foods` | ADMIN, OPERATOR | List all foods including unavailable/archived | None |
| POST | `/foods` | ADMIN, OPERATOR | Create food | Name, description, category, price, availability |
| GET | `/foods/available` | CUSTOMER | List available, unarchived foods | None |
| GET | `/foods/{id}` | ADMIN, OPERATOR | View food | ID in path |
| PATCH | `/foods/{id}` | ADMIN, OPERATOR | Update food fields | Nonempty supported field subset |
| PATCH | `/foods/{id}/availability` | ADMIN, OPERATOR | Set availability | `{ "availability": true }` |
| PATCH | `/foods/{id}/archive` | ADMIN, OPERATOR | Soft archive food | No body |
| DELETE | `/foods/{id}` | ADMIN, OPERATOR | Soft archive alias | No body |
| POST | `/customer/orders` | CUSTOMER | Create own order | Food IDs, positive integer quantities, optional notes |
| GET | `/customer/orders` | CUSTOMER | List own orders | No query parameters |
| GET | `/customer/orders/{id}` | CUSTOMER | Read own order | ID in path |
| GET | `/orders` | ADMIN, OPERATOR | List all orders | Optional `status` enum filter |
| GET | `/orders/{id}` | ADMIN, OPERATOR | Read staff order detail | ID in path |
| PATCH | `/orders/{id}/notes` | ADMIN, OPERATOR | Edit notes only | `{ "notes": "..." }` or `null` |
| PATCH | `/orders/{id}/status` | ADMIN, OPERATOR | Change order status | `{ "status": "PREPARING" }` |

## Business rules

- Food prices are PostgreSQL `DECIMAL(10,2)` and API money values serialize as two-decimal strings. Order totals and line totals use Prisma Decimal, calculated from stored food prices.
- Order creation accepts only food IDs, quantities, and optional notes. It rejects missing, unavailable, or archived foods; rejects nonpositive, noninteger, malformed quantities; and creates order plus items atomically.
- Item food-name and unit-price snapshots retain their placement-time values after catalog changes.
- Customer list queries use the authenticated customer ID. Customer detail queries match both order ID and authenticated owner; another customer's order receives a safe 404.
- Status-code choices: an ownership denial returns 404 to avoid revealing whether another customer's order exists. An invalid order status transition returns 409 because the requested state conflicts with the order's current state. These are implementation choices; this guide does not claim that the assessment mandates these exact status codes.
- Both food archive routes set `archived = true`; they do not delete rows. Re-archiving returns 409.
- Staff status transitions are exactly `PLACED → PREPARING`, `PLACED → CANCELLED`, and `PREPARING → COMPLETED`. `COMPLETED` and `CANCELLED` are terminal. Invalid transitions return 409.
- Customer cancellation is not implemented.

## Common errors

| Status | Meaning |
| --- | --- |
| 400 | Request validation failed, including malformed IDs, invalid enum/filter, or unsupported fields |
| 401 | Missing or invalid bearer token; invalid login credentials |
| 403 | Authenticated role is not permitted on the route |
| 404 | Resource not found; customer order detail also returns this for another owner's order |
| 409 | Duplicate/conflicting record, already archived food, unavailable/archived food, or invalid status transition |
| 500 | Unexpected failure; internal details are not returned |

Use the OpenAPI examples to run login, food listing, order creation, and order lookup requests. The local seed credentials in the README are for local development only.
