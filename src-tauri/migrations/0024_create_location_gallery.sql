CREATE TABLE location_image (
    location_id TEXT NOT NULL,
    image_path TEXT NOT NULL CHECK (length(trim(image_path)) > 0),
    position INTEGER NOT NULL CHECK (position >= 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (location_id, image_path),
    FOREIGN KEY (location_id) REFERENCES location(id) ON DELETE CASCADE
);

CREATE INDEX location_image_order_idx
ON location_image(location_id, position);

INSERT INTO location_image(location_id, image_path, position, created_at)
SELECT id, image_path, 0, created_at
FROM location
WHERE image_path IS NOT NULL AND trim(image_path) <> '';

WITH override_images AS (
    SELECT resource_id AS location_id,
           json_extract(snapshot_json, '$.imagePath') AS image_path,
           MIN(created_at) AS created_at
    FROM campaign_resource_override
    WHERE resource_type = 'location'
      AND json_extract(snapshot_json, '$.imagePath') IS NOT NULL
      AND trim(json_extract(snapshot_json, '$.imagePath')) <> ''
    GROUP BY resource_id, json_extract(snapshot_json, '$.imagePath')
),
numbered_images AS (
    SELECT override_images.location_id,
           override_images.image_path,
           override_images.created_at,
           (SELECT COUNT(*)
            FROM location_image
            WHERE location_image.location_id = override_images.location_id) AS base_position,
           ROW_NUMBER() OVER (
               PARTITION BY override_images.location_id
               ORDER BY override_images.created_at, override_images.image_path
           ) - 1 AS position_offset
    FROM override_images
    WHERE NOT EXISTS (
        SELECT 1
        FROM location_image
        WHERE location_image.location_id = override_images.location_id
          AND location_image.image_path = override_images.image_path
    )
)
INSERT OR IGNORE INTO location_image(location_id, image_path, position, created_at)
SELECT location_id, image_path, base_position + position_offset, created_at
FROM numbered_images;
