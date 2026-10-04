# Backend Agent Instructions — Food Order Platform

## 0. Purpose

You are implementing the **backend only** for the Food Order Platform machine test.

The backend must be a real, persisted, secure API. A mock/in-memory backend is not acceptable.

The assessment explicitly evaluates:

- Planning and database structure — 20 points
- Working admin screens and order rules — 30 points
- API quality and authorization — 20 points
- Tests and GitHub workflow — 15 points
- Documentation and explanation — 15 points

The backend must support the React admin panel and the future customer/mobile API.

**Do not implement frontend code in this repository.**

---

# 1. Source-of-truth assessment requirements

The supplied machine-test document is the primary product specification.

Required stack direction:

- React + TypeScript is required for the frontend.
- Node.js + PostgreSQL are suitable backend/database choices.
- Backend must expose JSON APIs under `/api/v1`.
- Authentication must use bearer tokens or a secure session.
- Backend must enforce roles.
- Backend must enforce customer ownership on every customer-order read.
- An optional X-API-Key may identify a mobile client, but it must never replace individual authentication or grant private-order access.

Required scope:

- One restaurant
- One currency
- Staff authentication
- Customer authentication
- Users/staff management
- Food management
- Staff order management
- Customer order creation/list/detail APIs
- Persistent PostgreSQL data
- Validation
- Password hashing
- Role checks
- Automated tests
- OpenAPI or Postman collection
- GitHub Actions CI
- Seed data
- Brief documentation

Excluded by the assessment:

- Mobile application
- Payment integration
- Real-time updates
- Production deployment

Do not spend time implementing excluded features unless explicitly requested.

---

# 2. Backend technology

Use this backend stack unless the repository already has an approved equivalent:

- Node.js
- TypeScript
- Express
- PostgreSQL
- Prisma ORM
- Zod for request/input validation
- bcrypt/bcryptjs for password hashing
- JWT bearer authentication
- Helmet
- CORS
- Vitest + Supertest for automated API tests
- OpenAPI/Swagger for API documentation

Before changing an existing dependency or Prisma configuration, inspect the actual installed versions and current project files. Do not blindly apply configuration from older Prisma versions.

---

# 3. Engineering principles

## 3.1 SOLID is mandatory

Design code according to SOLID:

### Single Responsibility
Each module/class/function should have one clear responsibility.

Examples:

- Auth controller handles HTTP concerns.
- Auth service handles authentication business logic.
- Password utility handles password hashing/comparison.
- Authorization middleware handles access checks.
- Order service handles order business rules.
- Repository/data-access code handles persistence where a repository abstraction is useful.

Do not put database logic, validation, authorization, HTTP formatting, and business rules into one giant controller.

### Open/Closed
Business rules should be extendable without rewriting unrelated code.

For example, order status transitions should be represented centrally rather than duplicated across controllers.

### Liskov Substitution
If abstractions/interfaces are introduced, implementations must remain behaviorally compatible.

### Interface Segregation
Avoid large interfaces that force modules to depend on unrelated methods.

### Dependency Inversion
Keep business logic independent from framework-specific details where practical.

Do not introduce abstractions only for the sake of having abstractions. Use them where they improve maintainability/testability.

---

# 3A. Functional modules and Admin Panel scope

This section is intentionally explicit so the coding agent does not invent an unnecessary `admin` backend domain/module.

## Backend business modules

The backend business modules are:

```text
src/modules/
├── auth/
├── users/
├── foods/
└── orders/
```

There should NOT be a separate `src/modules/admin/` business module unless a concrete future requirement justifies one.

`ADMIN` is a role/permission set, not a separate business domain.

### Auth module

Responsibilities:

- Staff/customer login
- Credential validation
- Password verification
- JWT creation
- Current authenticated identity
- Authentication middleware integration

Required routes:

```text
POST /api/v1/auth/login
GET  /api/v1/auth/me
```

### Users module

This represents the Administrator's staff-user management capability.

Required operations:

```text
GET    /api/v1/users
POST   /api/v1/users
GET    /api/v1/users/:id
PATCH  /api/v1/users/:id
```

Permission:

```text
ADMIN       -> allowed
OPERATOR    -> denied
CUSTOMER    -> denied
```

