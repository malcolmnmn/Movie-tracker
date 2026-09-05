import { Router } from 'express';
import { db, nowIso } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { fetchTitleSummary } from '../services/movieInfo.js';

const router = Router();
router.use(requireAuth);

export const RATING_FIELDS = [
  { key: 'rating_acting', label: 'Schauspielleistung' },
  { key: 'rating_story', label: 'Story' },
  { key: 'rating_tension', label: 'Spannung / Interesse' },
  { key: 'rating_pacing', label: 'Länge / Pacing' },
  { key: 'rating_visuals', label: 'Bildgestaltung' },
];

function withAverage(title) {
  const values = RATING_FIELDS.map((f) => title[f.key]).filter(
    (v) => v !== null && v !== undefined
  );
  const average =
    values.length > 0
      ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
      : null;
  return { ...title, average_rating: average, rating_count: values.length };
}

function serializeTitle(row) {
  return withAverage({
    id: row.id,
    name: row.name,
    type: row.type,
    genre: row.genre,
    status: row.status,
    notes: row.notes,
    rating_acting: row.rating_acting,
    rating_story: row.rating_story,
    rating_tension: row.rating_tension,
    rating_pacing: row.rating_pacing,
    rating_visuals: row.rating_visuals,
    ai_description: row.ai_description,
    ai_source_url: row.ai_source_url,
    ai_fetched_at: row.ai_fetched_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

// Liste aller Titel des angemeldeten Nutzers, optional gefiltert nach Status.
// Die Sortierung nach Genre + Bewertung (bester zuerst) übernimmt die Liste selbst;
// das Frontend gruppiert zusätzlich visuell nach Genre.
router.get('/', (req, res) => {
  const { status } = req.query;
  let rows;
  if (status === 'to_watch' || status === 'watched') {
    rows = db
      .prepare('SELECT * FROM titles WHERE owner_id = ? AND status = ? ORDER BY genre ASC, name ASC')
      .all(req.userId, status);
  } else {
    rows = db
      .prepare('SELECT * FROM titles WHERE owner_id = ? ORDER BY genre ASC, name ASC')
      .all(req.userId);
  }
  const titles = rows.map(serializeTitle);
  if (status === 'watched') {
    titles.sort((a, b) => {
      if (a.genre !== b.genre) return a.genre.localeCompare(b.genre);
      const avgA = a.average_rating ?? -1;
      const avgB = b.average_rating ?? -1;
      return avgB - avgA;
    });
  }
  res.json({ titles });
});

router.post('/', (req, res) => {
  const { name, type, genre, status } = req.body;
  if (!name || !type || !genre) {
    return res.status(400).json({ error: 'Name, Typ und Genre werden benötigt.' });
  }
  if (!['movie', 'series'].includes(type)) {
    return res.status(400).json({ error: 'Typ muss "movie" oder "series" sein.' });
  }
  const info = db
    .prepare(
      `INSERT INTO titles (owner_id, name, type, genre, status)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(req.userId, name.trim(), type, genre.trim(), status === 'watched' ? 'watched' : 'to_watch');
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

  const allowed = ['name', 'genre', 'status', 'notes', ...RATING_FIELDS.map((f) => f.key)];
  const updates = [];
  const values = [];
  for (const key of allowed) {
    if (key in req.body) {
      let value = req.body[key];
      if (RATING_FIELDS.some((f) => f.key === key) && value !== null) {
        value = Math.max(1, Math.min(10, Math.round(Number(value))));
      }
      updates.push(`${key} = ?`);
      values.push(value);
    }
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

// Holt (und cacht) eine kurze KI/Wikipedia-Kurzbeschreibung für den Titel.
router.post('/:id/fetch-info', async (req, res) => {
  const row = getOwnedTitle(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Titel nicht gefunden.' });

  const forceRefresh = req.query.refresh === 'true';
  if (row.ai_description && !forceRefresh) {
    return res.json({ title: serializeTitle(row) });
  }

  const { description, sourceUrl } = await fetchTitleSummary(row.name);
  db.prepare(
    'UPDATE titles SET ai_description = ?, ai_source_url = ?, ai_fetched_at = ? WHERE id = ?'
  ).run(description, sourceUrl, nowIso(), row.id);

  const updated = db.prepare('SELECT * FROM titles WHERE id = ?').get(row.id);
  res.json({ title: serializeTitle(updated) });
});

export { serializeTitle };
export default router;
