-- Add voting_opened_at: when set, voting is open; deadline (if set) closes it
ALTER TABLE fixtures ADD COLUMN voting_opened_at integer;
-- Existing fixtures: treat as voting open at creation
UPDATE fixtures SET voting_opened_at = created_at WHERE voting_opened_at IS NULL;

-- Make deadline nullable (SQLite: recreate table)
CREATE TABLE fixtures_new (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  squad_id integer NOT NULL,
  slug text NOT NULL,
  opponent text NOT NULL,
  description text,
  game_date integer NOT NULL,
  deadline integer,
  voting_opened_at integer,
  created_by text NOT NULL,
  created_at integer NOT NULL,
  FOREIGN KEY (squad_id) REFERENCES squads(id) ON UPDATE no action ON DELETE cascade
);
INSERT INTO fixtures_new (id, squad_id, slug, opponent, description, game_date, deadline, voting_opened_at, created_by, created_at)
SELECT id, squad_id, slug, opponent, description, game_date, deadline, voting_opened_at, created_by, created_at FROM fixtures;
DROP TABLE fixtures;
ALTER TABLE fixtures_new RENAME TO fixtures;
