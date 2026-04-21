-- 006_incident_number.sql
-- Add structured incident_number (e.g., NM-001, FIRE-002, LTI-001) and
-- ai_recommendations field to the incidents table.

ALTER TABLE incidents ADD COLUMN IF NOT EXISTS incident_number TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS ai_recommendations TEXT;

-- Populate existing incidents with generated numbers per org + type
WITH numbered AS (
  SELECT
    id,
    type,
    org_id,
    ROW_NUMBER() OVER (PARTITION BY org_id, type ORDER BY created_at, id) AS seq_num,
    CASE type
      WHEN 'Near Miss'            THEN 'NM'
      WHEN 'First Aid'            THEN 'FA'
      WHEN 'Medical Treatment'    THEN 'MT'
      WHEN 'Restricted Work Case' THEN 'RWC'
      WHEN 'Lost Time Injury'     THEN 'LTI'
      WHEN 'Fatality'             THEN 'FAT'
      WHEN 'Environmental'        THEN 'ENV'
      WHEN 'Property Damage'      THEN 'PD'
      WHEN 'Fire'                 THEN 'FIRE'
      WHEN 'Security'             THEN 'SEC'
      WHEN 'Vehicle Incident'     THEN 'VEH'
      ELSE 'INC'
    END AS type_abbr
  FROM incidents
  WHERE incident_number IS NULL
)
UPDATE incidents i
SET incident_number = n.type_abbr || '-' || LPAD(n.seq_num::TEXT, 3, '0')
FROM numbered n
WHERE i.id = n.id;

CREATE INDEX IF NOT EXISTS idx_incidents_number ON incidents(incident_number);
