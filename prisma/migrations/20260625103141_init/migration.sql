-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CAPTAIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "fromAreaId" TEXT NOT NULL,
    "toAreaId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripRecord" (
    "id" TEXT NOT NULL,
    "captainId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "ordersCount" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeletedTripRecord" (
    "id" TEXT NOT NULL,
    "originalTripId" TEXT NOT NULL,
    "deletedByUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'UNDO',
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeletedTripRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "captainName" TEXT NOT NULL,
    "routeInfo" TEXT,
    "ordersCount" INTEGER,
    "amount" DOUBLE PRECISION,
    "oldValues" TEXT,
    "newValues" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Area_name_key" ON "Area"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Route_fromAreaId_toAreaId_key" ON "Route"("fromAreaId", "toAreaId");

-- CreateIndex
CREATE UNIQUE INDEX "DeletedTripRecord_originalTripId_key" ON "DeletedTripRecord"("originalTripId");

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_fromAreaId_fkey" FOREIGN KEY ("fromAreaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_toAreaId_fkey" FOREIGN KEY ("toAreaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripRecord" ADD CONSTRAINT "TripRecord_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripRecord" ADD CONSTRAINT "TripRecord_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeletedTripRecord" ADD CONSTRAINT "DeletedTripRecord_originalTripId_fkey" FOREIGN KEY ("originalTripId") REFERENCES "TripRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeletedTripRecord" ADD CONSTRAINT "DeletedTripRecord_deletedByUserId_fkey" FOREIGN KEY ("deletedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

