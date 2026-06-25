import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });


async function main() {
  console.log('Seeding database...');

  // 1. Create Users (Admin & Captains)
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const captainPasswordHash = await bcrypt.hash('captain123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@mawjood.app' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@mawjood.app',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
    },
  });
  console.log(`Created admin: ${admin.email}`);

  const captain1 = await prisma.user.upsert({
    where: { email: 'ahmed@mawjood.app' },
    update: {},
    create: {
      name: 'Ahmed',
      email: 'ahmed@mawjood.app',
      passwordHash: captainPasswordHash,
      role: 'CAPTAIN',
    },
  });
  console.log(`Created captain: ${captain1.name} (${captain1.email})`);

  const captain2 = await prisma.user.upsert({
    where: { email: 'mohamed@mawjood.app' },
    update: {},
    create: {
      name: 'Mohamed',
      email: 'mohamed@mawjood.app',
      passwordHash: captainPasswordHash,
      role: 'CAPTAIN',
    },
  });
  console.log(`Created captain: ${captain2.name} (${captain2.email})`);

  // 2. Create Areas
  const areaNames = ['Yasmeen', 'Narges', 'Mall', 'Rehab', 'Madinaty'];
  const areas: { [key: string]: any } = {};

  for (const name of areaNames) {
    const area = await prisma.area.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    areas[name] = area;
    console.log(`Created area: ${area.name}`);
  }

  // 3. Create Routes
  const routesData = [
    { from: 'Yasmeen', to: 'Narges', price: 35 },
    { from: 'Narges', to: 'Yasmeen', price: 35 },
    { from: 'Yasmeen', to: 'Mall', price: 30 },
    { from: 'Mall', to: 'Yasmeen', price: 30 },
    { from: 'Yasmeen', to: 'Yasmeen', price: 25 },
    { from: 'Narges', to: 'Narges', price: 25 },
    { from: 'Rehab', to: 'Rehab', price: 25 },
    { from: 'Rehab', to: 'Mall', price: 35 },
    { from: 'Madinaty', to: 'Rehab', price: 50 },
  ];

  for (const route of routesData) {
    const fromArea = areas[route.from];
    const toArea = areas[route.to];

    if (fromArea && toArea) {
      await prisma.route.upsert({
        where: {
          fromAreaId_toAreaId: {
            fromAreaId: fromArea.id,
            toAreaId: toArea.id,
          },
        },
        update: {
          price: route.price,
          isActive: true,
        },
        create: {
          fromAreaId: fromArea.id,
          toAreaId: toArea.id,
          price: route.price,
          isActive: true,
        },
      });
      console.log(`Created route: ${route.from} → ${route.to} = ${route.price} EGP`);
    }
  }

  // 4. Create Sample Trips & Audit Logs for Verification
  console.log('Seeding sample trips and audit logs...');
  
  // Find routes
  const yasmeenNargesRoute = await prisma.route.findFirst({
    where: {
      fromArea: { name: 'Yasmeen' },
      toArea: { name: 'Narges' },
    },
  });
  
  const rehabMallRoute = await prisma.route.findFirst({
    where: {
      fromArea: { name: 'Rehab' },
      toArea: { name: 'Mall' },
    },
  });
  
  const yasmeenYasmeenRoute = await prisma.route.findFirst({
    where: {
      fromArea: { name: 'Yasmeen' },
      toArea: { name: 'Yasmeen' },
    },
  });

  if (yasmeenNargesRoute && rehabMallRoute && yasmeenYasmeenRoute) {
    // A. Ahmed creates a trip with 2 orders
    const trip1 = await prisma.tripRecord.create({
      data: {
        captainId: captain1.id,
        routeId: yasmeenNargesRoute.id,
        unitPrice: yasmeenNargesRoute.price,
        ordersCount: 2,
        status: 'ACTIVE',
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
      },
    });

    await prisma.auditLog.create({
      data: {
        actionType: 'ENTRY_CREATED',
        userId: captain1.id,
        captainName: captain1.name,
        routeInfo: 'Yasmeen → Narges',
        ordersCount: 2,
        amount: yasmeenNargesRoute.price * 2,
        timestamp: trip1.createdAt,
      },
    });

    // B. Ahmed updates the trip from 2 to 3 orders
    await prisma.tripRecord.update({
      where: { id: trip1.id },
      data: {
        ordersCount: 3,
      },
    });

    await prisma.auditLog.create({
      data: {
        actionType: 'ENTRY_UPDATED',
        userId: captain1.id,
        captainName: captain1.name,
        routeInfo: 'Yasmeen → Narges',
        ordersCount: 3,
        amount: yasmeenNargesRoute.price * 3,
        oldValues: 'Orders: 2, Revenue: 70 EGP',
        newValues: 'Orders: 3, Revenue: 105 EGP',
        timestamp: new Date(Date.now() - 3000000), // 50 mins ago
      },
    });

    // C. Mohamed creates a trip with 1 order
    const trip2 = await prisma.tripRecord.create({
      data: {
        captainId: captain2.id,
        routeId: rehabMallRoute.id,
        unitPrice: rehabMallRoute.price,
        ordersCount: 1,
        status: 'ACTIVE',
        createdAt: new Date(Date.now() - 1800000), // 30 mins ago
      },
    });

    await prisma.auditLog.create({
      data: {
        actionType: 'ENTRY_CREATED',
        userId: captain2.id,
        captainName: captain2.name,
        routeInfo: 'Rehab → Mall',
        ordersCount: 1,
        amount: rehabMallRoute.price * 1,
        timestamp: trip2.createdAt,
      },
    });

    // D. Ahmed creates a trip and then soft-deletes it
    const trip3 = await prisma.tripRecord.create({
      data: {
        captainId: captain1.id,
        routeId: yasmeenYasmeenRoute.id,
        unitPrice: yasmeenYasmeenRoute.price,
        ordersCount: 1,
        status: 'DELETED',
        createdAt: new Date(Date.now() - 900000), // 15 mins ago
      },
    });

    await prisma.auditLog.create({
      data: {
        actionType: 'ENTRY_CREATED',
        userId: captain1.id,
        captainName: captain1.name,
        routeInfo: 'Yasmeen → Yasmeen',
        ordersCount: 1,
        amount: yasmeenYasmeenRoute.price * 1,
        timestamp: trip3.createdAt,
      },
    });

    await prisma.auditLog.create({
      data: {
        actionType: 'ENTRY_DELETED',
        userId: captain1.id,
        captainName: captain1.name,
        routeInfo: 'Yasmeen → Yasmeen',
        ordersCount: 1,
        amount: yasmeenYasmeenRoute.price * 1,
        oldValues: 'Orders: 1, Revenue: 25 EGP',
        timestamp: new Date(Date.now() - 600000), // 10 mins ago
      },
    });

    // helper function inline or just calculate directly:
    // Wait, let's just write the amount directly to avoid complex names:
    // amount: yasmeenYasmeenRoute.price * 1,
  }

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
