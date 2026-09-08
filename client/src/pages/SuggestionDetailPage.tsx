import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type SuggestionDetail } from '../api/client';

function typeLabel(type: SuggestionDetail['type']) {
  return type === 'movie' ? 'Film' : 'Serie';
}

function trailerSearchUrl(name: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} trailer`)}`;
}

export function SuggestionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [suggestion, setSuggestion] = useState<SuggestionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getSuggestion(Number(id)).then((res) => {
      setSuggestion(res.suggestion);
      setLoading(false);
    });
  }, [id]);

  async function handleAdd(status: 'to_watch' | 'watched') {
    if (!suggestion) return;
    setBusy(true);
    try {
      await api.createTitle({ name: suggestion.name, type: suggestion.type, status });
      navigate('/suggestions');
    } finally {
      setBusy(false);
    }
  }

  if (loading || !suggestion) {
    return <div className="p-8 text-center text-gray-400">Lädt…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <button
        onClick={() => navigate('/suggestions')}
        className="text-sm text-gray-400 hover:text-gray-200"
      >
        ← Zurück zu den Vorschlägen
      </button>

      <div>
        <h1 className="text-3xl font-bold text-gray-100">{suggestion.name}</h1>
        <p className="text-gray-400 text-sm mt-1.5">
          {typeLabel(suggestion.type)} · {suggestion.category}
        </p>
      </div>

      <section className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-yellow-400 uppercase tracking-wide mb-2">
          Kurzbeschreibung
        </h2>
        <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-line">
          {suggestion.description}
        </p>
        <a
          href={trailerSearchUrl(suggestion.name)}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-sm bg-red-600/90 hover:bg-red-600 text-white rounded-lg px-3 py-1.5"
        >
          ▶ Trailer auf YouTube suchen
        </a>
      </section>

      <div className="flex gap-3">
        <button
          disabled={busy}
          onClick={() => handleAdd('watched')}
          className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-2 text-sm"
        >
          ✓ Als gesehen markieren
        </button>
        <button
          disabled={busy}
          onClick={() => handleAdd('to_watch')}
          className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-100 font-semibold rounded-lg px-4 py-2 text-sm"
        >
          + Zur Watchlist
        </button>
      </div>
    </div>
  );
}