The users module manages staff users and their:

- name
- email
- role
- active state
- password/authentication data

Never expose password hashes.

### Foods module

Required operations:

```text
GET    /api/v1/foods
POST   /api/v1/foods
GET    /api/v1/foods/:id
PATCH  /api/v1/foods/:id
PATCH  /api/v1/foods/:id/availability
PATCH  /api/v1/foods/:id/archive
```

Permissions:

```text
ADMIN       -> full food management
OPERATOR    -> full food management
CUSTOMER    -> available/non-archived food listing only
```

### Orders module

The orders module supports both staff/admin operations and customer operations.

Staff operations:

```text
GET   /api/v1/orders
GET   /api/v1/orders/:id
PATCH /api/v1/orders/:id/notes
PATCH /api/v1/orders/:id/status
```

Permissions:

```text
ADMIN       -> allowed
OPERATOR    -> allowed
CUSTOMER    -> denied
```

Customer operations:

```text
POST /api/v1/customer/orders
GET  /api/v1/customer/orders
GET  /api/v1/customer/orders/:id
```

Permission:

```text
CUSTOMER -> allowed only for their own identity/orders
ADMIN/OPERATOR -> these customer endpoints are not required for staff workflows
```

Customer ownership MUST be enforced on the backend.

---

## What the Admin Panel means

The assessment's "admin panel" is the React application/interface, not a separate backend `admin` domain.

Its primary functional areas are:

```text
ADMIN PANEL
│
├── Users
│   ├── List
│   ├── Create
│   ├── View
│   └── Edit
│
├── Foods
│   ├── List
│   ├── Create
│   ├── View
│   ├── Edit
│   ├── Toggle Availability
│   └── Archive
│
└── Orders
    ├── List
    ├── Status Filter
    ├── View Details
    ├── Edit Notes
    └── Process Status
```

Administrator permissions:

```text
Users  -> full staff-user management
Foods  -> full food management
Orders -> view and process all orders
```

Operator permissions:

```text
Users  -> NO ACCESS
Foods  -> full food management
Orders -> view and process orders
```

Customer capabilities are API-focused for this machine test:

```text
Foods  -> view available foods
Orders -> create order, list own orders, view own order
```

Do not implement an unnecessary backend `admin` module merely because the UI is called an admin panel.

Use role-based authorization across the actual business modules:

```text
ADMIN
  -> users
  -> foods
  -> orders

OPERATOR
  -> foods
  -> orders

CUSTOMER
  -> available foods
  -> own customer orders
```

The frontend will have its own separate implementation and its own `AGENTS.md`. Do not implement frontend requirements in this backend repository.

---

# 4. Security priority

Security is a first-class requirement.

Never treat frontend restrictions as security.

## Authentication

- Passwords must never be stored in plaintext.
- Hash passwords using bcrypt/bcryptjs with an appropriate work factor.
- Never return password hashes in API responses.
- Use JWT bearer authentication or another secure authentication mechanism.
- Keep JWT secret/configuration in environment variables.
- Validate token presence, signature, expiry, and payload.
- Do not trust role information supplied by the client.
- Obtain authorization data from the authenticated server-side identity/database state as appropriate.
- `/api/v1/auth/me` must return the authenticated identity without exposing secrets.

## Authorization

Authorization must be enforced in backend middleware/service logic.

Required role model:

- `ADMIN`
- `OPERATOR`
- `CUSTOMER`

Required permissions:

### ADMIN
- Manage staff users
- Manage foods
- View/process all orders

### OPERATOR
- Manage foods
- View/process orders
- Must NOT access user management
- Must NOT change their role

### CUSTOMER
- View available foods
- Create orders
- View only their own orders

A hidden React menu is NOT authorization.

An operator calling the users API directly must receive a denial, normally HTTP 403.

A customer attempting to access another customer's order must be denied.

## Input security

- Validate all external input.
- Reject malformed IDs where applicable.
- Reject invalid enum values.
- Reject invalid quantities.
- Reject invalid status transitions.
- Reject invalid prices where applicable.
- Never trust client-provided totals.
- Never trust client-provided role/ownership fields.
- Never construct unsafe raw SQL from untrusted input.
- Use Prisma parameterized queries/APIs.
- Avoid leaking internal stack traces in production-style API responses.
- Do not expose passwords, password hashes, JWT secrets, database URLs, or other secrets.

