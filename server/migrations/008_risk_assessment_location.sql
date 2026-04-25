-- Add location/site field to risk_assessments
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS location TEXT;
