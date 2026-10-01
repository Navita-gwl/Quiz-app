import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.planSubscription.findMany();
  console.log("Subscriptions:", JSON.stringify(plans, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
