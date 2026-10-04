import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { env } from "../src/config/env.js";
import { prisma } from "../src/lib/prisma.js";

const userIds = { admin: "phase4-admin", operator: "phase4-operator", customer: "phase4-customer" };
const foodIds = { available: "phase4-available", unavailable: "phase4-unavailable", archived: "phase4-archived" };

function bearerToken(userId: string): string {
  return jwt.sign({}, env.JWT_SECRET, { algorithm: "HS256", subject: userId, expiresIn: "1h" });
}

function staffRequest(method: "get" | "post" | "patch" | "delete", path: string, role: "admin" | "operator") {
  return request(app)[method](path).set("Authorization", `Bearer ${bearerToken(userIds[role])}`);
}

beforeEach(async () => {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.food.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.createMany({
    data: [
      { id: userIds.admin, name: "Phase Four Admin", email: "phase4.admin@example.com", passwordHash: "test-only-hash", role: UserRole.ADMIN, active: true },
      { id: userIds.operator, name: "Phase Four Operator", email: "phase4.operator@example.com", passwordHash: "test-only-hash", role: UserRole.OPERATOR, active: true },
      { id: userIds.customer, name: "Phase Four Customer", email: "phase4.customer@example.com", passwordHash: "test-only-hash", role: UserRole.CUSTOMER, active: true },
    ],
  });

  await prisma.food.createMany({
    data: [
      { id: foodIds.available, name: "Available Pizza", description: "Fresh tomato and mozzarella.", category: "Pizza", price: "249.00", available: true, archived: false },
      { id: foodIds.unavailable, name: "Unavailable Pasta", description: "Temporarily unavailable.", category: "Pasta", price: "310.00", available: false, archived: false },
      { id: foodIds.archived, name: "Archived Soup", description: "No longer on the menu.", category: "Soup", price: "125.50", available: true, archived: true },
    ],
  });
});

describe("food management authorization", () => {
  it.each(["admin", "operator"] as const)("allows %s to list every food, including unavailable and archived foods", async (role) => {
    const response = await staffRequest("get", "/api/v1/foods", role);
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(3);
    expect(response.body.data.map((food: { id: string }) => food.id)).toContain(foodIds.unavailable);
    expect(response.body.data.map((food: { id: string }) => food.id)).toContain(foodIds.archived);
    expect(response.body.data[0]).toHaveProperty("availability");
    expect(response.body.data[0]).toHaveProperty("archived");
    expect(response.body.data[0].price).toMatch(/^\d+\.\d{2}$/);
  });

  it("denies customers access to the staff listing", async () => {
    const response = await request(app).get("/api/v1/foods")
      .set("Authorization", `Bearer ${bearerToken(userIds.customer)}`);
    expect(response.status).toBe(403);
  });

  it.each(["admin", "operator"] as const)("allows %s to create food", async (role) => {
    const response = await staffRequest("post", "/api/v1/foods", role).send({
      name: "Margherita Pizza",
      description: "Classic tomato and mozzarella.",
      category: "Pizza",
      price: 249.00,
      availability: true,
    });
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ name: "Margherita Pizza", price: "249.00", availability: true, archived: false });
    expect(await prisma.food.count({ where: { name: "Margherita Pizza" } })).toBe(1);
  });

  it("denies customers access to food creation", async () => {
    const response = await request(app).post("/api/v1/foods")
      .set("Authorization", `Bearer ${bearerToken(userIds.customer)}`)
      .send({ name: "No", description: "No", category: "No", price: "1.00", availability: true });
    expect(response.status).toBe(403);
  });

  it.each(["admin", "operator"] as const)("allows %s to view and update food", async (role) => {
    const detail = await staffRequest("get", `/api/v1/foods/${foodIds.available}`, role);
    expect(detail.status).toBe(200);
    expect(detail.body.data).toMatchObject({ id: foodIds.available, name: "Available Pizza", price: "249.00" });

    const update = await staffRequest("patch", `/api/v1/foods/${foodIds.available}`, role)
      .send({ name: "Updated Pizza", price: "199.95" });
    expect(update.status).toBe(200);
    expect(update.body.data).toMatchObject({ name: "Updated Pizza", price: "199.95" });
  });

  it("denies customers staff food detail and update access", async () => {
    const token = bearerToken(userIds.customer);
    const detail = await request(app).get(`/api/v1/foods/${foodIds.available}`).set("Authorization", `Bearer ${token}`);
    const update = await request(app).patch(`/api/v1/foods/${foodIds.available}`)
      .set("Authorization", `Bearer ${token}`).send({ name: "Changed" });
    expect(detail.status).toBe(403);
    expect(update.status).toBe(403);
  });

  it("returns 404 for an unknown food ID", async () => {
    const response = await staffRequest("get", "/api/v1/foods/missing-food", "admin");
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("FOOD_NOT_FOUND");
  });
});

describe("customer available-food listing", () => {
  it("returns only available, unarchived customer-safe fields", async () => {
    const response = await request(app).get("/api/v1/foods/available")
      .set("Authorization", `Bearer ${bearerToken(userIds.customer)}`);
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({ id: foodIds.available, name: "Available Pizza", price: "249.00" });
    expect(response.body.data[0]).not.toHaveProperty("availability");
    expect(response.body.data[0]).not.toHaveProperty("archived");
  });

  it("requires authentication and the CUSTOMER role", async () => {
    const missing = await request(app).get("/api/v1/foods/available");
    const staff = await request(app).get("/api/v1/foods/available")
      .set("Authorization", `Bearer ${bearerToken(userIds.admin)}`);
    expect(missing.status).toBe(401);
    expect(staff.status).toBe(403);
  });
});

