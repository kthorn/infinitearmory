-- AlterTable
ALTER TABLE "Weapon" ADD COLUMN "activeVersionId" TEXT;

-- CreateTable
CREATE TABLE "WeaponVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weaponId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "descriptionMd" TEXT,
    "weaponSpec" TEXT,
    "imageUrl" TEXT,
    "imagePrompt" TEXT,
    "textModel" TEXT,
    "imageModel" TEXT,
    CONSTRAINT "WeaponVersion_weaponId_fkey" FOREIGN KEY ("weaponId") REFERENCES "Weapon" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WeaponVersion_weaponId_idx" ON "WeaponVersion"("weaponId");

-- CreateIndex
CREATE UNIQUE INDEX "WeaponVersion_weaponId_versionNumber_key" ON "WeaponVersion"("weaponId", "versionNumber");
