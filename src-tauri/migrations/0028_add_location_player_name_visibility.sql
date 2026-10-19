ALTER TABLE location
ADD COLUMN hide_name_on_player_display INTEGER NOT NULL DEFAULT 0
CHECK (hide_name_on_player_display IN (0, 1));
