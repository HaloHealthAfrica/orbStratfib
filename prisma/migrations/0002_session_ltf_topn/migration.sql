-- Add hard session gating fields to StrategyConfig
ALTER TABLE "StrategyConfig"
ADD COLUMN     "allowOutsideRTH" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowLunch" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "rthStart" TEXT NOT NULL DEFAULT '09:30',
ADD COLUMN     "rthEnd" TEXT NOT NULL DEFAULT '16:00',
ADD COLUMN     "lunchStart" TEXT NOT NULL DEFAULT '12:00',
ADD COLUMN     "lunchEnd" TEXT NOT NULL DEFAULT '13:30',
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/New_York';

-- Add top-N scanner audit fields to Signal
ALTER TABLE "Signal"
ADD COLUMN     "scannerRank" INTEGER,
ADD COLUMN     "scannerTotal" INTEGER,
ADD COLUMN     "scannerWindowSec" INTEGER;


