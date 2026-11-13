ALTER TABLE npc
ADD COLUMN kind TEXT NOT NULL DEFAULT 'character'
CHECK (kind IN ('character', 'organization'));
