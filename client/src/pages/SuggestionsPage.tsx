import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Suggestion } from '../api/client';

const CATEGORY_ORDER = ['Klassiker', 'Meistgefeiert', 'Neu'];
const TYPE_ORDER: Array<{ key: Suggestion['type']; label: string }> = [
  { key: 'movie', label: 'Filme' },
  { key: 'series', label: 'Serien' },
];

export function SuggestionsPage() {
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    const res = await api.listSuggestions();
    setSuggestions(res.suggestions);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(suggestion: Suggestion, status: 'to_watch' | 'watched') {
    setBusyId(suggestion.id);
    try {
      await api.createTitle({ name: suggestion.name, type: suggestion.type, status });
      setSuggestions((list) => list.filter((s) => s.id !== suggestion.id));
    } finally {
      setBusyId(null);
    }
  }

  const categoryGroups = new Map<string, Suggestion[]>();
  for (const s of suggestions) {
    const list = categoryGroups.get(s.category) ?? [];
    list.push(s);
    categoryGroups.set(s.category, list);
  }
  const orderedCategories = [
    ...CATEGORY_ORDER.filter((c) => categoryGroups.has(c)),
    ...[...categoryGroups.keys()].filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-100 mb-1">Film-Vorschlag</h1>
      <p className="text-gray-400 mb-6">
        Eine handverlesene Auswahl aus Klassikern, besonders gefeierten Werken und
        neueren Titeln – wird laufend ergänzt. Bereits hinzugefügte Titel verschwinden
        automatisch aus dieser Liste. Für mehr Infos auf einen Titel klicken.
      </p>

      {loading ? (
        <p className="text-gray-400">Lädt…</p>
      ) : suggestions.length === 0 ? (
        <p className="text-gray-400 italic">
          Du hast bereits alle aktuellen Vorschläge zu deiner Liste hinzugefügt. 🎉
        </p>
      ) : (
        <div className="space-y-10">
          {orderedCategories.map((category) => {
            const items = categoryGroups.get(category)!;
            return (
              <div key={category}>
                <h2 className="text-yellow-400 font-semibold uppercase tracking-wide text-sm mb-4">
                  {category}
                </h2>
                <div className="space-y-5">
                  {TYPE_ORDER.map(({ key, label }) => {
                    const typeItems = items.filter((s) => s.type === key);
                    if (typeItems.length === 0) return null;
                    return (
                      <div key={key}>
                        <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">
                          {label}
                        </h3>
                        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          {typeItems.map((s) => (
                            <li
                              key={s.id}
                              className="bg-gray-800 rounded-xl p-3 border border-gray-700 hover:border-yellow-400 transition-colors flex flex-col gap-2"
                            >
                              <button
                                onClick={() => navigate(`/suggestions/${s.id}`)}
                                className="text-left font-medium text-gray-100 leading-snug hover:text-yellow-400"
                              >
                                {s.name}
                              </button>
                              <div className="flex gap-1.5 mt-auto">
                                <button
                                  disabled={busyId === s.id}
                                  onClick={() => handleAdd(s, 'watched')}
                                  className="flex-1 text-xs bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg px-2 py-1.5"
                                >
                                  ✓ Geschaut
                                </button>
                                <button
                                  disabled={busyId === s.id}
                                  onClick={() => handleAdd(s, 'to_watch')}
                                  className="flex-1 text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-100 rounded-lg px-2 py-1.5"
                                >
                                  + Watchlist
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
