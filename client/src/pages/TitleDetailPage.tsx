import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, RATING_FIELDS, type Title } from '../api/client';

export function TitleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState<Title | null>(null);
  const [loading, setLoading] = useState(true);
  const [infoLoading, setInfoLoading] = useState(false);
  const [savingRatings, setSavingRatings] = useState(false);
  const [ratings, setRatings] = useState<Record<string, number>>({});

  async function load() {
    setLoading(true);
    const res = await api.getTitle(Number(id));
    setTitle(res.title);
    const initial: Record<string, number> = {};
    for (const field of RATING_FIELDS) {
      const value = res.title[field.key];
      initial[field.key] = typeof value === 'number' ? value : 5;
    }
    setRatings(initial);
    setLoading(false);

    if (!res.title.ai_description) {
      setInfoLoading(true);
      const withInfo = await api.fetchTitleInfo(res.title.id);
      setTitle(withInfo.title);
      setInfoLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function saveRatings() {
    if (!title) return;
    setSavingRatings(true);
    const res = await api.updateTitle(title.id, ratings);
    setTitle(res.title);
    setSavingRatings(false);
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
            <p className="text-gray-400 text-sm mt-1">
              {title.type === 'movie' ? 'Film' : 'Serie'} · {title.genre}
            </p>
          </div>
          {title.average_rating !== null && (
            <div className="text-right shrink-0">
              <div className="text-4xl font-bold text-yellow-400">
                {title.average_rating.toFixed(1)}
              </div>
              <div className="text-xs text-gray-400">Durchschnitt</div>
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
        <button
          onClick={saveRatings}
          disabled={savingRatings}
          className="mt-5 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-gray-900 font-semibold rounded-lg px-4 py-2 text-sm"
        >
          {savingRatings ? 'Speichert…' : 'Bewertung speichern'}
        </button>
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
