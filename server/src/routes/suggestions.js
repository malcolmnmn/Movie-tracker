import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

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

export default router;
