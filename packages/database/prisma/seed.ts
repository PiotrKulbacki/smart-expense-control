import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SEED_USER_EMAIL = 'dev@lyamo.local';
const SEED_USER_PASSWORD = 'Secure1!';

async function main() {
  const passwordHash = await bcrypt.hash(SEED_USER_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: SEED_USER_EMAIL },
    update: {
      name: 'Dev User',
      passwordHash,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: SEED_USER_EMAIL,
      name: 'Dev User',
      passwordHash,
      currentPlan: 'FREE',
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.transaction.deleteMany({
    where: {
      userId: user.id,
      description: { startsWith: '[seed]' },
    },
  });

  await prisma.recurringExpense.deleteMany({
    where: {
      userId: user.id,
      category: '[seed] Subscription',
    },
  });

  await prisma.transaction.createMany({
    data: [
      {
        userId: user.id,
        amount: 89.5,
        currency: 'PLN',
        category: 'Groceries',
        description: '[seed] Weekly groceries',
        date: new Date('2026-07-01'),
        isAiScanned: false,
      },
      {
        userId: user.id,
        amount: 24.99,
        currency: 'EUR',
        category: 'Transport',
        description: '[seed] Metro pass',
        date: new Date('2026-07-03'),
        isAiScanned: false,
      },
      {
        userId: user.id,
        amount: 12.4,
        currency: 'GBP',
        category: 'CoffeeShop',
        description: '[seed] Coffee shop',
        date: new Date('2026-07-05'),
        isAiScanned: true,
      },
    ],
  });

  await prisma.recurringExpense.create({
    data: {
      userId: user.id,
      amount: 49.99,
      currency: 'PLN',
      category: '[seed] Subscription',
      frequency: 'MONTHLY',
      nextDueDate: new Date('2026-08-01'),
      isActive: true,
    },
  });

  await prisma.exchangeRate.deleteMany({});

  await prisma.exchangeRate.createMany({
    data: [
      { fromCurrency: 'PLN', toCurrency: 'EUR', rate: 0.23 },
      { fromCurrency: 'PLN', toCurrency: 'GBP', rate: 0.2 },
      { fromCurrency: 'EUR', toCurrency: 'PLN', rate: 4.35 },
      { fromCurrency: 'EUR', toCurrency: 'GBP', rate: 0.86 },
      { fromCurrency: 'GBP', toCurrency: 'PLN', rate: 5.05 },
      { fromCurrency: 'GBP', toCurrency: 'EUR', rate: 1.16 },
      { fromCurrency: 'PLN', toCurrency: 'USD', rate: 0.25 },
      { fromCurrency: 'EUR', toCurrency: 'USD', rate: 1.08 },
      { fromCurrency: 'GBP', toCurrency: 'USD', rate: 1.27 },
      { fromCurrency: 'USD', toCurrency: 'PLN', rate: 4.0 },
      { fromCurrency: 'USD', toCurrency: 'EUR', rate: 0.93 },
      { fromCurrency: 'USD', toCurrency: 'GBP', rate: 0.79 },
    ],
  });

  console.log(`Seed complete. Dev user: ${SEED_USER_EMAIL} / ${SEED_USER_PASSWORD}`);
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
