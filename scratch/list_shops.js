import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.session.findMany({
    select: {
      shop: true,
    }
  });
  console.log("Sessions:", JSON.stringify(sessions, null, 2));

  const categories = await prisma.category.findMany({
    select: {
      shopId: true,
      quizPublicId: true,
    }
  });
  console.log("Categories:", JSON.stringify(categories, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