## HTTP security

Use:

- Helmet
- CORS configured intentionally
- JSON body parsing with sensible limits
- Consistent error handling
- Meaningful HTTP status codes

Do not use `Access-Control-Allow-Origin: *` blindly if credentials are later introduced.

## Secrets

Never commit:

- `.env`
- passwords
- JWT secrets
- tokens
- production credentials
- private keys

Commit only `.env.example`.

---

# 5. API conventions

Base path:

`/api/v1`

All API responses must be JSON.

Use meaningful HTTP status codes.

Recommended error shape:

```json
{
  "success": false,
  "error": {
    "code": "SOME_ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

Successful responses should use a consistent shape.

Example:

```json
{
  "success": true,
  "data": {}
}
```

Do not expose implementation-specific errors directly.

---

# 6. Required API inventory

Do not omit any required operation.

## 6.1 Authentication

### POST `/api/v1/auth/login`

Purpose:
- Staff/customer login
- Validate credentials
- Return authenticated identity and bearer token

Input:

```json
{
  "email": "admin@example.com",
  "password": "Admin@123"
}
```

Requirements:

- Validate email/password.
- Reject invalid credentials.
- Reject inactive users.
- Never reveal whether a specific email exists in a way that creates unnecessary account enumeration risk.
- Return token and safe user identity.

### GET `/api/v1/auth/me`

Authorization:
- Authenticated users

Purpose:
- Return current authenticated identity.

---

# 7. Users API

The assessment requires administrator-only user management for staff users.

## GET `/api/v1/users`

Authorization:
- ADMIN only

Purpose:
- List staff users.

Support useful filtering/pagination only if it can be implemented cleanly within time. Do not sacrifice required functionality for advanced filtering.

## POST `/api/v1/users`

Authorization:
- ADMIN only

Purpose:
- Create a staff user.

Expected fields include:

```json
{
  "name": "John Operator",
  "email": "operator2@example.com",
  "password": "SecurePassword123!",
  "role": "OPERATOR",
  "active": true
}
```

Validate:
- Name
- Unique email
- Password
- Allowed role
- Active state

Do not allow arbitrary privilege escalation.

## GET `/api/v1/users/:id`

Authorization:
- ADMIN only

Purpose:
- View a staff user.

Never return password hash.

## PATCH `/api/v1/users/:id`

Authorization:
- ADMIN only

Purpose:
- Update:
  - name
  - role
  - active state
  - password only if the implementation explicitly supports it safely

The assessment requires editing name, role, and active state.

Prevent invalid role values.

---

# 8. Foods API

Required food fields:

- id
- name
- description
- category
- decimal/exact price
- availability
- archived state

Never use floating-point arithmetic for monetary calculations.

Use PostgreSQL/Prisma Decimal (or another exact monetary representation).

## GET `/api/v1/foods`

Authorization:
- Staff can list foods.
- Customer/mobile use must only expose available, non-archived foods when using the customer-facing listing.

If one endpoint is used for both purposes, enforce filtering according to the authenticated role.

## GET `/api/v1/foods/available`

Authorization:
- Authenticated customer, if this dedicated endpoint is implemented
- It may also be public only if explicitly designed and documented, but prefer authenticated customer access for this assessment.

Return only:

- available foods
- non-archived foods

## POST `/api/v1/foods`

Authorization:
- ADMIN or OPERATOR

Create a food.

Validate:
- name
- description
- category
- exact price
- availability
- archived state rules

## GET `/api/v1/foods/:id`

Authorization:
- ADMIN/OPERATOR for internal details
- Customer must not be able to use this endpoint to bypass availability/archive rules

Never allow an archived/unavailable food to become orderable through an alternate read endpoint.

## PATCH `/api/v1/foods/:id`

Authorization:
- ADMIN or OPERATOR

Purpose:
- Edit food details.

## PATCH `/api/v1/foods/:id/availability`

Authorization:
- ADMIN or OPERATOR

Purpose:
- Toggle/update availability.

## PATCH `/api/v1/foods/:id/archive`

Authorization:
- ADMIN or OPERATOR

Purpose:
- Archive a food.

Prefer soft archive rather than physical deletion because the order history may reference the food.

Do not allow an archived food to be ordered.

---

# 9. Orders API

Required order fields:

- id
- unique reference
- customer_id
- status
- notes
- total
- timestamps

Required order item fields:

- id
- order_id
- food_id
- food name snapshot
- unit price snapshot
- positive quantity
- line total

---

# 10. Customer order APIs

## POST `/api/v1/customer/orders`

Authorization:
- CUSTOMER only

Request should contain food IDs and quantities.

Example:

```json
{
  "items": [
    {
      "foodId": "food-id",
      "quantity": 2
    }
  ]
}
```

The request MUST NOT be trusted for:

- customer_id
- total
- unit price
- food name
- order status

The authenticated customer identity must be taken from the authenticated token/session.

Backend must:

1. Validate request.
2. Validate every food exists.
3. Reject archived foods.
4. Reject unavailable foods.
5. Reject zero/negative/non-integer quantities.
6. Fetch authoritative food prices from PostgreSQL.
7. Calculate line totals on the server.
8. Calculate order total on the server.
9. Store food name snapshot.
10. Store unit price snapshot.
11. Create order and order items atomically.
12. Return the created order.

Use a database transaction.

A client-supplied total must never override the server calculation.

## GET `/api/v1/customer/orders`

Authorization:
- CUSTOMER only

Return only orders belonging to the authenticated customer.

Never allow:

`?customerId=another-customer`

to override ownership.

## GET `/api/v1/customer/orders/:id`

Authorization:
- CUSTOMER only

Return the order only if its `customer_id` belongs to the authenticated customer.

If the order belongs to another customer, deny access.

Do not rely only on a frontend check.

---

# 11. Staff order APIs

## GET `/api/v1/orders`

Authorization:
- ADMIN or OPERATOR

Purpose:
- List/process staff orders.

Support status filtering because the assessment explicitly requires an order list with status filtering.

Example:

`GET /api/v1/orders?status=PLACED`

Validate status filter values.

## GET `/api/v1/orders/:id`

Authorization:
- ADMIN or OPERATOR

Purpose:
- View order details.

Include:
- order reference
- customer information appropriate for staff
- status
- notes
- items
- quantities
- snapshots
- total
- timestamps

Do not expose password/security fields.

## PATCH `/api/v1/orders/:id/notes`

Authorization:
- ADMIN or OPERATOR

Purpose:
- Edit order notes.

Validate note length/content.

## PATCH `/api/v1/orders/:id/status`

Authorization:
- ADMIN or OPERATOR

Purpose:
- Process an order according to the required state machine.

---

# 12. Order state machine

Required workflow:

```text
PLACED -> PREPARING -> COMPLETED
```

Staff may cancel a:

```text
PLACED -> CANCELLED
```

Terminal states:

```text
COMPLETED
CANCELLED
```

Allowed transitions:

```text
PLACED       -> PREPARING
PLACED       -> CANCELLED
PREPARING    -> COMPLETED
COMPLETED    -> none
CANCELLED    -> none
```

Reject every other transition.

Examples that MUST fail:

```text
COMPLETED -> PREPARING
COMPLETED -> CANCELLED
CANCELLED -> PLACED
CANCELLED -> PREPARING
PREPARING -> CANCELLED
PLACED -> COMPLETED
```

The backend must enforce this even when the API is called directly.

Do not rely on React button visibility.

Keep transition logic centralized and testable.

---

# 13. Database requirements

Use PostgreSQL.

Required entities:

- Users
- Foods
- Orders
- OrderItems

Use proper foreign keys and constraints.

Important constraints:

- Users email unique
- Orders reference unique
- Order customer foreign key
- Order item order foreign key
- Order item food foreign key
- Quantity positive
- Appropriate NOT NULL constraints
- Appropriate enum/check constraints where supported
- Exact monetary type
- Useful indexes

Recommended indexes should support actual access patterns, for example:

- users.email
- orders.reference
- orders.customer_id
- orders.status
- orders.created_at
- order_items.order_id

Do not add indexes without a reason.

---

# 14. Order history snapshots

Order history must be immutable with respect to later catalog edits.

When an order item is created, copy:

```text
food.name -> orderItem.foodNameSnapshot
food.price -> orderItem.unitPriceSnapshot
```

Then calculate:

```text
lineTotal = unitPriceSnapshot * quantity
```

Later changes to the food catalog must NOT change historical order values.

Example:

Food price at order time:

`₹250`

Order item stores:

`unitPriceSnapshot = 250`

If the food is later changed to:

`₹300`

the historical order remains:

`₹250`

---

# 15. Transactions

Order creation must be atomic.

Use a database transaction:

```text
BEGIN
  validate/fetch authoritative foods
  create order
  create order items
  calculate/store total
