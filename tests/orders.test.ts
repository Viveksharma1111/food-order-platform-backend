import jwt from "jsonwebtoken";
import { OrderStatus, UserRole } from "@prisma/client";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { env } from "../src/config/env.js";
import { prisma } from "../src/lib/prisma.js";

const userIds = { admin: "phase5-admin", operator: "phase5-operator", customerA: "phase5-customer-a", customerB: "phase5-customer-b" };
const foodIds = { available: "phase5-available", another: "phase5-another", unavailable: "phase5-unavailable", archived: "phase5-archived", trigger: "phase5-fail-food" };

function bearerToken(userId: string): string {
  return jwt.sign({}, env.JWT_SECRET, { algorithm: "HS256", subject: userId, expiresIn: "1h" });
}

function asUser(userId: string) {
  return { Authorization: `Bearer ${bearerToken(userId)}` };
}

function staffRequest(method: "get" | "patch", path: string, role: "admin" | "operator") {
  return request(app)[method](path).set(asUser(userIds[role]));
}

async function createOrder(customerId = userIds.customerA, items = [{ foodId: foodIds.available, quantity: 2 }], extra: Record<string, unknown> = {}) {
  return request(app).post("/api/v1/customer/orders")
    .set(asUser(customerId))
    .send({ items, ...extra });
}

beforeEach(async () => {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.food.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.createMany({
    data: [
      { id: userIds.admin, name: "Phase Five Admin", email: "phase5.admin@example.com", passwordHash: "test-only-hash", role: UserRole.ADMIN, active: true },
      { id: userIds.operator, name: "Phase Five Operator", email: "phase5.operator@example.com", passwordHash: "test-only-hash", role: UserRole.OPERATOR, active: true },
      { id: userIds.customerA, name: "Customer One", email: "phase5.customer1@example.com", passwordHash: "test-only-hash", role: UserRole.CUSTOMER, active: true },
      { id: userIds.customerB, name: "Customer Two", email: "phase5.customer2@example.com", passwordHash: "test-only-hash", role: UserRole.CUSTOMER, active: true },
    ],
  });

  await prisma.food.createMany({
    data: [
      { id: foodIds.available, name: "Snapshot Pizza", description: "Available pizza", category: "Pizza", price: "250.10", available: true, archived: false },
      { id: foodIds.another, name: "Snapshot Tea", description: "Available tea", category: "Drinks", price: "12.35", available: true, archived: false },
      { id: foodIds.unavailable, name: "Unavailable Pasta", description: "Temporarily unavailable", category: "Pasta", price: "310.00", available: false, archived: false },
      { id: foodIds.archived, name: "Archived Soup", description: "Archived item", category: "Soup", price: "125.50", available: true, archived: true },
      { id: foodIds.trigger, name: "Trigger Failure Food", description: "Test-only transaction failure", category: "Test", price: "1.00", available: true, archived: false },
    ],
  });
});

afterEach(async () => {
  await prisma.$executeRawUnsafe("DROP TRIGGER IF EXISTS phase5_fail_order_item_insert ON order_items");
  await prisma.$executeRawUnsafe("DROP FUNCTION IF EXISTS phase5_fail_order_item_insert()");
});

