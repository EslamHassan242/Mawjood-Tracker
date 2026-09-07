import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { hasPermission } from "../src/lib/permissions";
import { orderInput, versionInput } from "../src/lib/intake/validation";

const db = new PGlite();
before(async () => {
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  await db.exec(readFileSync('prisma/migrations/20260625103141_init/migration.sql', 'utf8'));
  await db.exec(`INSERT INTO "Area" (id, name) VALUES ('a', 'Yasmeen'), ('b', 'Narges');
    INSERT INTO "Route" (id, "fromAreaId", "toAreaId", price) VALUES ('r', 'a', 'b', 35);`);
  await db.exec(readFileSync('prisma/migrations/20260907000000_order_intake/migration.sql', 'utf8'));
});
after(async () => { await db.close(); });

test('feature permissions preserve operational boundaries', () => {
  for (const role of ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'CAPTAIN']) {
    assert.equal(hasPermission(role, 'Routes.ChangeAvailability'), true);
    assert.equal(hasPermission(role, 'Orders.View'), true);
  }
  assert.equal(hasPermission('MODERATOR', 'Orders.Create'), true);
  assert.equal(hasPermission('MODERATOR', 'Orders.Edit'), true);
  for (const action of ['Orders.Complete', 'Orders.Cancel', 'Orders.ViewHistory', 'Routes.Manage'] as const)
    assert.equal(hasPermission('MODERATOR', action), false);
  assert.equal(hasPermission('CAPTAIN', 'Orders.Complete'), true);
  for (const action of ['Orders.Create', 'Orders.Edit', 'Orders.Cancel', 'Routes.Manage'] as const)
    assert.equal(hasPermission('CAPTAIN', action), false);
  assert.equal(hasPermission('ADMIN', 'Orders.EditArchive'), false);
  assert.equal(hasPermission('SUPER_ADMIN', 'Orders.EditArchive'), true);
  assert.equal(hasPermission('UNKNOWN', 'Orders.View'), false);
});

test('validation normalizes Arabic phone digits and rejects invalid or oversized input', () => {
  const valid = { routeId: 'r', pickupBuilding: '١٥', deliveryBuilding: '22', senderPhone: '٠١٢٣٤٥٦٧٨٩٠', receiverPhone: '+20 (101) 234-5678' };
  const result = orderInput(valid);
  assert.equal(result.senderPhone, '01234567890');
  assert.equal(result.receiverPhone, '+201012345678');
  assert.equal(result.notes, '');
  assert.throws(() => orderInput({ ...valid, receiverPhone: 'javascript:alert(1)' }));
  assert.throws(() => orderInput({ ...valid, pickupBuilding: ' ' }));
  assert.throws(() => orderInput({ ...valid, notes: 'x'.repeat(1001) }));
  assert.throws(() => orderInput(null));
  assert.throws(() => versionInput(-1));
  assert.throws(() => versionInput('1'));
});

test('migration preserves routes/prices, supplies Arabic labels, and starts intake closed', async () => {
  const result = await db.query<{ isOpen: boolean; price: number; nameAr: string; sortOrder: number }>('SELECT r."isOpen", r.price, r."sortOrder", a."nameAr" FROM "Route" r JOIN "Area" a ON a.id = r."fromAreaId"');
  assert.deepEqual(result.rows, [{ isOpen: false, price: 35, sortOrder: 0, nameAr: 'الياسمين' }]);
});

test('duplicate route definitions are rejected by the database', async () => {
  await assert.rejects(db.exec(`INSERT INTO "Route" (id, "fromAreaId", "toAreaId", price) VALUES ('duplicate', 'a', 'b', 10)`), /unique/i);
});

