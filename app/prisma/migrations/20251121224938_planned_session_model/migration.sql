/*
  Warnings:

  - You are about to drop the `PlannedDay` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PlannedDay";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "PlannedSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlannedSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PlannedSession_userId_idx" ON "PlannedSession"("userId");

-- CreateIndex
CREATE INDEX "PlannedSession_startTime_idx" ON "PlannedSession"("startTime");

-- CreateIndex
CREATE INDEX "PlannedSession_endTime_idx" ON "PlannedSession"("endTime");
