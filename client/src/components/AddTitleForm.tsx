import { useRef, useState } from 'react';
import { api, type TitleType } from '../api/client';

interface Props {
  onSubmit: (data: { name: string; type: TitleType; genre: string }) => Promise<void>;
}

const FALLBACK_GENRE = 'Sonstiges';

export function AddTitleForm({ onSubmit }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<TitleType>('movie');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Genre wird komplett automatisch ermittelt (Wikidata) – kein Eingabefeld dafür.
  // Wird bereits im Hintergrund geladen, sobald das Namensfeld verlassen wird, damit
  // beim Absenden meist schon ein Ergebnis vorliegt; falls nicht, wird es beim
  // Absenden selbst nachgeholt. Schlägt die Erkennung fehl, greift ein Sammel-Genre.
  const resolvedGenre = useRef<{ forName: string; genre: string } | null>(null);
  const lookupRequestId = useRef(0);

  async function lookupGenreFor(trimmedName: string) {
    try {
      const res = await api.lookupGenre(trimmedName);
      return res.genre || FALLBACK_GENRE;
    } catch {
      return FALLBACK_GENRE;
    }
  }

  async function handleNameBlur() {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const requestId = ++lookupRequestId.current;
    const genre = await lookupGenreFor(trimmedName);
    if (requestId !== lookupRequestId.current) return; // Name hat sich inzwischen geändert
    resolvedGenre.current = { forName: trimmedName, genre };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Bitte einen Titel eingeben.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const genre =
        resolvedGenre.current?.forName === trimmedName
          ? resolvedGenre.current.genre
          : await lookupGenreFor(trimmedName);
      await onSubmit({ name: trimmedName, type, genre });
      setName('');
      resolvedGenre.current = null;
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
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 w-64"
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
      <button
        type="submit"
        disabled={submitting}
        className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-gray-900 font-semibold rounded-lg px-4 py-2 text-sm"
      >
        {submitting ? 'Wird hinzugefügt…' : '+ Hinzufügen'}
      </button>
      <p className="text-xs text-gray-500 w-full">
        Das Genre wird automatisch erkannt – du musst es nicht eintragen.
      </p>
      {error && <p className="text-red-400 text-sm w-full">{error}</p>}
    </form>
  );
}
