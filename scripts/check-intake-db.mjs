import "dotenv/config";
import pg from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Read-only deployment diagnostic. Never prints connection strings or customer data.
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
try {
  await client.connect();
  const { rows } = await client.query(`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('Area', 'Route', 'Order', 'IntakeRevision', '_prisma_migrations')
    ORDER BY table_name, ordinal_position
  `);
  const expected = { Area: ['nameAr', 'isActive'], Route: ['isOpen', 'availabilityVersion', 'sortOrder'],
    Order: ['id'], IntakeRevision: ['id'] };
  const missing = Object.entries(expected).flatMap(([table, columns]) => columns
    .filter(column => !rows.some(row => row.table_name === table && row.column_name === column))
    .map(column => `${table}.${column}`));
  console.log(JSON.stringify({ missing, schemaReady: missing.length === 0 }, null, 2));
  if (rows.some(row => row.table_name === '_prisma_migrations')) {
    const migrations = await client.query('SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY started_at');
    console.log(JSON.stringify({ migrations: migrations.rows }, null, 2));
  } else console.log('No Prisma migration history table exists. Check baseline before migrate deploy.');
  if (missing.length) process.exitCode = 1;
  else {
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
    try {
      // Match the areas API query, but print only whether it succeeded.
      await prisma.area.findMany({ orderBy: { name: 'asc' } });
      await prisma.route.findMany({ include: { fromArea: true, toArea: true }, orderBy: { sortOrder: 'asc' } });
      console.log('Prisma areas and routes queries: OK');
      const publication = await client.query(`SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'IntakeRevision'`);
      console.log(JSON.stringify({ realtimePublicationReady: publication.rows.length === 1 }));
    } finally { await prisma.$disconnect(); }
  }
} catch (error) {
  console.error(JSON.stringify({ code: error.code || 'CONNECTION_ERROR', message: error.message }));
  process.exitCode = 1;
} finally { await client.end(); }
