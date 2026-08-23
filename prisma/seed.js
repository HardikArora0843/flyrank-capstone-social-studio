import "dotenv/config";
import prisma from "../src/config/database.js";

const platforms = [
  {
    name: "Telegram",
    adapterKey: "telegram",
    maxLength: 4096,
    tone: "informative",
    maxHashtags: 10
  },
  {
    name: "X",
    adapterKey: "x",
    maxLength: 280,
    tone: "concise",
    maxHashtags: 3
  },
  {
    name: "LinkedIn",
    adapterKey: "linkedin",
    maxLength: 3000,
    tone: "professional",
    maxHashtags: 5
  }
];

for (const platform of platforms) {
  await prisma.platform.upsert({
    where: {
      adapterKey: platform.adapterKey
    },
    update: platform,
    create: platform
  });
}

await prisma.$disconnect();
