-- Add check constraint to ensure durationMs is positive
ALTER TABLE "ListeningHistory" ADD CONSTRAINT "durationMs_positive" CHECK ("durationMs">=0);