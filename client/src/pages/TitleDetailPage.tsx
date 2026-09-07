import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, RATING_FIELDS, type Title } from '../api/client';

interface CustomRow {
  id: number | null;
  label: string;
  score: number;
}

export function TitleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState<Title | null>(null);
  const [loading, setLoading] = useState(true);
  const [infoLoading, setInfoLoading] = useState(false);
  const [savingRatings, setSavingRatings] = useState(false);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [customRows, setCustomRows] = useState<CustomRow[]>([]);
  const [editingGenre, setEditingGenre] = useState(false);
  const [genreDraft, setGenreDraft] = useState('');

  async function load() {
    setLoading(true);
    const res = await api.getTitle(Number(id));
    applyTitle(res.title);
    setLoading(false);

    if (!res.title.ai_description) {
      setInfoLoading(true);
      const withInfo = await api.fetchTitleInfo(res.title.id);
      setTitle(withInfo.title);
      setInfoLoading(false);
    }
  }

  function applyTitle(t: Title) {
    setTitle(t);
    const initial: Record<string, number> = {};
    for (const field of RATING_FIELDS) {
      const value = t[field.key];
      initial[field.key] = typeof value === 'number' ? value : 5;
    }
    setRatings(initial);
    setCustomRows(t.custom_ratings.map((c) => ({ id: c.id, label: c.label, score: c.score })));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function addCustomRow() {
    setCustomRows((rows) => [...rows, { id: null, label: '', score: 5 }]);
  }

  function updateCustomRow(index: number, patch: Partial<CustomRow>) {
    setCustomRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function removeCustomRow(index: number) {
    const row = customRows[index];
    if (row.id !== null && title) {
      if (!confirm(`Eigene Kategorie "${row.label}" wirklich löschen?`)) return;
      const res = await api.deleteCustomRating(title.id, row.id);
      applyTitle(res.title);
      return;
    }
    setCustomRows((rows) => rows.filter((_, i) => i !== index));
  }

  async function saveRatings() {
    if (!title) return;
    setSavingRatings(true);
    try {
      await api.updateTitle(title.id, ratings);
      for (const row of customRows) {
        if (row.id === null) {
          if (row.label.trim()) await api.addCustomRating(title.id, row.label.trim(), row.score);
        } else {
          await api.updateCustomRating(title.id, row.id, { label: row.label.trim(), score: row.score });
        }
      }
      const fresh = await api.getTitle(title.id);
      applyTitle(fresh.title);
    } finally {
      setSavingRatings(false);
    }
  }

  async function saveGenre() {
    if (!title || !genreDraft.trim()) {
      setEditingGenre(false);
      return;
    }
    const res = await api.updateTitle(title.id, { genre: genreDraft.trim() });
    setTitle(res.title);
    setEditingGenre(false);
  }

  async function toggleStatus() {
    if (!title) return;
    const nextStatus = title.status === 'watched' ? 'to_watch' : 'watched';
    const res = await api.updateTitle(title.id, { status: nextStatus });
    setTitle(res.title);
  }

  async function handleDelete() {
    if (!title) return;
    if (!confirm(`"${title.name}" wirklich löschen?`)) return;
    await api.deleteTitle(title.id);
    navigate(title.status === 'watched' ? '/watched' : '/watchlist');
  }

  if (loading || !title) {
    return <div className="p-8 text-center text-gray-400">Lädt…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-gray-400 hover:text-gray-200 mb-3"
        >
          ← Zurück
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-100">{title.name}</h1>
            <span className="inline-block mt-1.5 text-xs font-semibold uppercase tracking-wide bg-yellow-400/10 text-yellow-400 rounded px-2 py-0.5">
              {title.main_genre}
            </span>
            <p className="text-gray-400 text-sm mt-1.5 flex items-center gap-1.5 flex-wrap">
              {title.type === 'movie' ? 'Film' : 'Serie'} ·{' '}
              {editingGenre ? (
                <input
                  autoFocus
                  value={genreDraft}
                  onChange={(e) => setGenreDraft(e.target.value)}
                  onBlur={saveGenre}
                  onKeyDown={(e) => e.key === 'Enter' && saveGenre()}
                  className="bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5 text-sm text-gray-100 w-32"
                />
              ) : (
                <button
                  onClick={() => {
                    setGenreDraft(title.genre);
                    setEditingGenre(true);
                  }}
                  className="underline decoration-dotted decoration-gray-600 hover:text-gray-200"
                  title="Automatisch erkanntes Genre korrigieren"
                >
                  {title.genre}
                </button>
              )}
            </p>
          </div>
          {title.average_rating !== null && (
            <div className="text-right shrink-0">
              <div className="text-4xl font-bold text-yellow-400">
                {title.average_rating.toFixed(1)}
              </div>
              <div className="text-xs text-gray-400">
                Durchschnitt ({title.rating_count} Kategorien)
              </div>
            </div>
          )}
        </div>
      </div>

      <section className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-yellow-400 uppercase tracking-wide mb-2">
          Kurzbeschreibung
        </h2>
        {infoLoading ? (
          <p className="text-gray-400 text-sm">Lade Informationen…</p>
        ) : (
          <>
            <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-line">
              {title.ai_description}
            </p>
            {title.ai_source_url && (
              <a
                href={title.ai_source_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-yellow-400 hover:underline mt-2 inline-block"
              >
                Quelle ansehen
              </a>
            )}
          </>
        )}
      </section>

      <section className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-yellow-400 uppercase tracking-wide mb-4">
          Bewertung (1–10)
        </h2>
        <div className="space-y-4">
          {RATING_FIELDS.map((field) => (
            <div key={field.key} className="flex items-center gap-4">
              <label className="text-sm text-gray-300 w-48 shrink-0">{field.label}</label>
              <input
                type="range"
                min={1}
                max={10}
                value={ratings[field.key] ?? 5}
                onChange={(e) =>
                  setRatings((r) => ({ ...r, [field.key]: Number(e.target.value) }))
                }
                className="rating-slider flex-1"
              />
              <span className="w-8 text-right font-semibold text-gray-100">
                {ratings[field.key] ?? 5}
              </span>
            </div>
          ))}
        </div>

        {customRows.length > 0 && (
          <div className="space-y-3 mt-5 pt-5 border-t border-gray-700">
            {customRows.map((row, index) => (
              <div
                key={row.id ?? `new-${index}`}
                className="flex items-center gap-4 border-l-4 border-violet-400 bg-violet-400/5 rounded-r-lg pl-3 py-1.5"
              >
                <input
                  value={row.label}
                  onChange={(e) => updateCustomRow(index, { label: e.target.value })}
                  placeholder="Eigene Kategorie…"
                  className="w-48 shrink-0 bg-gray-900 border border-violet-400/40 rounded-lg px-2 py-1 text-sm text-gray-100"
                />
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={row.score}
                  onChange={(e) => updateCustomRow(index, { score: Number(e.target.value) })}
                  className="rating-slider flex-1 accent-violet-400"
                />
                <span className="w-8 text-right font-semibold text-gray-100">{row.score}</span>
                <button
                  onClick={() => removeCustomRow(index)}
                  className="text-violet-300 hover:text-violet-100 text-sm px-1"
                  title="Kategorie entfernen"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={addCustomRow}
          className="mt-4 text-sm border border-violet-400/50 text-violet-300 hover:bg-violet-400/10 rounded-lg px-3 py-1.5"
        >
          + Eigene Kategorie hinzufügen
        </button>

        <div>
          <button
            onClick={saveRatings}
            disabled={savingRatings}
            className="mt-5 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-gray-900 font-semibold rounded-lg px-4 py-2 text-sm"
          >
            {savingRatings ? 'Speichert…' : 'Bewertung speichern'}
          </button>
        </div>
      </section>

      <div className="flex gap-3">
        <button
          onClick={toggleStatus}
          className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-lg px-4 py-2"
        >
          {title.status === 'watched' ? 'Zurück in die Watchlist' : 'Als geschaut markieren'}
        </button>
        <button
          onClick={handleDelete}
          className="text-sm bg-red-900/60 hover:bg-red-900 text-red-200 rounded-lg px-4 py-2"
        >
          Löschen
        </button>
      </div>
    </div>
  );
}