test('orders survive route closure, structural deactivation, and attempted deletion', async () => {
  await db.exec(`UPDATE "Route" SET "isOpen" = true WHERE id = 'r';
    INSERT INTO "Order" (id, "routeId", "fromAreaName", "toAreaName", "pickupBuilding", "senderPhone", "deliveryBuilding", "receiverPhone", source, "requestKey", "updatedAt")
    VALUES ('o', 'r', 'الياسمين', 'النرجس', '15', '01234567890', '22', '01012345678', 'PUBLIC', 'test-key', now());
    UPDATE "Route" SET "isOpen" = false WHERE id = 'r';`);
  assert.equal((await db.query<{ status: string }>('SELECT status FROM "Order" WHERE id = \'o\'')).rows[0].status, 'ACTIVE');
  await db.exec(`UPDATE "Route" SET "isOpen" = true WHERE id = 'r'; UPDATE "Route" SET "isActive" = false WHERE id = 'r';`);
  assert.equal((await db.query<{ isOpen: boolean }>('SELECT "isOpen" FROM "Route" WHERE id = \'r\'')).rows[0].isOpen, false);
  await assert.rejects(db.exec(`DELETE FROM "Route" WHERE id = 'r'`), /foreign key/i);
  assert.equal((await db.query('SELECT id FROM "Order"')).rows.length, 1);
});

test('area deactivation closes intake without reopening it on reactivation', async () => {
  await db.exec(`UPDATE "Route" SET "isActive" = true WHERE id = 'r'; UPDATE "Route" SET "isOpen" = true WHERE id = 'r';
    UPDATE "Area" SET "isActive" = false WHERE id = 'a'; UPDATE "Area" SET "isActive" = true WHERE id = 'a';`);
  assert.equal((await db.query<{ isOpen: boolean }>('SELECT "isOpen" FROM "Route" WHERE id = \'r\'')).rows[0].isOpen, false);
});

test('stale completion/cancellation cannot overwrite a terminal transition', async () => {
  const completed = await db.query(`UPDATE "Order" SET status = 'COMPLETED', "completedAt" = now(), version = version + 1 WHERE id = 'o' AND status = 'ACTIVE' AND version = 0 RETURNING id`);
  assert.equal(completed.rows.length, 1);
  const stale = await db.query(`UPDATE "Order" SET status = 'CANCELLED', "cancelledAt" = now(), version = version + 1 WHERE id = 'o' AND status = 'ACTIVE' AND version = 0 RETURNING id`);
  assert.equal(stale.rows.length, 0);
  const history = await db.query<{ status: string; fromAreaName: string }>('SELECT status, "fromAreaName" FROM "Order" WHERE status != \'ACTIVE\'');
  assert.equal(history.rows[0].status, 'COMPLETED');
  await db.exec(`UPDATE "Area" SET "nameAr" = 'اسم جديد' WHERE id = 'a'`);
  assert.equal(history.rows[0].fromAreaName, 'الياسمين');
});

test('database change markers advance on committed edits and roll back with rejected transactions', async () => {
  const version = async () => (await db.query<{ version: number }>(`SELECT version FROM "IntakeRevision" WHERE id = 'orders'`)).rows[0].version;
  const previous = await version();
  await db.exec(`UPDATE "Order" SET notes = 'اتصل قبل الوصول' WHERE id = 'o'`);
  assert.equal(await version(), previous + 1);
  await db.exec(`BEGIN; UPDATE "Order" SET notes = 'تعديل ملغى' WHERE id = 'o'; ROLLBACK;`);
  assert.equal(await version(), previous + 1);
});

test('anonymous and authenticated Supabase clients can read only content-free markers', async () => {
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`SET ROLE ${role}`);
    try {
      const result = await db.query<Record<string, unknown>>('SELECT * FROM "IntakeRevision"');
      assert.deepEqual(Object.keys(result.rows[0]).sort(), ['id', 'version']);
      await assert.rejects(db.exec('SELECT * FROM "Order"'), /permission denied/i);
      await assert.rejects(db.exec(`UPDATE "IntakeRevision" SET version = 99`), /permission denied/i);
    } finally { await db.exec('RESET ROLE'); }
  }
});
