ALTER TABLE scene ADD COLUMN chapter_id TEXT
  REFERENCES chapter(id) ON DELETE CASCADE;

ALTER TABLE scene ADD COLUMN position INTEGER NOT NULL DEFAULT 0
  CHECK (position >= 0);

UPDATE scene AS current_scene
SET chapter_id = (
  SELECT chapter.id
  FROM chapter
  WHERE chapter.campaign_id = current_scene.campaign_id
  ORDER BY chapter.position, chapter.title COLLATE NOCASE, chapter.id
  LIMIT 1
);

CREATE TABLE scene_chapter_migration_check (
  valid INTEGER NOT NULL CHECK (valid = 1)
);

INSERT INTO scene_chapter_migration_check(valid)
SELECT CASE WHEN EXISTS(SELECT 1 FROM scene WHERE chapter_id IS NULL) THEN 0 ELSE 1 END;

DROP TABLE scene_chapter_migration_check;

UPDATE scene AS current_scene
SET position = (
  SELECT COUNT(*)
  FROM scene AS previous_scene
  WHERE previous_scene.chapter_id = current_scene.chapter_id
    AND (
      previous_scene.name COLLATE NOCASE < current_scene.name COLLATE NOCASE
      OR (
        previous_scene.name = current_scene.name COLLATE NOCASE
        AND previous_scene.id < current_scene.id
      )
    )
);

CREATE INDEX scene_chapter_position_idx
  ON scene(chapter_id, position, name COLLATE NOCASE, id);

CREATE TRIGGER scene_chapter_required_on_insert
BEFORE INSERT ON scene
WHEN NEW.chapter_id IS NULL
  OR NOT EXISTS (
    SELECT 1 FROM chapter
    WHERE chapter.id = NEW.chapter_id AND chapter.campaign_id = NEW.campaign_id
  )
BEGIN
  SELECT RAISE(ABORT, 'scene chapter is required and must belong to the campaign');
END;

CREATE TRIGGER scene_chapter_required_on_update
BEFORE UPDATE OF chapter_id, campaign_id ON scene
WHEN NEW.chapter_id IS NULL
  OR NOT EXISTS (
    SELECT 1 FROM chapter
    WHERE chapter.id = NEW.chapter_id AND chapter.campaign_id = NEW.campaign_id
  )
BEGIN
  SELECT RAISE(ABORT, 'scene chapter is required and must belong to the campaign');
END;

CREATE TRIGGER scene_cleanup_before_delete
BEFORE DELETE ON scene
BEGIN
  DELETE FROM journal_entry WHERE scene_id = OLD.id;
  DELETE FROM recent_resource
  WHERE campaign_id = OLD.campaign_id
    AND resource_type = 'scene'
    AND resource_id = OLD.id;
  DELETE FROM app_setting
  WHERE key = 'campaign.active_scene.' || OLD.campaign_id
    AND value = OLD.id;
END;
