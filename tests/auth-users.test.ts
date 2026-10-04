import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { env } from "../src/config/env.js";
import { prisma } from "../src/lib/prisma.js";

const password = "PhaseThreeTest@123!";
const ids = {
  admin: "phase3-admin",
  operator: "phase3-operator",
  customer: "phase3-customer",
  inactive: "phase3-inactive",
};

let passwordHash: string;

async function login(email: string, userPassword = password) {
  return request(app).post("/api/v1/auth/login").send({ email, password: userPassword });
}

async function tokenFor(email: string): Promise<string> {
  const response = await login(email);
  expect(response.status).toBe(200);
  return response.body.data.token as string;
}

beforeAll(async () => {
  passwordHash = await bcrypt.hash(password, 4);
});

beforeEach(async () => {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.food.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.createMany({
    data: [
      { id: ids.admin, name: "Test Admin", email: "admin.test@example.com", passwordHash, role: UserRole.ADMIN, active: true },
      { id: ids.operator, name: "Test Operator", email: "operator.test@example.com", passwordHash, role: UserRole.OPERATOR, active: true },
      { id: ids.customer, name: "Test Customer", email: "customer.test@example.com", passwordHash, role: UserRole.CUSTOMER, active: true },
      { id: ids.inactive, name: "Inactive Staff", email: "inactive.test@example.com", passwordHash, role: UserRole.OPERATOR, active: false },
    ],
  });
});

describe("authentication", () => {
  it("logs in with normalized email and returns safe identity plus a minimal JWT", async () => {
    const response = await login("  ADMIN.TEST@EXAMPLE.COM  ");
    expect(response.status).toBe(200);
    expect(response.body.data.user).toMatchObject({ id: ids.admin, role: "ADMIN", active: true });
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(response.body.data.expiresIn).toBe(env.JWT_EXPIRES_IN);
    const payload = jwt.decode(response.body.data.token) as jwt.JwtPayload;
    expect(Object.keys(payload).sort()).toEqual(["exp", "iat", "sub"]);
    expect(payload.sub).toBe(ids.admin);
  });

  it("rejects an incorrect password with a generic authentication response", async () => {
    const response = await login("admin.test@example.com", "WrongPassword!123");
    expect(response.status).toBe(401);
    expect(response.body.error).toEqual({ code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." });
  });

  it("rejects an unknown email with the same safe response", async () => {
    const response = await login("missing.test@example.com");
    expect(response.status).toBe(401);
    expect(response.body.error).toEqual({ code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." });
  });

  it("rejects inactive users at login", async () => {
    const response = await login("inactive.test@example.com");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("returns the current database-backed identity from /auth/me", async () => {
    const token = await tokenFor("admin.test@example.com");
    const response = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ id: ids.admin, role: "ADMIN", active: true });
    expect(response.body.data.passwordHash).toBeUndefined();
  });

  it.each(["bad-token", "Bearer", "Basic token"]) ("rejects malformed or invalid bearer credentials (%s)", async (authorization) => {
    const response = await request(app).get("/api/v1/auth/me").set("Authorization", authorization);
    expect(response.status).toBe(401);
  });

  it("rejects an expired token", async () => {
    const token = jwt.sign({}, env.JWT_SECRET, { subject: ids.admin, expiresIn: "-1s", algorithm: "HS256" });
    const response = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(401);
  });

  it("rejects a correctly signed token without an expiry", async () => {
    const token = jwt.sign({}, env.JWT_SECRET, { subject: ids.admin, algorithm: "HS256" });
    const response = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(401);
  });

  it("rejects a previously valid token after the user is deactivated", async () => {
    const token = await tokenFor("operator.test@example.com");
    await prisma.user.update({ where: { id: ids.operator }, data: { active: false } });
    const response = await request(app).get("/api/v1/users").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(401);
  });
});

describe("role authorization and user management", () => {
  it("requires authentication for users endpoints", async () => {
    const response = await request(app).get("/api/v1/users");
    expect(response.status).toBe(401);
  });

  it("allows ADMIN to list and view staff but excludes customers", async () => {
    const token = await tokenFor("admin.test@example.com");
    const list = await request(app).get("/api/v1/users").set("Authorization", `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(3);
    expect(list.body.data.map((user: { id: string }) => user.id)).not.toContain(ids.customer);
    expect(list.body.data.every((user: { passwordHash?: string }) => user.passwordHash === undefined)).toBe(true);

    const detail = await request(app).get(`/api/v1/users/${ids.operator}`).set("Authorization", `Bearer ${token}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.id).toBe(ids.operator);
    expect(detail.body.data.passwordHash).toBeUndefined();
  });

  it.each(["operator.test@example.com", "customer.test@example.com"])("denies user management to %s", async (email) => {
    const token = await tokenFor(email);
    const response = await request(app).get("/api/v1/users").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(403);
  });

  it("lets ADMIN create an operator with a hashed password and safe response", async () => {
    const token = await tokenFor("admin.test@example.com");
    const response = await request(app).post("/api/v1/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "New Operator", email: "new.operator@example.com", password: "NewOperatorPass@123", role: "OPERATOR" });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ name: "New Operator", role: "OPERATOR", active: true });
    expect(response.body.data.passwordHash).toBeUndefined();
    const stored = await prisma.user.findUniqueOrThrow({ where: { email: "new.operator@example.com" } });
    expect(stored.passwordHash).not.toBe("NewOperatorPass@123");
    expect(await bcrypt.compare("NewOperatorPass@123", stored.passwordHash)).toBe(true);
  });

  it("lets ADMIN update only supported name, role, and active fields", async () => {
    const token = await tokenFor("admin.test@example.com");
    const response = await request(app).patch(`/api/v1/users/${ids.operator}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Updated Operator", role: "ADMIN", active: false });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ name: "Updated Operator", role: "ADMIN", active: false });
    expect(response.body.data.passwordHash).toBeUndefined();
  });

  it("returns a conflict for duplicate email", async () => {
    const token = await tokenFor("admin.test@example.com");
    const response = await request(app).post("/api/v1/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Duplicate", email: "admin.test@example.com", password: "NewOperatorPass@123", role: "OPERATOR" });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
  });

  it("rejects CUSTOMER role and unknown sensitive fields", async () => {
    const token = await tokenFor("admin.test@example.com");
    const invalidRole = await request(app).post("/api/v1/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Customer", email: "new.customer@example.com", password: "NewOperatorPass@123", role: "CUSTOMER" });
    expect(invalidRole.status).toBe(400);

    const injectedHash = await request(app).patch(`/api/v1/users/${ids.operator}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ passwordHash: "attacker-value" });
    expect(injectedHash.status).toBe(400);
  });

  it("rejects malformed IDs and does not expose customer accounts", async () => {
    const token = await tokenFor("admin.test@example.com");
    const malformed = await request(app).get("/api/v1/users/not%20an%20id").set("Authorization", `Bearer ${token}`);
    expect(malformed.status).toBe(400);
    const customer = await request(app).get(`/api/v1/users/${ids.customer}`).set("Authorization", `Bearer ${token}`);
    expect(customer.status).toBe(404);
  });

  it("prevents an admin from demoting or deactivating their own account", async () => {
    const token = await tokenFor("admin.test@example.com");
    const response = await request(app).patch(`/api/v1/users/${ids.admin}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ active: false });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("SELF_LOCKOUT_PREVENTED");
  });
});