COMMIT
```

If any required operation fails:

```text
ROLLBACK
```

Never leave an order without its required items.

---

# 16. Seed data

Seed exactly the required minimum:

- 1 administrator
- 1 operator
- 2 customers
- 4 foods
- At least 1 food unavailable
- 3 orders

Keep test credentials local and document them in README.

Use safe development-only credentials.

Do not put production secrets in seed files.

The seed must be repeatable or clearly documented.

---

# 17. Validation

Use Zod or an equivalent validation library.

Create request schemas for:

- login
- create user
- update user
- create food
- update food
- availability update
- archive operation if request body is used
- order creation
- order notes
- order status
- query parameters where validation is needed

Validation errors should return a consistent 4xx response.

Never let malformed input reach business logic unnecessarily.

---

# 18. Error handling

Create centralized error handling.

Expected categories:

- Validation errors → 400
- Authentication missing/invalid → 401
- Authenticated but forbidden → 403
- Resource not found → 404
- Conflict such as duplicate email/reference → 409
- Unexpected server failure → 500

Do not expose stack traces or sensitive implementation details.

Log unexpected errors appropriately for development/debugging.

---

# 19. Architecture

Prefer a modular structure similar to:

```text
src/
├── config/
├── middleware/
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.routes.ts
│   │   └── auth.schema.ts
│   │
│   ├── users/
│   ├── foods/
│   └── orders/
│
├── utils/
├── app.ts
└── server.ts
```

Keep:

```text
Routes
  ↓
