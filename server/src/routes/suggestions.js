import { Router } from 'express';
import { db, nowIso } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { fetchTitleSummary } from '../services/movieInfo.js';

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

// Ganz bewusst schlank gehalten (nur Kurzbeschreibung, kein Poster/Cast/Auszeichnungen
// wie bei einem bereits hinzugefügten Titel): ein Vorschlag ist noch nicht Teil der
// eigenen Liste, hier soll man nur auf einen Blick einschätzen können, worum es geht,
// bevor man ihn zur Watchlist hinzufügt oder als gesehen markiert. Wird gecacht, damit
// nicht bei jedem Aufruf erneut extern nachgeschlagen werden muss.
router.get('/:id', async (req, res) => {
  const row = db.prepare('SELECT * FROM suggested_titles WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Vorschlag nicht gefunden.' });

  if (!row.ai_description) {
    const { description, sourceUrl } = await fetchTitleSummary(row.name);
    db.prepare(
      'UPDATE suggested_titles SET ai_description = ?, ai_source_url = ?, ai_fetched_at = ? WHERE id = ?'
    ).run(description, sourceUrl, nowIso(), row.id);
    row.ai_description = description;
    row.ai_source_url = sourceUrl;
  }

  res.json({
    suggestion: {
      id: row.id,
      name: row.name,
      type: row.type,
      category: row.category,
      description: row.ai_description,
      sourceUrl: row.ai_source_url,
    },
  });
});

export default router;
