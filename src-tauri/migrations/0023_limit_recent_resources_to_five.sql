DROP TRIGGER IF EXISTS recent_resource_limit_after_insert;
DROP TRIGGER IF EXISTS recent_resource_limit_after_update;

DELETE FROM recent_resource
WHERE rowid IN (
  SELECT rowid
  FROM (
    SELECT
      rowid,
      ROW_NUMBER() OVER (
        PARTITION BY campaign_id
        ORDER BY viewed_order DESC, rowid DESC
      ) AS recent_rank
    FROM recent_resource
  )
  WHERE recent_rank > 5
);

CREATE TRIGGER recent_resource_limit_after_insert
AFTER INSERT ON recent_resource
BEGIN
  DELETE FROM recent_resource
  WHERE campaign_id = NEW.campaign_id
    AND rowid NOT IN (
      SELECT rowid
      FROM recent_resource
      WHERE campaign_id = NEW.campaign_id
      ORDER BY viewed_order DESC, rowid DESC
      LIMIT 5
    );
END;

CREATE TRIGGER recent_resource_limit_after_update
AFTER UPDATE OF viewed_order ON recent_resource
BEGIN
  DELETE FROM recent_resource
  WHERE campaign_id = NEW.campaign_id
    AND rowid NOT IN (
      SELECT rowid
      FROM recent_resource
      WHERE campaign_id = NEW.campaign_id
      ORDER BY viewed_order DESC, rowid DESC
      LIMIT 5
    );
END;
