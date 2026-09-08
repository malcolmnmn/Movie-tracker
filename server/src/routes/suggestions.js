import { Router } from 'express';
import { db, nowIso } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { fetchFilmDetails } from '../services/movieInfo.js';

const router = Router();
router.use(requireAuth);

// Liefert die kuratierte Film-/Serien-Vorschlagsliste, gefiltert um alles, was der
// angemeldete Nutzer bereits (egal ob Watchlist oder geschaut) in seiner eigenen Liste
// hat – Namensvergleich ohne Groß-/Kleinschreibung, damit z. B. "inception" auch
// "Inception" aus den Vorschlägen entfernt.
router.get('/', (req, res) => {
  const ownedNames = new Set(
    db
      .prepare('SELECT name FROM titles WHERE owner_id = ?')
      .all(req.userId)
      .map((row) => row.name.trim().toLowerCase())
  );

  const suggestions = db
    .prepare('SELECT id, name, type, category FROM suggested_titles ORDER BY category ASC, name ASC')
    .all()
    .filter((s) => !ownedNames.has(s.name.trim().toLowerCase()));

  res.json({ suggestions });
});

// Bewusst schlank gehalten (kurze Beschreibung + Trailer-Link stehen im Vordergrund,
// keine Bewertung – die bleibt der Detailseite bereits hinzugefügter Titel
// vorbehalten): trotzdem werden Poster, Besetzung und Auszeichnungen mit angezeigt,
// sofern vorhanden, damit man sich vor dem Hinzufügen ein besseres Bild machen kann.
// Wird gecacht, damit nicht bei jedem Aufruf erneut extern nachgeschlagen werden muss.
router.get('/:id', async (req, res) => {
  const row = db.prepare('SELECT * FROM suggested_titles WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Vorschlag nicht gefunden.' });

  if (!row.ai_description) {
    const { description, sourceUrl, posterUrl, ...extraDetails } = await fetchFilmDetails(row.name);
    const extraInfo = JSON.stringify(extraDetails);
    db.prepare(
      `UPDATE suggested_titles
       SET ai_description = ?, ai_source_url = ?, ai_fetched_at = ?, poster_url = ?, extra_info = ?
       WHERE id = ?`
    ).run(description, sourceUrl, nowIso(), posterUrl, extraInfo, row.id);
    row.ai_description = description;
    row.ai_source_url = sourceUrl;
    row.poster_url = posterUrl;
    row.extra_info = extraInfo;
  }

  res.json({
    suggestion: {
      id: row.id,
      name: row.name,
      type: row.type,
      category: row.category,
      description: row.ai_description,
      sourceUrl: row.ai_source_url,
      posterUrl: row.poster_url,
      extraInfo: row.extra_info ? JSON.parse(row.extra_info) : null,
    },
  });
});

export default router;
