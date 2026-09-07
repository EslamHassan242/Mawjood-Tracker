BEGIN;
-- Existing application code already uses sortOrder, but the initial checked-in
-- migration omitted it. Preserve databases where it was added through db push.
ALTER TABLE "Route" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Area" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "nameAr" TEXT;

-- AlterTable
ALTER TABLE "Route" ADD COLUMN     "availabilityChangedAt" TIMESTAMP(3),
ADD COLUMN     "availabilityChangedBy" TEXT,
ADD COLUMN     "availabilityVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isOpen" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "fromAreaName" TEXT NOT NULL,
    "toAreaName" TEXT NOT NULL,
    "pickupBuilding" TEXT NOT NULL,
    "senderPhone" TEXT NOT NULL,
    "deliveryBuilding" TEXT NOT NULL,
    "receiverPhone" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "status" "OrderStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeRevision" (
    "id" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "IntakeRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_requestKey_key" ON "Order"("requestKey");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_id_idx" ON "Order"("status", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Order_routeId_idx" ON "Order"("routeId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Durable, content-free change markers work across Vercel instances.
INSERT INTO "IntakeRevision" ("id", "version") VALUES ('routes', 0), ('orders', 0);
ALTER TABLE "IntakeRevision" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "intake_revision_read" ON "IntakeRevision" FOR SELECT USING (true);
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;

-- Prisma uses the server database connection. Never expose customer rows via the Data API.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON "Order" FROM anon;
    REVOKE ALL ON "IntakeRevision" FROM anon;
    GRANT SELECT ON "IntakeRevision" TO anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON "Order" FROM authenticated;
    REVOKE ALL ON "IntakeRevision" FROM authenticated;
    GRANT SELECT ON "IntakeRevision" TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE "IntakeRevision";
  END IF;
END $$;

CREATE FUNCTION public.intake_notify_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  UPDATE public."IntakeRevision" SET "version" = "version" + 1 WHERE "id" = TG_ARGV[0];
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.intake_notify_change() FROM PUBLIC;

CREATE TRIGGER intake_orders_changed AFTER INSERT OR UPDATE OR DELETE ON "Order"
FOR EACH STATEMENT EXECUTE FUNCTION public.intake_notify_change('orders');
CREATE TRIGGER intake_routes_changed AFTER INSERT OR UPDATE OR DELETE ON "Route"
FOR EACH STATEMENT EXECUTE FUNCTION public.intake_notify_change('routes');
CREATE TRIGGER intake_areas_changed AFTER INSERT OR UPDATE OR DELETE ON "Area"
FOR EACH STATEMENT EXECUTE FUNCTION public.intake_notify_change('routes');

-- Structural deactivation always closes intake, including changes from older APIs.
CREATE FUNCTION public.intake_route_activation() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW."isActive" IS DISTINCT FROM OLD."isActive" THEN
    NEW."isOpen" := false;
    NEW."availabilityVersion" := OLD."availabilityVersion" + 1;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER intake_route_activation BEFORE UPDATE ON "Route"
FOR EACH ROW EXECUTE FUNCTION public.intake_route_activation();

CREATE FUNCTION public.intake_area_activation() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF (NOT NEW."isActive" OR NEW."nameAr" IS NULL) AND
     (NEW."isActive" IS DISTINCT FROM OLD."isActive" OR NEW."nameAr" IS DISTINCT FROM OLD."nameAr") THEN
    UPDATE public."Route" SET "isOpen" = false, "availabilityVersion" = "availabilityVersion" + 1
    WHERE ("fromAreaId" = NEW."id" OR "toAreaId" = NEW."id") AND "isOpen";
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER intake_area_activation AFTER UPDATE ON "Area"
FOR EACH ROW EXECUTE FUNCTION public.intake_area_activation();

UPDATE "Area" SET "nameAr" = CASE lower("name")
  WHEN 'yasmeen' THEN 'الياسمين' WHEN 'yasmine' THEN 'الياسمين'
  WHEN 'narges' THEN 'النرجس' WHEN 'mall' THEN 'المول'
  WHEN 'rehab' THEN 'الرحاب' WHEN 'madinaty' THEN 'مدينتي'
  ELSE CASE WHEN "name" ~ '[ء-ي]' THEN "name" ELSE NULL END END;

ALTER TABLE "Order" ADD CONSTRAINT "Order_source_check" CHECK ("source" IN ('PUBLIC', 'INTERNAL'));
ALTER TABLE "Order" ADD CONSTRAINT "Order_terminal_time_check" CHECK (
  ("status" = 'ACTIVE' AND "completedAt" IS NULL AND "cancelledAt" IS NULL) OR
  ("status" = 'COMPLETED' AND "completedAt" IS NOT NULL AND "cancelledAt" IS NULL) OR
  ("status" = 'CANCELLED' AND "cancelledAt" IS NOT NULL AND "completedAt" IS NULL)
);

COMMIT;
