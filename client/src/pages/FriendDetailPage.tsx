import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, RATING_FIELDS, type Friend, type Title } from '../api/client';

function typeLabel(type: Title['type']) {
  return type === 'movie' ? 'Film' : 'Serie';
}

function TitleDetails({ title }: { title: Title }) {
  return (
    <div className="mt-3 pt-3 border-t border-gray-700 space-y-3 text-sm">
      {title.ai_description && (
        <p className="text-gray-300 leading-relaxed">{title.ai_description}</p>
      )}
      {title.rating_count > 0 ? (
        <ul className="grid grid-cols-2 gap-1">
          {RATING_FIELDS.filter((field) => title[field.key] !== null).map((field) => (
            <li key={field.key} className="text-gray-400">
              {field.label}: <span className="text-gray-100">{title[field.key]}</span>
            </li>
          ))}
          {title.custom_ratings.map((c) => (
            <li key={c.id} className="text-violet-300">
              {c.label} <span className="text-violet-400/70">(eigene Kategorie)</span>:{' '}
              <span className="text-violet-100">{c.score}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 italic">Noch nicht bewertet.</p>
      )}
    </div>
  );
}

export function FriendDetailPage() {
  const { friendId } = useParams();
  const [friend, setFriend] = useState<Friend | null>(null);
  const [titles, setTitles] = useState<Title[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    api.friendTitles(Number(friendId)).then((res) => {
      setFriend(res.friend);
      setTitles(res.titles);
      setLoading(false);
    });
  }, [friendId]);

  if (loading) return <div className="p-8 text-center text-gray-400">Lädt…</div>;

  const watched = titles.filter((t) => t.status === 'watched');
  const toWatch = titles.filter((t) => t.status === 'to_watch');

  function renderSection(label: string, items: Title[]) {
    if (items.length === 0) return null;
    const groups = new Map<string, Title[]>();
    for (const t of items) {
      const list = groups.get(t.main_genre) ?? [];
      list.push(t);
      groups.set(t.main_genre, list);
    }
    return (
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-100 mb-3">{label}</h2>
        <div className="space-y-6">
          {[...groups.entries()].map(([mainGenre, group]) => (
            <div key={mainGenre}>
              <h3 className="text-yellow-400 font-semibold uppercase tracking-wide text-sm mb-2">
                {mainGenre}
              </h3>
              <ul className="grid gap-3 sm:grid-cols-2">
                {group.map((title) => (
                  <li
                    key={title.id}
                    className="bg-gray-800 rounded-xl p-4 border border-gray-700 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === title.id ? null : title.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-medium text-gray-100">{title.name}</span>
                        <span className="block text-xs text-gray-400">
                          {typeLabel(title.type)}
                          {title.genre && title.genre !== title.main_genre && (
                            <span className="text-gray-500"> · {title.genre}</span>
                          )}
                        </span>
                      </div>
                      {title.average_rating !== null && (
                        <span className="font-bold text-yellow-400">
                          {title.average_rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    {expandedId === title.id && <TitleDetails title={title} />}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link to="/friends" className="text-sm text-gray-400 hover:text-gray-200">
        ← Zurück zu Freunden
      </Link>
      <h1 className="text-2xl font-bold text-gray-100 mt-2 mb-6">
        {friend?.username}s Filme &amp; Serien
      </h1>
      {titles.length === 0 ? (
        <p className="text-gray-400 italic">Diese Person hat noch nichts eingetragen.</p>
      ) : (
        <>
          {renderSection('Bereits geschaut', watched)}
          {renderSection('Watchlist', toWatch)}
        </>
      )}
    </div>
  );
}
