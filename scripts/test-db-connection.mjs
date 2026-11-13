import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';

if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...vals] = trimmed.split('=');
      const val = vals.join('=').replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const testUrl = process.env.DATABASE_URL || 'postgresql://postgres:colin_dev_secret_2026!@localhost:5434/colin?schema=public';
const prisma = new PrismaClient({ datasources: { db: { url: testUrl } } });

async function main() {
  console.log('Connecting to Prisma with URL:', testUrl);
  await prisma.$connect();
  console.log('Connected to PostgreSQL successfully!');
  const userCount = await prisma.user.count();
  console.log('Total users in PostgreSQL database:', userCount);
  const users = await prisma.user.findMany({
    take: 5,
    select: {
      id: true,
      email: true,
      phone: true,
      primaryRole: true,
      status: true,
      profile: true,
      studentProfile: true,
      ownerProfile: true,
    }
  });
  console.log('Sample users in DB:', JSON.stringify(users, null, 2));
  const propertiesCount = await prisma.property.count();
  console.log('Total properties in PostgreSQL database:', propertiesCount);
}

main()
  .catch((err) => {
    console.error('Database connection failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
