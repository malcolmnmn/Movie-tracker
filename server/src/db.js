import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pickMainGenre, FALLBACK_MAIN_GENRE } from './services/genreClassifier.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Erlaubt, den DB-Pfad z. B. auf ein persistentes Volume (Render Disk, Fly Volume, …) zu legen.
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data.sqlite');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS friendships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, friend_id)
  );

  CREATE TABLE IF NOT EXISTS titles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('movie', 'series')),
    genre TEXT NOT NULL,
    main_genre TEXT NOT NULL DEFAULT 'Sonstiges',
    status TEXT NOT NULL CHECK (status IN ('to_watch', 'watched')) DEFAULT 'to_watch',
    notes TEXT,
    rating_acting INTEGER,
    rating_story INTEGER,
    rating_tension INTEGER,
    rating_pacing INTEGER,
    rating_visuals INTEGER,
    ai_description TEXT,
    ai_source_url TEXT,
    ai_fetched_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS custom_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title_id INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 10),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_custom_ratings_title_id ON custom_ratings(title_id);
`);

// Leichte Migration für bereits bestehende Datenbanken: SQLite kennt kein
// "ADD COLUMN IF NOT EXISTS", daher hier einfach ausprobieren und einen
// "duplicate column"-Fehler bei bereits vorhandenen Spalten ignorieren.
const NEW_RATING_COLUMNS = [
  'rating_sound',
  'rating_directing',
  'rating_character_dev',
  'rating_originality',
  'rating_emotional',
];
for (const column of NEW_RATING_COLUMNS) {
  try {
    db.exec(`ALTER TABLE titles ADD COLUMN ${column} INTEGER`);
  } catch (err) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }
}

let mainGenreColumnIsNew = false;
try {
  db.exec(`ALTER TABLE titles ADD COLUMN main_genre TEXT NOT NULL DEFAULT '${FALLBACK_MAIN_GENRE}'`);
  mainGenreColumnIsNew = true;
} catch (err) {
  if (!/duplicate column/i.test(err.message)) throw err;
}

// Einmaliger Backfill: Titel, die vor Einführung der Hauptkategorie angelegt wurden,
// bekommen ihre Hauptkategorie aus der bereits gespeicherten (vollständigen) Genre-Liste
// abgeleitet, statt dauerhaft im Sammel-Genre "Sonstiges" zu landen.
if (mainGenreColumnIsNew) {
  const rows = db.prepare('SELECT id, genre FROM titles').all();
  const update = db.prepare('UPDATE titles SET main_genre = ? WHERE id = ?');
  const backfill = db.transaction((items) => {
    for (const row of items) {
      const labels = row.genre.split(',').map((s) => s.trim()).filter(Boolean);
      update.run(pickMainGenre(labels), row.id);
    }
  });
  backfill(rows);
}

export function nowIso() {
  return new Date().toISOString();
}
