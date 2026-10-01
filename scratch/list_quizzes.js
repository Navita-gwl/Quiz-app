import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      title: true,
      quizPublicId: true,
    }
  });
  console.log("Categories (Quizzes):", JSON.stringify(categories, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
