import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { serializeTitle } from './titles.js';

const router = Router();
router.use(requireAuth);

// Liste aller Freunde des angemeldeten Nutzers.
router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT u.id, u.username
       FROM friendships f
       JOIN users u ON u.id = f.friend_id
       WHERE f.user_id = ?
       ORDER BY u.username ASC`
    )
    .all(req.userId);
  res.json({ friends: rows });
});

// Freund per Benutzername hinzufügen. Die Freundschaft wird direkt beidseitig angelegt,
// damit beide Seiten sich gegenseitig sehen können (kein Anfrage/Bestätigen-Workflow).
router.post('/', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Benutzername wird benötigt.' });

  const friend = db.prepare('SELECT id, username FROM users WHERE username = ?').get(username);
  if (!friend) return res.status(404).json({ error: 'Diesen Benutzer gibt es nicht.' });
  if (friend.id === req.userId) {
    return res.status(400).json({ error: 'Du kannst dich nicht selbst hinzufügen.' });
  }

  const existing = db
    .prepare('SELECT id FROM friendships WHERE user_id = ? AND friend_id = ?')
    .get(req.userId, friend.id);
  if (existing) {
    return res.status(409).json({ error: 'Diese Person ist bereits in deiner Freundesliste.' });
  }

  const insert = db.prepare('INSERT INTO friendships (user_id, friend_id) VALUES (?, ?)');
  const txn = db.transaction(() => {
    insert.run(req.userId, friend.id);
    insert.run(friend.id, req.userId);
  });
  txn();

  res.status(201).json({ friend });
});

router.delete('/:friendId', (req, res) => {
  const friendId = Number(req.params.friendId);
  const txn = db.transaction(() => {
    db.prepare('DELETE FROM friendships WHERE user_id = ? AND friend_id = ?').run(
      req.userId,
      friendId
    );
    db.prepare('DELETE FROM friendships WHERE user_id = ? AND friend_id = ?').run(
      friendId,
      req.userId
    );
  });
  txn();
  res.status(204).end();
});

function isFriend(userId, friendId) {
  return !!db
    .prepare('SELECT id FROM friendships WHERE user_id = ? AND friend_id = ?')
    .get(userId, friendId);
}

// Titel eines Freundes lesend einsehen (Watchlist + geschaute Titel inkl. Bewertungen).
router.get('/:friendId/titles', (req, res) => {
  const friendId = Number(req.params.friendId);
  if (!isFriend(req.userId, friendId)) {
    return res.status(403).json({ error: 'Diese Person ist nicht in deiner Freundesliste.' });
  }
  const friend = db.prepare('SELECT id, username FROM users WHERE id = ?').get(friendId);
  const rows = db
    .prepare('SELECT * FROM titles WHERE owner_id = ? ORDER BY main_genre ASC, name ASC')
    .all(friendId);
  const titles = rows.map((row) => serializeTitle(row));
  titles.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'watched' ? -1 : 1;
    if (a.main_genre !== b.main_genre) return a.main_genre.localeCompare(b.main_genre);
    const avgA = a.average_rating ?? -1;
    const avgB = b.average_rating ?? -1;
    return avgB - avgA;
  });
  res.json({ friend, titles });
});

export default router;
