-- Set existing NULL game_date to deadline (sensible default: same day as voting deadline)
UPDATE fixtures SET game_date = deadline WHERE game_date IS NULL;

-- SQLite: recreate table to add NOT NULL on game_date
PRAGMA foreign_keys = OFF;

CREATE TABLE fixtures_new (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  squad_id integer NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  slug text NOT NULL,
  opponent text NOT NULL,
  game_date integer NOT NULL,
  deadline integer NOT NULL,
  created_by text NOT NULL,
  created_at integer NOT NULL
);

INSERT INTO fixtures_new (id, squad_id, slug, opponent, game_date, deadline, created_by, created_at)
SELECT id, squad_id, slug, opponent, COALESCE(game_date, deadline), deadline, created_by, created_at
FROM fixtures;

DROP TABLE fixtures;

ALTER TABLE fixtures_new RENAME TO fixtures;

PRAGMA foreign_keys = ON;
