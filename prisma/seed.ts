import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Default pipeline
  const existing = await prisma.pipeline.findFirst({ where: { isDefault: true } });
  if (!existing) {
    await prisma.pipeline.create({
      data: {
        name: "Sales Pipeline",
        isDefault: true,
        stages: {
          create: [
            { name: "Prospecting", order: 0, probability: 10 },
            { name: "Qualified",   order: 1, probability: 25 },
            { name: "Proposal",    order: 2, probability: 50 },
            { name: "Negotiation", order: 3, probability: 75 },
            { name: "Won",         order: 4, probability: 100, isWon: true },
            { name: "Lost",        order: 5, probability: 0,   isLost: true },
          ],
        },
      },
    });
  }

  // Bootstrap admin from env
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase();
  if (email) {
    await prisma.user.upsert({
      where: { email },
      update: { role: Role.ADMIN },
      create: { email, role: Role.ADMIN, name: email.split("@")[0] },
    });
    console.log(`Bootstrapped admin: ${email}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
