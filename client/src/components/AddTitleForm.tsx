import { useRef, useState } from 'react';
import { api, type TitleType } from '../api/client';

interface Props {
  onSubmit: (data: { name: string; type: TitleType; genre: string }) => Promise<void>;
}

const COMMON_GENRES = [
  'Action',
  'Komödie',
  'Drama',
  'Sci-Fi',
  'Horror',
  'Thriller',
  'Fantasy',
  'Animation',
  'Dokumentation',
  'Romanze',
];

export function AddTitleForm({ onSubmit }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<TitleType>('movie');
  const [genre, setGenre] = useState('');
  const [genreLoading, setGenreLoading] = useState(false);
  const [genreAutoFilled, setGenreAutoFilled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lookupRequestId = useRef(0);

  // Schlägt beim Verlassen des Namensfelds automatisch ein Genre vor (über eine
  // Filmdatenbank im Internet), falls das Genre-Feld noch leer ist. Bleibt frei
  // überschreibbar.
  async function handleNameBlur() {
    if (!name.trim() || genre.trim()) return;
    const requestId = ++lookupRequestId.current;
    setGenreLoading(true);
    try {
      const res = await api.lookupGenre(name.trim());
      if (requestId !== lookupRequestId.current) return; // Name hat sich inzwischen geändert
      if (res.genre && !genre.trim()) {
        setGenre(res.genre);
        setGenreAutoFilled(true);
      }
    } catch {
      // Kein Vorschlag verfügbar – Nutzer trägt Genre einfach manuell ein.
    } finally {
      if (requestId === lookupRequestId.current) setGenreLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !genre.trim()) {
      setError('Bitte Name und Genre angeben.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ name: name.trim(), type, genre: genre.trim() });
      setName('');
      setGenre('');
      setGenreAutoFilled(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Hinzufügen.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-wrap gap-3 items-end mb-8"
    >
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">Titel</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleNameBlur}
          placeholder="z. B. Inception"
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 w-56"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">Typ</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as TitleType)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
        >
          <option value="movie">Film</option>
          <option value="series">Serie</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">
          Genre / Kategorie
          {genreLoading && <span className="text-gray-500"> · wird vorgeschlagen…</span>}
          {genreAutoFilled && !genreLoading && (
            <span className="text-yellow-400"> · automatisch vorgeschlagen</span>
          )}
        </label>
        <input
          value={genre}
          onChange={(e) => {
            setGenre(e.target.value);
            setGenreAutoFilled(false);
          }}
          placeholder="z. B. Sci-Fi"
          list="genre-suggestions"
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 w-44"
        />
        <datalist id="genre-suggestions">
          {COMMON_GENRES.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-gray-900 font-semibold rounded-lg px-4 py-2 text-sm"
      >
        {submitting ? 'Wird hinzugefügt…' : '+ Hinzufügen'}
      </button>
      {error && <p className="text-red-400 text-sm w-full">{error}</p>}
    </form>
  );
}
