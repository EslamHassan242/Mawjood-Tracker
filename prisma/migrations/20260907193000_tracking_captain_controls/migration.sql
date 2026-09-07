BEGIN;
ALTER TABLE "Area" ADD COLUMN "availabilityVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "trackingNumber" TEXT NOT NULL DEFAULT upper(replace(gen_random_uuid()::text, '-', '')),
  ADD COLUMN "cancellationNote" TEXT;
CREATE UNIQUE INDEX "Order_trackingNumber_key" ON "Order"("trackingNumber");
CREATE TABLE "IntakeSettings" (
  "id" TEXT NOT NULL DEFAULT 'default' PRIMARY KEY CHECK ("id" = 'default'),
  "captainCanChangeAvailability" BOOLEAN NOT NULL DEFAULT false,
  "version" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedBy" TEXT
);
INSERT INTO "IntakeSettings" ("id") VALUES ('default');
ALTER TABLE "IntakeSettings" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "IntakeSettings" FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON "IntakeSettings" FROM authenticated; END IF;
END $$;
CREATE TRIGGER intake_settings_changed AFTER UPDATE ON "IntakeSettings"
FOR EACH STATEMENT EXECUTE FUNCTION public.intake_notify_change('routes');

-- Version legacy area edits too, so an old screen cannot silently overwrite them.
CREATE FUNCTION public.intake_area_version() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW."isActive" IS DISTINCT FROM OLD."isActive" OR NEW."nameAr" IS DISTINCT FROM OLD."nameAr" THEN
    NEW."availabilityVersion" := OLD."availabilityVersion" + 1;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER intake_area_version BEFORE UPDATE ON "Area"
FOR EACH ROW EXECUTE FUNCTION public.intake_area_version();
COMMIT;
