import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Friend } from '../api/client';

export function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const res = await api.listFriends();
    setFriends(res.friends);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.addFriend(username.trim());
      setUsername('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Hinzufügen.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(friendId: number) {
    if (!confirm('Diese Person aus deiner Freundesliste entfernen?')) return;
    await api.removeFriend(friendId);
    await load();
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-100 mb-1">Freunde</h1>
      <p className="text-gray-400 mb-6">
        Füge Freunde per Benutzername hinzu und sieh dir ihre Listen und Bewertungen an.
      </p>

      <form
        onSubmit={handleAdd}
        className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex gap-3 items-end mb-8"
      >
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs text-gray-400">Benutzername</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="z. B. bob"
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-gray-900 font-semibold rounded-lg px-4 py-2 text-sm"
        >
          + Freund hinzufügen
        </button>
      </form>
      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-400">Lädt…</p>
      ) : friends.length === 0 ? (
        <p className="text-gray-400 italic">Noch keine Freunde hinzugefügt.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {friends.map((friend) => (
            <li
              key={friend.id}
              className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center justify-between"
            >
              <Link
                to={`/friends/${friend.id}`}
                className="font-medium text-gray-100 hover:text-yellow-400"
              >
                {friend.username}
              </Link>
              <button
                onClick={() => handleRemove(friend.id)}
                className="text-xs text-red-300 hover:text-red-200"
              >
                Entfernen
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
