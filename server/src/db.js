import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pickMainGenre, FALLBACK_MAIN_GENRE } from './services/genreClassifier.js';
import { SUGGESTED_TITLES } from './data/suggestedTitles.js';

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
    poster_url TEXT,
    extra_info TEXT,
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

  CREATE TABLE IF NOT EXISTS suggested_titles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('movie', 'series')),
    category TEXT NOT NULL,
    ai_description TEXT,
    ai_source_url TEXT,
    ai_fetched_at TEXT,
    poster_url TEXT,
    extra_info TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

for (const column of ['ai_description', 'ai_source_url', 'ai_fetched_at', 'poster_url', 'extra_info']) {
  try {
    db.exec(`ALTER TABLE suggested_titles ADD COLUMN ${column} TEXT`);
  } catch (err) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }
}

// Für Datenbanken, die die Tabelle schon vor Einführung der UNIQUE-Einschränkung auf
// "name" angelegt haben (CREATE TABLE IF NOT EXISTS greift dann nicht mehr): den
// eindeutigen Index nachträglich ergänzen, damit "ON CONFLICT(name)" unten funktioniert.
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_suggested_titles_name ON suggested_titles(name)');

// Gleicht die Vorschlagsliste bei jedem Serverstart mit data/suggestedTitles.js ab,
// statt sie nur einmalig zu befüllen: neu ergänzte Titel werden hinzugefügt, aus der
// Liste entfernte Titel werden gelöscht (unproblematisch, da suggested_titles nur eine
// Referenzliste ist und keine Nutzerdaten enthält). So reicht es, die Datei anzupassen,
// um die angezeigten Vorschläge zu aktualisieren.
const syncSuggestions = db.transaction((items) => {
  const currentNames = new Set(items.map((i) => i.name));
  const existingNames = db
    .prepare('SELECT name FROM suggested_titles')
    .all()
    .map((r) => r.name);
  for (const name of existingNames) {
    if (!currentNames.has(name)) {
      db.prepare('DELETE FROM suggested_titles WHERE name = ?').run(name);
    }
  }
  const upsert = db.prepare(
    `INSERT INTO suggested_titles (name, type, category) VALUES (?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET type = excluded.type, category = excluded.category`
  );
  for (const item of items) upsert.run(item.name, item.type, item.category);
});
syncSuggestions(SUGGESTED_TITLES);

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

for (const column of ['poster_url', 'extra_info']) {
  try {
    db.exec(`ALTER TABLE titles ADD COLUMN ${column} TEXT`);
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
