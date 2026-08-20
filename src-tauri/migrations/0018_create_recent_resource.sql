CREATE TABLE recent_resource (
  campaign_id TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (
    resource_type IN ('player-character', 'npc', 'monster', 'location', 'chapter', 'item', 'scene')
  ),
  resource_id TEXT NOT NULL,
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) > 0),
  viewed_order INTEGER NOT NULL CHECK (viewed_order > 0),
  PRIMARY KEY (campaign_id, resource_type, resource_id),
  FOREIGN KEY (campaign_id) REFERENCES campaign(id) ON DELETE CASCADE
);

CREATE INDEX recent_resource_campaign_order_idx
  ON recent_resource(campaign_id, viewed_order DESC);

CREATE TRIGGER recent_resource_limit_after_insert
AFTER INSERT ON recent_resource
BEGIN
  DELETE FROM recent_resource
  WHERE campaign_id = NEW.campaign_id
    AND rowid NOT IN (
      SELECT rowid
      FROM recent_resource
      WHERE campaign_id = NEW.campaign_id
      ORDER BY viewed_order DESC
      LIMIT 8
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
      ORDER BY viewed_order DESC
      LIMIT 8
    );
END;
