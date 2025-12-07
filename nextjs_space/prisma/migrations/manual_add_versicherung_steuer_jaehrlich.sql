-- Migration: Add versicherungJaehrlich and steuerJaehrlich to Fahrzeug
-- Diese Migration fügt die Felder für jährliche Versicherungs- und Steuerkosten hinzu

-- Add versicherungJaehrlich column with default 0
ALTER TABLE "Fahrzeug" ADD COLUMN IF NOT EXISTS "versicherungJaehrlich" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Add steuerJaehrlich column with default 0
ALTER TABLE "Fahrzeug" ADD COLUMN IF NOT EXISTS "steuerJaehrlich" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Optional: Migrate existing fixkosten data to versicherungJaehrlich (if you want to preserve old data)
-- UPDATE "Fahrzeug" SET "versicherungJaehrlich" = "fixkosten" WHERE "fixkosten" > 0;
