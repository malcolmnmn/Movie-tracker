import { useEffect, useState } from 'react';
import { api, type Title } from '../api/client';
import { AddTitleForm } from '../components/AddTitleForm';
import { TitleGroupList } from '../components/TitleGroupList';

export function WatchedPage() {
  const [titles, setTitles] = useState<Title[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await api.listTitles('watched');
    setTitles(res.titles);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(data: { name: string; type: Title['type']; genre: string; mainGenre: string }) {
    await api.createTitle({ ...data, status: 'watched' });
    await load();
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-100 mb-1">Bereits geschaut</h1>
      <p className="text-gray-400 mb-6">
        Nach Genre gruppiert, innerhalb jeder Kategorie sortiert von der besten zur
        schlechtesten Bewertung. Klicke auf einen Titel, um ihn zu bewerten.
      </p>

      <AddTitleForm onSubmit={handleAdd} />

      {loading ? (
        <p className="text-gray-400">Lädt…</p>
      ) : (
        <TitleGroupList
          titles={titles}
          linkTo={(t) => `/titles/${t.id}`}
          emptyMessage="Du hast noch nichts als geschaut markiert."
        />
      )}
    </div>
  );
}