describe("food validation and exact monetary values", () => {
  const validFood = {
    name: "Test Food",
    description: "A description.",
    category: "Test",
    price: "10.00",
    availability: true,
  };

  it.each([0, "0.00"])("rejects zero food price (%s)", async (price) => {
    const response = await staffRequest("post", "/api/v1/foods", "admin").send({ ...validFood, price });
    expect(response.status).toBe(400);
  });

  it.each([-1, "-0.01"])("rejects negative food price (%s)", async (price) => {
    const response = await staffRequest("post", "/api/v1/foods", "admin").send({ ...validFood, price });
    expect(response.status).toBe(400);
  });

  it.each(["not-money", "NaN", "Infinity", "1.234", "100000000.00"])("rejects invalid monetary input (%s)", async (price) => {
    const response = await staffRequest("post", "/api/v1/foods", "admin").send({ ...validFood, price });
    expect(response.status).toBe(400);
  });

  it("rejects missing or blank names", async () => {
    const missing = await staffRequest("post", "/api/v1/foods", "admin").send({ ...validFood, name: undefined });
    const blank = await staffRequest("post", "/api/v1/foods", "admin").send({ ...validFood, name: "   " });
    expect(missing.status).toBe(400);
    expect(blank.status).toBe(400);
  });

  it("rejects invalid availability and unknown creation fields", async () => {
    const invalidAvailability = await staffRequest("post", "/api/v1/foods", "admin")
      .send({ ...validFood, availability: "yes" });
    const injectedArchive = await staffRequest("post", "/api/v1/foods", "admin")
      .send({ ...validFood, archived: true });
    const injectedId = await staffRequest("post", "/api/v1/foods", "admin")
      .send({ ...validFood, id: "attacker-id" });
    expect(invalidAvailability.status).toBe(400);
    expect(injectedArchive.status).toBe(400);
    expect(injectedId.status).toBe(400);
  });

  it("rejects malformed food IDs before database access", async () => {
    const response = await staffRequest("get", "/api/v1/foods/not%20valid", "admin");
    expect(response.status).toBe(400);
  });

  it("rejects empty updates and attempts to manipulate archived state", async () => {
    const empty = await staffRequest("patch", `/api/v1/foods/${foodIds.available}`, "admin").send({});
    const archiveField = await staffRequest("patch", `/api/v1/foods/${foodIds.available}`, "admin")
      .send({ archived: true });
    const updateField = await staffRequest("patch", `/api/v1/foods/${foodIds.available}`, "admin")
      .send({ createdAt: "2020-01-01T00:00:00Z" });
    expect(empty.status).toBe(400);
    expect(archiveField.status).toBe(400);
    expect(updateField.status).toBe(400);
  });
});

describe("availability and soft archive behavior", () => {
  it.each(["admin", "operator"] as const)("allows %s to toggle availability", async (role) => {
    const response = await staffRequest("patch", `/api/v1/foods/${foodIds.available}/availability`, role)
      .send({ availability: false });
    expect(response.status).toBe(200);
    expect(response.body.data.availability).toBe(false);
    const customerList = await request(app).get("/api/v1/foods/available")
      .set("Authorization", `Bearer ${bearerToken(userIds.customer)}`);
    expect(customerList.body.data.map((food: { id: string }) => food.id)).not.toContain(foodIds.available);
  });

  it("allows availability updates through the general PATCH endpoint", async () => {
    const response = await staffRequest("patch", `/api/v1/foods/${foodIds.unavailable}`, "admin")
      .send({ availability: true });
    expect(response.status).toBe(200);
    expect(response.body.data.availability).toBe(true);
  });

  it.each(["admin", "operator"] as const)("lets %s archive without deleting the row", async (role) => {
    const response = await staffRequest("delete", `/api/v1/foods/${foodIds.available}`, role);
    expect(response.status).toBe(200);
    expect(response.body.data.archived).toBe(true);
    expect(await prisma.food.count({ where: { id: foodIds.available } })).toBe(1);
    const available = await request(app).get("/api/v1/foods/available")
      .set("Authorization", `Bearer ${bearerToken(userIds.customer)}`);
    expect(available.body.data.map((food: { id: string }) => food.id)).not.toContain(foodIds.available);
  });

  it("supports the assessment archive route and rejects repeated archive attempts", async () => {
    const first = await staffRequest("patch", `/api/v1/foods/${foodIds.unavailable}/archive`, "admin");
    const second = await staffRequest("delete", `/api/v1/foods/${foodIds.unavailable}`, "admin");
    expect(first.status).toBe(200);
    expect(first.body.data.archived).toBe(true);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("FOOD_ALREADY_ARCHIVED");
  });

  it("keeps unavailable and archived foods visible to staff management", async () => {
    const response = await staffRequest("get", "/api/v1/foods", "admin");
    const unavailable = response.body.data.find((food: { id: string }) => food.id === foodIds.unavailable);
    const archived = response.body.data.find((food: { id: string }) => food.id === foodIds.archived);
    expect(unavailable.availability).toBe(false);
    expect(archived.archived).toBe(true);
  });
});
