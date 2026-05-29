import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.pricingSetting.findFirst({
    where: { isActive: true },
  });

  if (existing) {
    console.log('Active pricing settings already exist, skipping seed.');
    return;
  }

  await prisma.pricingSetting.create({
    data: {
      name: 'Default',
      isActive: true,
      investmentFundRate: 0.06,
      operationProfitRate: 0.35,
      netProfitRateOfOP: 0.15,
      payrollRateOfOPMinusNP: 0.81,
      otherCostsRateOfOPMinusNP: 0.19,
      salesTaxRate20: 0.2,
      salesTaxRate4: 0.04,
    },
  });

  console.log('Seeded default pricing settings.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
