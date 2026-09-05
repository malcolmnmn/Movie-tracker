import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await register(username, password);
      navigate('/watchlist');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registrierung fehlgeschlagen.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 border border-gray-700 rounded-2xl p-8 w-full max-w-sm space-y-4"
      >
        <h1 className="text-2xl font-bold text-yellow-400 text-center mb-2">🎬 Movie Tracker</h1>
        <p className="text-center text-gray-400 text-sm mb-4">Neues Konto erstellen</p>
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Benutzername</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
            autoFocus
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Passwort (mind. 4 Zeichen)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-gray-900 font-semibold rounded-lg px-4 py-2 text-sm"
        >
          {submitting ? 'Registrieren…' : 'Registrieren'}
        </button>
        <p className="text-center text-sm text-gray-400">
          Schon ein Konto?{' '}
          <Link to="/login" className="text-yellow-400 hover:underline">
            Anmelden
          </Link>
        </p>
      </form>
    </div>
  );
}
