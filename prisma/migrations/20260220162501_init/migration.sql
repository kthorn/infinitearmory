-- CreateTable
CREATE TABLE "Weapon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "userPrompt" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "descriptionMd" TEXT,
    "weaponSpec" TEXT,
    "imageUrl" TEXT,
    "imagePrompt" TEXT,
    "textModel" TEXT,
    "imageModel" TEXT,
    "promptVersion" TEXT NOT NULL DEFAULT 'v1',
    "errorMessage" TEXT
);

-- CreateIndex
CREATE INDEX "Weapon_status_idx" ON "Weapon"("status");

-- CreateIndex
CREATE INDEX "Weapon_createdAt_idx" ON "Weapon"("createdAt");
