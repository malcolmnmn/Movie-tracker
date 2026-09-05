import { useEffect, useState } from 'react';
import { api, type Title } from '../api/client';
import { AddTitleForm } from '../components/AddTitleForm';
import { TitleGroupList } from '../components/TitleGroupList';

export function WatchlistPage() {
  const [titles, setTitles] = useState<Title[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await api.listTitles('to_watch');
    setTitles(res.titles);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(data: { name: string; type: Title['type']; genre: string }) {
    await api.createTitle({ ...data, status: 'to_watch' });
    await load();
  }

  async function markWatched(title: Title) {
    await api.updateTitle(title.id, { status: 'watched' });
    await load();
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-100 mb-1">Watchlist</h1>
      <p className="text-gray-400 mb-6">Filme und Serien, die du noch schauen willst.</p>

      <AddTitleForm onSubmit={handleAdd} />

      {loading ? (
        <p className="text-gray-400">Lädt…</p>
      ) : (
        <TitleGroupList
          titles={titles}
          linkTo={(t) => `/titles/${t.id}`}
          emptyMessage="Deine Watchlist ist leer. Füge oben einen Film oder eine Serie hinzu."
          renderActions={(title) => (
            <button
              onClick={() => markWatched(title)}
              className="text-xs bg-green-600 hover:bg-green-500 text-white rounded-lg px-3 py-1.5"
            >
              ✓ Als geschaut markieren
            </button>
          )}
        />
      )}
    </div>
  );
}
