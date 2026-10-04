import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole, OrderStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL must be set to run the Prisma seed.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

function multiplyMoneyByQuantity(amount: string, quantity: number): string {
  const [whole = "0", fraction = "00"] = amount.split(".");
  const minorUnits = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0").slice(0, 2));
  const total = minorUnits * BigInt(quantity);
  return `${total / 100n}.${(total % 100n).toString().padStart(2, "0")}`;
}

const users = [
  { id: "seed-admin", name: "Local Administrator", email: "admin@example.com", role: UserRole.ADMIN },
  { id: "seed-operator", name: "Local Operator", email: "operator@example.com", role: UserRole.OPERATOR },
  { id: "seed-customer-1", name: "Asha Customer", email: "asha@example.com", role: UserRole.CUSTOMER },
  { id: "seed-customer-2", name: "Ravi Customer", email: "ravi@example.com", role: UserRole.CUSTOMER },
] as const;

const foods = [
  { id: "seed-food-paneer", name: "Paneer Tikka", description: "Char-grilled paneer with house spices.", category: "Starters", price: "240.00", available: true, archived: false },
  { id: "seed-food-biryani", name: "Vegetable Biryani", description: "Basmati rice cooked with seasonal vegetables.", category: "Mains", price: "320.00", available: true, archived: false },
  { id: "seed-food-dal", name: "Dal Makhani", description: "Slow-cooked black lentils.", category: "Mains", price: "280.00", available: true, archived: false },
  { id: "seed-food-kulfi", name: "Malai Kulfi", description: "Traditional cardamom milk dessert.", category: "Desserts", price: "110.00", available: false, archived: false },
] as const;

const orders = [
  { id: "seed-order-1", reference: "LOCAL-2026-0001", customerId: "seed-customer-1", status: OrderStatus.PLACED, item: { foodId: "seed-food-paneer", name: "Paneer Tikka", price: "240.00", quantity: 2 } },
  { id: "seed-order-2", reference: "LOCAL-2026-0002", customerId: "seed-customer-2", status: OrderStatus.PREPARING, item: { foodId: "seed-food-biryani", name: "Vegetable Biryani", price: "320.00", quantity: 1 } },
  { id: "seed-order-3", reference: "LOCAL-2026-0003", customerId: "seed-customer-1", status: OrderStatus.COMPLETED, item: { foodId: "seed-food-dal", name: "Dal Makhani", price: "280.00", quantity: 1 } },
] as const;

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash("LocalOnly@123!", 12);
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: { ...user, passwordHash, active: true },
      update: { ...user, passwordHash, active: true },
    });
  }

  for (const food of foods) {
    await prisma.food.upsert({
      where: { id: food.id },
      create: food,
      update: food,
    });
  }

  for (const order of orders) {
    const { item, ...orderData } = order;
    const itemData = {
      foodId: item.foodId,
      foodNameSnapshot: item.name,
      unitPriceSnapshot: item.price,
      quantity: item.quantity,
      lineTotal: multiplyMoneyByQuantity(item.price, item.quantity),
    };
    await prisma.order.upsert({
      where: { reference: order.reference },
      create: { ...orderData, total: itemData.lineTotal, items: { create: itemData } },
      update: {
        ...orderData,
        total: itemData.lineTotal,
        items: { deleteMany: {}, create: itemData },
      },
    });
  }

  console.info("Seeded 4 local users, 4 foods (1 unavailable), and 3 orders.");
}

main().catch((error: unknown) => {
  console.error("Prisma seed failed.", error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