Controller
  ↓
Service
  ↓
Prisma/Data Access
  ↓
PostgreSQL
```

Authorization middleware can run before controllers/services.

Business rules must live in services/domain logic, not in route declarations.

Avoid giant files.

Avoid circular dependencies.

---

# 20. API response consistency

Prefer consistent response structures.

Success:

```json
{
  "success": true,
  "data": {}
}
```

List:

```json
{
  "success": true,
  "data": []
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to access this resource."
  }
}
```

Do not create a different response style for every module.

---

# 21. Testing requirements

Automated tests are mandatory.

At minimum implement tests for:

## Test 1 — Operator denied user management

```text
OPERATOR
    ↓
GET/POST/PATCH /api/v1/users
    ↓
403
```

## Test 2 — Customer denied another customer's order

```text
Customer A
    ↓
GET /api/v1/customer/orders/{Customer B order}
    ↓
403
```

## Test 3 — Invalid order transition

```text
COMPLETED
    ↓
PREPARING
    ↓
400
```

## Test 4 — Server-calculated total

Send a deliberately incorrect client total.

Backend must calculate the correct total from database food prices.

## Test 5 — Unavailable food rejection

Attempt to order an unavailable food.

Expected:

```text
4xx rejection
```

Also test useful happy paths:

- valid login
- invalid login
- admin user creation
- food creation
- customer order creation
- valid order transition
- customer own-order lookup

Do not write tests that merely test implementation details. Test observable API behavior and business rules.

---

# 22. Test database

Document how tests get a clean database.

Prefer an isolated test database or controlled test database lifecycle.

Never run destructive test setup against a developer's important database.

Tests must be repeatable.

---

# 23. OpenAPI / API documentation

Provide an OpenAPI specification or Postman collection.

At minimum document:

- Login
- Food listing
- Food CRUD operations
- User operations
- Staff order operations
- Customer order creation
- Customer order list/detail
- Current identity
- Authorization requirements
- Request examples
- Success responses
- Common errors

Every implemented route must be documented with:

- HTTP method
- URL
- authorization
- request example
- success response
- common errors

Keep the documentation synchronized with the implementation.

---

# 24. Environment configuration

Use `.env`.

Commit only:

`.env.example`

Example:

```env
DATABASE_URL=
JWT_SECRET=
PORT=5000
CORS_ORIGIN=
```

Do not hardcode:

- database credentials
- JWT secret
- API keys
- passwords

---

# 25. Git/GitHub workflow

Use feature branches.

Suggested branches:

```text
main
feature/project-setup
feature/database-schema
feature/auth-rbac
feature/foods-api
feature/orders-api
feature/tests
feature/api-docs
feature/ci
```

Use clear commits.

Examples:

```text
chore: initialize backend project
feat(db): add initial prisma schema
feat(auth): add jwt authentication
feat(auth): add role based authorization
feat(users): add staff management api
feat(foods): add food management api
feat(orders): add customer order creation
feat(orders): enforce order status transitions
test(auth): cover role authorization
test(orders): cover ownership and pricing rules
docs(api): add openapi specification
ci: add backend github actions
```

Do not make meaningless commits such as:

```text
fix
changes
final
final2
done
```

---

# 26. GitHub Actions

CI must run on:

- Pull requests
- Pushes to main

Pipeline should run:

```text
install
  ↓