describe("customer order creation", () => {
  it("allows CUSTOMER to create a server-owned order with generated reference and PLACED status", async () => {
    const response = await createOrder(userIds.customerA, [{ foodId: foodIds.available, quantity: 2 }], { notes: "Less spicy" });
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      status: "PLACED",
      notes: "Less spicy",
      total: "500.20",
      items: [{ foodId: foodIds.available, foodName: "Snapshot Pizza", unitPrice: "250.10", quantity: 2, lineTotal: "500.20" }],
    });
    expect(response.body.data.reference).toMatch(/^ORD-[0-9A-F]{24}$/);
    expect(response.body.data.customer).toBeUndefined();
    const stored = await prisma.order.findUnique({ where: { id: response.body.data.id } });
    expect(stored?.customerId).toBe(userIds.customerA);
    expect(stored?.reference).toBe(response.body.data.reference);
    expect(stored?.total.toFixed(2)).toBe("500.20");
  });

  it.each(["admin", "operator"] as const)("denies %s access to customer order creation", async (role) => {
    const response = await request(app).post("/api/v1/customer/orders").set(asUser(userIds[role]))
      .send({ items: [{ foodId: foodIds.available, quantity: 1 }] });
    expect(response.status).toBe(403);
  });

  it("requires authentication", async () => {
    const response = await request(app).post("/api/v1/customer/orders").send({ items: [{ foodId: foodIds.available, quantity: 1 }] });
    expect(response.status).toBe(401);
  });

  it.each([
    ["customerId", userIds.customerB], ["reference", "ORD-CLIENT-CONTROLLED"], ["status", "COMPLETED"],
    ["total", "0.01"], ["price", "0.01"], ["lineTotal", "0.01"], ["total", "NaN"], ["price", "NaN"],
  ])("rejects client-controlled order field %s", async (field, value) => {
    const response = await createOrder(userIds.customerA, [{ foodId: foodIds.available, quantity: 1 }], { [field]: value });
    expect(response.status).toBe(400);
    expect(await prisma.order.count()).toBe(0);
  });

  it.each([
    { foodId: foodIds.available, quantity: 0 },
    { foodId: foodIds.available, quantity: -1 },
    { foodId: foodIds.available, quantity: 1.5 },
    { foodId: foodIds.available },
    { foodId: foodIds.available, quantity: "2" },
    { foodId: "bad id", quantity: 1 },
  ])("rejects invalid quantity or food ID structure", async (item) => {
    const response = await createOrder(userIds.customerA, [item as { foodId: string; quantity: number }]);
    expect(response.status).toBe(400);
    expect(await prisma.order.count()).toBe(0);
  });

  it("rejects empty item lists, unknown item fields, and duplicate foods", async () => {
    const empty = await createOrder(userIds.customerA, []);
    const unknown = await createOrder(userIds.customerA, [{ foodId: foodIds.available, quantity: 1, unitPrice: "0.01" } as never]);
    const duplicate = await createOrder(userIds.customerA, [
      { foodId: foodIds.available, quantity: 1 }, { foodId: foodIds.available, quantity: 2 },
    ]);
    expect(empty.status).toBe(400);
    expect(unknown.status).toBe(400);
    expect(duplicate.status).toBe(400);
  });

  it("returns 404 for a nonexistent food", async () => {
    const response = await createOrder(userIds.customerA, [{ foodId: "missing-food", quantity: 1 }]);
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("FOOD_NOT_FOUND");
    expect(await prisma.order.count()).toBe(0);
  });

  it.each([
    [foodIds.unavailable, "FOOD_UNAVAILABLE"],
    [foodIds.archived, "FOOD_ARCHIVED"],
  ])("rejects unavailable or archived food %s", async (foodId, code) => {
    const response = await createOrder(userIds.customerA, [{ foodId, quantity: 1 }]);
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe(code);
    expect(await prisma.order.count()).toBe(0);
  });

  it("calculates exact line totals and combined totals from stored prices, ignoring no client pricing", async () => {
    const response = await createOrder(userIds.customerA, [
      { foodId: foodIds.available, quantity: 3 },
      { foodId: foodIds.another, quantity: 2 },
    ]);
    expect(response.status).toBe(201);
    expect(response.body.data.total).toBe("775.00");
    expect(response.body.data.items.map((item: { lineTotal: string }) => item.lineTotal).sort()).toEqual(["24.70", "750.30"]);
    const storedItems = await prisma.orderItem.findMany({ where: { orderId: response.body.data.id }, orderBy: { foodId: "asc" } });
    expect(storedItems.map((item) => item.lineTotal.toFixed(2))).toEqual(["24.70", "750.30"]);
  });

  it("does not create an order or items if any requested food is unavailable or archived", async () => {
    const response = await createOrder(userIds.customerA, [
      { foodId: foodIds.available, quantity: 1 }, { foodId: foodIds.unavailable, quantity: 1 },
    ]);
    expect(response.status).toBe(409);
    expect(await prisma.order.count()).toBe(0);
    expect(await prisma.orderItem.count()).toBe(0);
  });

  it("rolls back order creation if a database error occurs while inserting an item", async () => {
    await prisma.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION phase5_fail_order_item_insert() RETURNS trigger AS $$
      BEGIN
        IF NEW.food_id = 'phase5-fail-food' THEN
          RAISE EXCEPTION 'test-only order item insert failure';
        END IF;
        RETURN NEW;
      END;
    $$ LANGUAGE plpgsql`);
    await prisma.$executeRawUnsafe("CREATE TRIGGER phase5_fail_order_item_insert BEFORE INSERT ON order_items FOR EACH ROW EXECUTE FUNCTION phase5_fail_order_item_insert()");

    const response = await createOrder(userIds.customerA, [
      { foodId: foodIds.available, quantity: 1 }, { foodId: foodIds.trigger, quantity: 1 },
    ]);
    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(await prisma.order.count()).toBe(0);
    expect(await prisma.orderItem.count()).toBe(0);
  });

  it("stores immutable food name and price snapshots", async () => {
    const created = await createOrder(userIds.customerA, [{ foodId: foodIds.available, quantity: 2 }]);
    await prisma.food.update({ where: { id: foodIds.available }, data: { name: "Renamed Pizza", price: "999.99" } });
    const detail = await request(app).get(`/api/v1/customer/orders/${created.body.data.id}`).set(asUser(userIds.customerA));
    expect(detail.body.data.items[0]).toMatchObject({ foodName: "Snapshot Pizza", unitPrice: "250.10", quantity: 2, lineTotal: "500.20" });
    expect(detail.body.data.total).toBe("500.20");
  });
});

describe("customer order ownership", () => {
  it("lists only orders owned by the authenticated customer", async () => {
    await createOrder(userIds.customerA);
    await createOrder(userIds.customerB, [{ foodId: foodIds.another, quantity: 1 }]);
    const response = await request(app).get("/api/v1/customer/orders").set(asUser(userIds.customerA));
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].total).toBe("500.20");
    expect(response.body.data[0].customer).toBeUndefined();
  });

  it("rejects customerId query parameters instead of allowing ownership selection", async () => {
    const response = await request(app).get(`/api/v1/customer/orders?customerId=${userIds.customerB}`).set(asUser(userIds.customerA));
    expect(response.status).toBe(400);
  });

  it("allows a customer to view their own order", async () => {
    const created = await createOrder(userIds.customerA);
    const response = await request(app).get(`/api/v1/customer/orders/${created.body.data.id}`).set(asUser(userIds.customerA));
    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(created.body.data.id);
  });

  it("returns safe 404 for another customer's order", async () => {
    const created = await createOrder(userIds.customerB);
    const response = await request(app).get(`/api/v1/customer/orders/${created.body.data.id}`).set(asUser(userIds.customerA));
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("ORDER_NOT_FOUND");
  });

  it("returns safe 404 for an unknown order ID and 400 for a malformed ID", async () => {
    const missing = await request(app).get("/api/v1/customer/orders/missing-order").set(asUser(userIds.customerA));
    const malformed = await request(app).get("/api/v1/customer/orders/not%20valid").set(asUser(userIds.customerA));
    expect(missing.status).toBe(404);
    expect(malformed.status).toBe(400);
  });
});

describe("staff order management", () => {
  it.each(["admin", "operator"] as const)("allows %s to list all orders and view details", async (role) => {
    const first = await createOrder(userIds.customerA);
    await createOrder(userIds.customerB, [{ foodId: foodIds.another, quantity: 1 }]);
    const list = await staffRequest("get", "/api/v1/orders", role);
    const detail = await staffRequest("get", `/api/v1/orders/${first.body.data.id}`, role);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(2);
    expect(detail.status).toBe(200);
    expect(detail.body.data.customer).toMatchObject({ id: userIds.customerA, email: "phase5.customer1@example.com" });
    expect(detail.body.data.customer.passwordHash).toBeUndefined();
  });

  it("filters staff order lists by a valid status and rejects invalid filters", async () => {
    const placed = await createOrder();
    const preparing = await createOrder(userIds.customerB, [{ foodId: foodIds.another, quantity: 1 }]);
    await prisma.order.update({ where: { id: preparing.body.data.id }, data: { status: OrderStatus.PREPARING } });
    const filtered = await staffRequest("get", "/api/v1/orders?status=PLACED", "admin");
    const invalid = await staffRequest("get", "/api/v1/orders?status=NOT_A_STATUS", "admin");
    expect(filtered.status).toBe(200);
    expect(filtered.body.data).toHaveLength(1);
    expect(filtered.body.data[0].id).toBe(placed.body.data.id);
    expect(invalid.status).toBe(400);
  });

  it("denies customer access to staff list, detail, notes, and status routes", async () => {
    const created = await createOrder();
    const list = await request(app).get("/api/v1/orders").set(asUser(userIds.customerA));
    const detail = await request(app).get(`/api/v1/orders/${created.body.data.id}`).set(asUser(userIds.customerA));
    const notes = await request(app).patch(`/api/v1/orders/${created.body.data.id}/notes`).set(asUser(userIds.customerA)).send({ notes: "No" });
    const status = await request(app).patch(`/api/v1/orders/${created.body.data.id}/status`).set(asUser(userIds.customerA)).send({ status: "PREPARING" });
    expect([list.status, detail.status, notes.status, status.status]).toEqual([403, 403, 403, 403]);
  });

  it.each(["admin", "operator"] as const)("allows %s to edit notes without changing protected order fields", async (role) => {
    const created = await createOrder();
    const response = await staffRequest("patch", `/api/v1/orders/${created.body.data.id}/notes`, role).send({ notes: "Kitchen note" });
    expect(response.status).toBe(200);
    expect(response.body.data.notes).toBe("Kitchen note");
    const stored = await prisma.order.findUniqueOrThrow({ where: { id: created.body.data.id } });
    expect(stored.total.toFixed(2)).toBe("500.20");
    expect(stored.status).toBe("PLACED");
  });

  it.each([{ status: "COMPLETED" }, { total: "0.01" }, { reference: "x" }, { customerId: userIds.customerB }, {}])("rejects protected or invalid notes update $status", async (payload) => {
    const created = await createOrder();
    const response = await staffRequest("patch", `/api/v1/orders/${created.body.data.id}/notes`, "admin").send(payload);
    expect(response.status).toBe(400);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: created.body.data.id } })).total.toFixed(2)).toBe("500.20");
  });
});

describe("order status state machine", () => {
  const statuses = [OrderStatus.PLACED, OrderStatus.PREPARING, OrderStatus.COMPLETED, OrderStatus.CANCELLED] as const;
  const allowed = new Set(["PLACED:PREPARING", "PLACED:CANCELLED", "PREPARING:COMPLETED"]);
  const cases = statuses.flatMap((current) => statuses.map((requested) => [current, requested, allowed.has(`${current}:${requested}`)] as const));

  it.each(cases)("handles %s -> %s according to the state machine", async (current, requested, isAllowed) => {
    const created = await createOrder();
    await prisma.order.update({ where: { id: created.body.data.id }, data: { status: current } });
    const response = await staffRequest("patch", `/api/v1/orders/${created.body.data.id}/status`, "operator").send({ status: requested });
    expect(response.status).toBe(isAllowed ? 200 : 409);
    expect(response.body.data?.status ?? (await prisma.order.findUniqueOrThrow({ where: { id: created.body.data.id } })).status)
      .toBe(isAllowed ? requested : current);
  });

  it("rejects an invalid status value and extra fields", async () => {
    const created = await createOrder();
    const invalid = await staffRequest("patch", `/api/v1/orders/${created.body.data.id}/status`, "admin").send({ status: "SHIPPED" });
    const extra = await staffRequest("patch", `/api/v1/orders/${created.body.data.id}/status`, "admin").send({ status: "PREPARING", notes: "unexpected" });
    expect(invalid.status).toBe(400);
    expect(extra.status).toBe(400);
  });
});
