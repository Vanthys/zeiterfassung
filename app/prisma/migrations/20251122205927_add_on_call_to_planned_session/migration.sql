-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PlannedSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "note" TEXT,
    "isOnCall" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlannedSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PlannedSession" ("createdAt", "endTime", "id", "note", "startTime", "updatedAt", "userId") SELECT "createdAt", "endTime", "id", "note", "startTime", "updatedAt", "userId" FROM "PlannedSession";
DROP TABLE "PlannedSession";
ALTER TABLE "new_PlannedSession" RENAME TO "PlannedSession";
CREATE INDEX "PlannedSession_userId_idx" ON "PlannedSession"("userId");
CREATE INDEX "PlannedSession_startTime_idx" ON "PlannedSession"("startTime");
CREATE INDEX "PlannedSession_endTime_idx" ON "PlannedSession"("endTime");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