lint
  ↓
typecheck
  ↓
tests
  ↓
build
```

If a database is required for tests, configure a dedicated CI PostgreSQL service or another documented isolated test setup.

CI must fail if:

- lint fails
- TypeScript fails
- tests fail
- build fails

---

# 27. Quality gates before declaring backend complete

Do NOT declare the backend finished until all are true:

## Functional

- [ ] Login works
- [ ] `/auth/me` works
- [ ] Admin user management works
- [ ] Operator cannot access user management
- [ ] Food CRUD works
- [ ] Food availability can be changed
- [ ] Food can be archived
- [ ] Customers can see available/non-archived foods
- [ ] Customers can create orders
- [ ] Unavailable foods are rejected
- [ ] Archived foods are rejected
- [ ] Invalid quantities are rejected
- [ ] Server calculates totals
- [ ] Order creation is transactional
- [ ] Name/price snapshots are stored
- [ ] Staff can list orders
- [ ] Staff can filter orders by status
- [ ] Staff can view order details
- [ ] Staff can edit notes
- [ ] Staff can update valid statuses
- [ ] Invalid status transitions are rejected
- [ ] Customer can list own orders
- [ ] Customer can view own order
- [ ] Customer cannot view another customer's order

## Security

- [ ] Passwords hashed
- [ ] JWT secret from environment
- [ ] `.env` ignored
- [ ] No secrets committed
- [ ] Backend RBAC enforced
- [ ] Ownership enforced server-side
- [ ] Input validation everywhere required
- [ ] No client-controlled total
- [ ] No client-controlled customer ownership
- [ ] No client-controlled authorization role
- [ ] No sensitive fields returned

## Database

- [ ] PostgreSQL used
- [ ] Prisma migrations work
- [ ] Foreign keys work
- [ ] Unique constraints work
- [ ] Exact monetary type used
- [ ] Useful indexes added
- [ ] Seed script works
- [ ] Required seed data exists

## Tests

- [ ] Operator denied user management
- [ ] Customer denied another customer's order
- [ ] Invalid transition
- [ ] Server-calculated total
- [ ] Unavailable food rejection
- [ ] Core happy paths

## Documentation

- [ ] README
- [ ] Architecture
- [ ] Database/schema explanation
- [ ] Assumptions
- [ ] Environment variables
- [ ] Install instructions
- [ ] Migration instructions
- [ ] Seed instructions
- [ ] Test instructions
- [ ] Test accounts
- [ ] API documentation
- [ ] OpenAPI/Postman
- [ ] Known limitations
- [ ] Actual time spent
- [ ] AI assistance disclosure

## CI

- [ ] PR workflow
- [ ] main branch workflow
- [ ] lint
- [ ] typecheck
- [ ] tests
- [ ] build

---

# 28. Development workflow for the coding agent

Before implementing anything:

1. Inspect the existing repository.
2. Inspect `package.json`.
3. Inspect TypeScript configuration.
4. Inspect Prisma configuration and installed Prisma version.
5. Inspect `.env.example`.
6. Do not overwrite working configuration without reason.
7. Create a short implementation plan.
8. Implement one coherent feature at a time.
9. Run typecheck/tests after meaningful changes.
10. Fix errors before moving to the next feature.
11. Update documentation when behavior/API changes.
12. Keep commits focused.

Never assume the repository is empty just because a particular file is missing.

---

# 29. Implementation order

Implement backend in this order unless there is a concrete reason to change it:

### Phase 1 — Setup
- Node/Express/TypeScript
- environment configuration
- security middleware
- error handling foundation
- health route
- lint/typecheck/build scripts

### Phase 2 — Database
- Prisma configuration
- Users
- Foods
- Orders
- OrderItems
- enums/constraints/indexes
- migrations
- seed data

### Phase 3 — Authentication
- password hashing
- login
- JWT
- authentication middleware
- `/auth/me`

### Phase 4 — Authorization
- role middleware
- ADMIN
- OPERATOR
- CUSTOMER
- ownership checks

### Phase 5 — Users API
- list
- create
- view
- update

### Phase 6 — Foods API
- list
- create
- view
- update
- availability
- archive
- available-food customer API

### Phase 7 — Orders
- customer order creation
- server pricing
- availability/archive checks
- snapshots
- transaction
- own-order list/detail
- staff order list/filter/detail
- notes
- status transitions

### Phase 8 — Tests
- required security tests
- required business-rule tests
- core happy paths

### Phase 9 — API docs
- OpenAPI/Postman
- examples
- errors
- authorization

### Phase 10 — CI
- GitHub Actions
- lint
- typecheck
- test
- build

### Phase 11 — Final hardening
- security review
- API review
- database review
- test review
- README
- clean-clone verification

---

# 30. Definition of done

Before declaring scope complete, verify that the implementation contains all four intended backend business modules:

```text
auth
users
foods
orders
```

and that Administrator/Operator access is implemented as role-based permissions over those modules rather than as a duplicated `admin` business module.

The backend is complete only when a reviewer can:

1. Clone the backend repository.
2. Configure environment variables.
3. Create/setup PostgreSQL.
4. Run Prisma migrations.
5. Seed the database.
6. Start the API.
7. Login as admin.
8. Login as operator.
9. Login as customer.
10. Verify operator cannot access user management.
11. Manage foods according to permissions.
12. Create a customer order through the API.
13. Verify unavailable/archived foods are rejected.
14. Verify the server calculates the order total.
15. Verify order snapshots are stored.
16. Process the order through valid statuses.
17. Verify invalid status transitions fail.
18. Verify customers can only access their own orders.
19. Run automated tests.
20. Run the same checks through GitHub Actions.
21. Read API documentation and understand every implemented route.

Do not mark the backend complete if any required acceptance behavior is missing.

---

# 31. Scope discipline

Do not add unnecessary features before all assessment requirements are complete.

Do NOT prioritize:

- payments
- WebSockets
- mobile app
- push notifications
- microservices
- Redis
- complex analytics
- recommendation systems
- production deployment
- unnecessary abstractions
- unnecessary dependencies

First maximize correctness, security, testability, documentation, and assessment coverage.

---

# 32. AI/code quality rule

AI assistance is allowed for development, but the final implementation must be understandable and explainable by the developer.

Do not generate code blindly.

Before accepting generated code:

- Understand what it does.
- Check authorization behavior.
- Check error handling.
- Check database behavior.
- Check security implications.
- Run tests/typecheck.
- Remove unnecessary generated complexity.

The final README must disclose AI assistance as requested by the assessment.

---

# 33. Final instruction

Optimize for:

**Security > Correctness > Database integrity > Business rules > Testability > Maintainability > Documentation > UI integration > Extra features**

Never sacrifice backend authorization or data integrity to save implementation time.

If a requirement from the assessment conflicts with a convenience implementation, follow the assessment requirement.

If something is ambiguous, choose the smallest secure implementation that satisfies the documented requirement and record the assumption in the README.
