import { Router } from 'express';
import { db, nowIso } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { fetchGenreSuggestion, fetchFilmDetails } from '../services/movieInfo.js';
import { pickMainGenre, FALLBACK_MAIN_GENRE } from '../services/genreClassifier.js';

// Löst Name -> { genre: volle, spezifische Liste; mainGenre: grobe Oberkategorie } auf.
// Wird sowohl beim Anlegen (falls der Client kein Genre mitschickt) als auch vom
// eigenständigen Lookup-Endpoint für das Frontend verwendet.
async function resolveGenreFields(name) {
  const labels = await fetchGenreSuggestion(name);
  if (!labels?.length) return { genre: FALLBACK_MAIN_GENRE, mainGenre: FALLBACK_MAIN_GENRE };
  return { genre: labels.join(', '), mainGenre: pickMainGenre(labels) };
}

const router = Router();
router.use(requireAuth);

export const RATING_FIELDS = [
  { key: 'rating_acting', label: 'Schauspielleistung' },
  { key: 'rating_story', label: 'Story' },
  { key: 'rating_tension', label: 'Spannung / Interesse' },
  { key: 'rating_pacing', label: 'Länge / Pacing' },
  { key: 'rating_visuals', label: 'Bildgestaltung' },
  { key: 'rating_sound', label: 'Sound / Musik' },
  { key: 'rating_directing', label: 'Regie' },
  { key: 'rating_character_dev', label: 'Charakterentwicklung' },
  { key: 'rating_originality', label: 'Originalität' },
  { key: 'rating_emotional', label: 'Emotionale Wirkung' },
];

function clampScore(value) {
  return Math.max(1, Math.min(10, Math.round(Number(value))));
}

function getCustomRatings(titleId) {
  return db
    .prepare('SELECT id, label, score FROM custom_ratings WHERE title_id = ? ORDER BY id ASC')
    .all(titleId);
}

function getCustomRatingsForTitles(titleIds) {
  if (titleIds.length === 0) return new Map();
  const placeholders = titleIds.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT id, title_id, label, score FROM custom_ratings WHERE title_id IN (${placeholders}) ORDER BY id ASC`
    )
    .all(...titleIds);
  const map = new Map();
  for (const row of rows) {
    const list = map.get(row.title_id) ?? [];
    list.push({ id: row.id, label: row.label, score: row.score });
    map.set(row.title_id, list);
  }
  return map;
}

function withAverage(title, customRatings) {
  const builtInValues = RATING_FIELDS.map((f) => title[f.key]).filter(
    (v) => v !== null && v !== undefined
  );
  const customValues = customRatings.map((r) => r.score);
  const values = [...builtInValues, ...customValues];
  const average =
    values.length > 0
      ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
      : null;
  return { ...title, custom_ratings: customRatings, average_rating: average, rating_count: values.length };
}

function serializeTitle(row, customRatings = getCustomRatings(row.id)) {
  const base = {
    id: row.id,
    name: row.name,
    type: row.type,
    genre: row.genre,
    main_genre: row.main_genre,
    status: row.status,
    notes: row.notes,
  };
  for (const field of RATING_FIELDS) base[field.key] = row[field.key];
  base.ai_description = row.ai_description;
  base.ai_source_url = row.ai_source_url;
  base.ai_fetched_at = row.ai_fetched_at;
  base.poster_url = row.poster_url;
  base.extra_info = row.extra_info ? JSON.parse(row.extra_info) : null;
  base.created_at = row.created_at;
  base.updated_at = row.updated_at;
  return withAverage(base, customRatings);
}

// Liste aller Titel des angemeldeten Nutzers, optional gefiltert nach Status.
// Die Sortierung nach Hauptgenre + Bewertung (bester zuerst) übernimmt die Liste selbst;
// das Frontend gruppiert zusätzlich visuell nach der (groben) Hauptkategorie, damit
// ähnliche Filme zusammenlanden statt in vielen einzigartigen Genre-Kombinationen.
router.get('/', (req, res) => {
  const { status } = req.query;
  let rows;
  if (status === 'to_watch' || status === 'watched') {
    rows = db
      .prepare('SELECT * FROM titles WHERE owner_id = ? AND status = ? ORDER BY main_genre ASC, name ASC')
      .all(req.userId, status);
  } else {
    rows = db
      .prepare('SELECT * FROM titles WHERE owner_id = ? ORDER BY main_genre ASC, name ASC')
      .all(req.userId);
  }
  const customRatingsMap = getCustomRatingsForTitles(rows.map((r) => r.id));
  const titles = rows.map((row) => serializeTitle(row, customRatingsMap.get(row.id) ?? []));
  if (status === 'watched') {
    titles.sort((a, b) => {
      if (a.main_genre !== b.main_genre) return a.main_genre.localeCompare(b.main_genre);
      const avgA = a.average_rating ?? -1;
      const avgB = b.average_rating ?? -1;
      return avgB - avgA;
    });
  }
  res.json({ titles });
});

// Schlägt anhand des Titelnamens automatisch Genres vor (Wikidata, kein API-Key nötig):
// "genre" ist die volle, spezifische Liste (für die Detailseite), "mainGenre" eine grobe
// Oberkategorie (für die Gruppierung in den Listen).
router.get('/lookup-genre', async (req, res) => {
  const name = req.query.name;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name wird benötigt.' });
  }
  const labels = await fetchGenreSuggestion(name);
  res.json({
    genre: labels?.length ? labels.join(', ') : null,
    mainGenre: labels?.length ? pickMainGenre(labels) : null,
  });
});

router.post('/', async (req, res) => {
  const { name, type, status } = req.body;
  let { genre, mainGenre } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: 'Name und Typ werden benötigt.' });
  }
  if (!['movie', 'series'].includes(type)) {
    return res.status(400).json({ error: 'Typ muss "movie" oder "series" sein.' });
  }
  // Genre ist optional: wird es nicht mitgeschickt (z. B. weil der Client die Erkennung
  // nicht selbst übernommen hat), ermittelt der Server Genre + Hauptkategorie selbst.
  if (!genre || !genre.trim()) {
    ({ genre, mainGenre } = await resolveGenreFields(name));
  } else if (!mainGenre || !mainGenre.trim()) {
    mainGenre = pickMainGenre(genre.split(',').map((s) => s.trim()));
  }
  const info = db
    .prepare(
      `INSERT INTO titles (owner_id, name, type, genre, main_genre, status)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.userId,
      name.trim(),
      type,
      genre.trim(),
      mainGenre.trim(),
      status === 'watched' ? 'watched' : 'to_watch'
    );
  const row = db.prepare('SELECT * FROM titles WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ title: serializeTitle(row) });
});

