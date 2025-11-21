-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "weeklyHoursTarget" REAL NOT NULL DEFAULT 40.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WorkSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ONGOING',
    "totalDuration" REAL,
    "breakDuration" REAL NOT NULL DEFAULT 0,
    "netDuration" REAL,
    "note" TEXT,
    "project" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Break" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "workSessionId" INTEGER NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "duration" REAL,
    "type" TEXT NOT NULL DEFAULT 'UNPAID',
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Break_workSessionId_fkey" FOREIGN KEY ("workSessionId") REFERENCES "WorkSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkSessionEdit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "workSessionId" INTEGER NOT NULL,
    "editedBy" INTEGER NOT NULL,
    "editedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changes" TEXT NOT NULL,
    "reason" TEXT,
    CONSTRAINT "WorkSessionEdit_workSessionId_fkey" FOREIGN KEY ("workSessionId") REFERENCES "WorkSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkSessionEdit_editedBy_fkey" FOREIGN KEY ("editedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlannedDay" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "plannedHours" REAL NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlannedDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "WorkSession_userId_idx" ON "WorkSession"("userId");

-- CreateIndex
CREATE INDEX "WorkSession_startTime_idx" ON "WorkSession"("startTime");

-- CreateIndex
CREATE INDEX "WorkSession_userId_startTime_idx" ON "WorkSession"("userId", "startTime");

-- CreateIndex
CREATE INDEX "WorkSession_userId_status_idx" ON "WorkSession"("userId", "status");

-- CreateIndex
CREATE INDEX "Break_workSessionId_idx" ON "Break"("workSessionId");

-- CreateIndex
CREATE INDEX "Break_startTime_idx" ON "Break"("startTime");

-- CreateIndex
CREATE INDEX "WorkSessionEdit_workSessionId_idx" ON "WorkSessionEdit"("workSessionId");

-- CreateIndex
CREATE INDEX "WorkSessionEdit_editedBy_idx" ON "WorkSessionEdit"("editedBy");

-- CreateIndex
CREATE INDEX "WorkSessionEdit_editedAt_idx" ON "WorkSessionEdit"("editedAt");

-- CreateIndex
CREATE INDEX "PlannedDay_userId_idx" ON "PlannedDay"("userId");

-- CreateIndex
CREATE INDEX "PlannedDay_date_idx" ON "PlannedDay"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PlannedDay_userId_date_key" ON "PlannedDay"("userId", "date");