function getOwnedTitle(id, userId) {
  return db.prepare('SELECT * FROM titles WHERE id = ? AND owner_id = ?').get(id, userId);
}

router.get('/:id', (req, res) => {
  const row = getOwnedTitle(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Titel nicht gefunden.' });
  res.json({ title: serializeTitle(row) });
});

router.patch('/:id', (req, res) => {
  const row = getOwnedTitle(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Titel nicht gefunden.' });

  // Bewertet werden kann erst, wenn der Titel als "gesehen" markiert ist.
  const setsRating = RATING_FIELDS.some((f) => f.key in req.body && req.body[f.key] !== null);
  const effectiveStatus = req.body.status ?? row.status;
  if (setsRating && effectiveStatus !== 'watched') {
    return res.status(400).json({
      error: 'Erst als "gesehen" markieren, um diesen Titel bewerten zu können.',
    });
  }

  const allowed = ['name', 'genre', 'main_genre', 'status', 'notes', ...RATING_FIELDS.map((f) => f.key)];
  const updates = [];
  const values = [];
  for (const key of allowed) {
    if (key in req.body) {
      let value = req.body[key];
      if (RATING_FIELDS.some((f) => f.key === key) && value !== null) {
        value = clampScore(value);
      }
      updates.push(`${key} = ?`);
      values.push(value);
    }
  }
  // Wird das (volle, spezifische) Genre manuell korrigiert, ohne dass gleichzeitig auch
  // die Hauptkategorie mitgeschickt wird, die Hauptkategorie automatisch neu ableiten –
  // sonst würde die Gruppierung in den Listen nicht mehr zum korrigierten Genre passen.
  if ('genre' in req.body && !('main_genre' in req.body)) {
    const labels = String(req.body.genre).split(',').map((s) => s.trim()).filter(Boolean);
    updates.push('main_genre = ?');
    values.push(pickMainGenre(labels));
  }
  if (updates.length === 0) {
    return res.status(400).json({ error: 'Keine gültigen Felder zum Aktualisieren.' });
  }
  updates.push('updated_at = ?');
  values.push(nowIso());
  values.push(req.params.id);
  db.prepare(`UPDATE titles SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare('SELECT * FROM titles WHERE id = ?').get(req.params.id);
  res.json({ title: serializeTitle(updated) });
});

router.delete('/:id', (req, res) => {
  const row = getOwnedTitle(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Titel nicht gefunden.' });
  db.prepare('DELETE FROM titles WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// Holt (und cacht) eine kurze KI/Wikipedia-Kurzbeschreibung sowie weitere Infos zum
// Titel: Poster-Bild, Regie, Besetzung, Auszeichnungen, Erscheinungsjahr, Laufzeit
// (Wikipedia + Wikidata, kein API-Key nötig).
router.post('/:id/fetch-info', async (req, res) => {
  const row = getOwnedTitle(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Titel nicht gefunden.' });

  const forceRefresh = req.query.refresh === 'true';
  if (row.ai_description && !forceRefresh) {
    return res.json({ title: serializeTitle(row) });
  }

  const { description, sourceUrl, posterUrl, ...extraDetails } = await fetchFilmDetails(row.name);
  db.prepare(
    `UPDATE titles
     SET ai_description = ?, ai_source_url = ?, ai_fetched_at = ?, poster_url = ?, extra_info = ?
     WHERE id = ?`
  ).run(description, sourceUrl, nowIso(), posterUrl, JSON.stringify(extraDetails), row.id);

  const updated = db.prepare('SELECT * FROM titles WHERE id = ?').get(row.id);
  res.json({ title: serializeTitle(updated) });
});

// Eigene, frei benannte Bewertungskategorien pro Titel.
router.post('/:id/custom-ratings', (req, res) => {
  const row = getOwnedTitle(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Titel nicht gefunden.' });
  if (row.status !== 'watched') {
    return res.status(400).json({
      error: 'Erst als "gesehen" markieren, um diesen Titel bewerten zu können.',
    });
  }

  const { label, score } = req.body;
  if (!label || typeof label !== 'string' || !label.trim()) {
    return res.status(400).json({ error: 'Name der Kategorie wird benötigt.' });
  }
  if (score === undefined || score === null) {
    return res.status(400).json({ error: 'Bewertung wird benötigt.' });
  }
  const info = db
    .prepare('INSERT INTO custom_ratings (title_id, label, score) VALUES (?, ?, ?)')
    .run(row.id, label.trim(), clampScore(score));

  const updatedRow = db.prepare('SELECT * FROM titles WHERE id = ?').get(row.id);
  res.status(201).json({ title: serializeTitle(updatedRow), customRatingId: info.lastInsertRowid });
});

function getOwnedCustomRating(titleId, customId, userId) {
  return db
    .prepare(
      `SELECT custom_ratings.*, titles.status AS title_status FROM custom_ratings
       JOIN titles ON titles.id = custom_ratings.title_id
       WHERE custom_ratings.id = ? AND custom_ratings.title_id = ? AND titles.owner_id = ?`
    )
    .get(customId, titleId, userId);
}

router.patch('/:id/custom-ratings/:customId', (req, res) => {
  const existing = getOwnedCustomRating(req.params.id, req.params.customId, req.userId);
  if (!existing) return res.status(404).json({ error: 'Kategorie nicht gefunden.' });
  if (existing.title_status !== 'watched') {
    return res.status(400).json({
      error: 'Erst als "gesehen" markieren, um diesen Titel bewerten zu können.',
    });
  }

  const { label, score } = req.body;
  const updates = [];
  const values = [];
  if (label !== undefined) {
    if (!label || !String(label).trim()) {
      return res.status(400).json({ error: 'Name der Kategorie darf nicht leer sein.' });
    }
    updates.push('label = ?');
    values.push(String(label).trim());
  }
  if (score !== undefined) {
    updates.push('score = ?');
    values.push(clampScore(score));
  }
  if (updates.length === 0) {
    return res.status(400).json({ error: 'Keine gültigen Felder zum Aktualisieren.' });
  }
  updates.push('updated_at = ?');
  values.push(nowIso());
  values.push(req.params.customId);
  db.prepare(`UPDATE custom_ratings SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const updatedRow = db.prepare('SELECT * FROM titles WHERE id = ?').get(req.params.id);
  res.json({ title: serializeTitle(updatedRow) });
});

router.delete('/:id/custom-ratings/:customId', (req, res) => {
  const existing = getOwnedCustomRating(req.params.id, req.params.customId, req.userId);
  if (!existing) return res.status(404).json({ error: 'Kategorie nicht gefunden.' });
  db.prepare('DELETE FROM custom_ratings WHERE id = ?').run(req.params.customId);

  const updatedRow = db.prepare('SELECT * FROM titles WHERE id = ?').get(req.params.id);
  res.json({ title: serializeTitle(updatedRow) });
});

export { serializeTitle, getCustomRatings, getCustomRatingsForTitles };
export default router;
