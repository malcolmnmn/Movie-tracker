import { Link } from 'react-router-dom';
import type { Title } from '../api/client';

function typeLabel(type: Title['type']) {
  return type === 'movie' ? 'Film' : 'Serie';
}

function ratingColor(avg: number | null) {
  if (avg === null) return 'text-gray-400';
  if (avg >= 7) return 'text-green-400';
  if (avg >= 4) return 'text-yellow-400';
  return 'text-red-400';
}

interface Props {
  titles: Title[];
  linkTo: (title: Title) => string;
  emptyMessage: string;
  renderActions?: (title: Title) => React.ReactNode;
}

export function TitleGroupList({ titles, linkTo, emptyMessage, renderActions }: Props) {
  if (titles.length === 0) {
    return <p className="text-gray-400 italic">{emptyMessage}</p>;
  }

  const groups = new Map<string, Title[]>();
  for (const title of titles) {
    const list = groups.get(title.genre) ?? [];
    list.push(title);
    groups.set(title.genre, list);
  }

  return (
    <div className="space-y-8">
      {[...groups.entries()].map(([genre, items]) => (
        <div key={genre}>
          <h3 className="text-yellow-400 font-semibold uppercase tracking-wide text-sm mb-3">
            {genre}
          </h3>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((title) => (
              <li
                key={title.id}
                className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-yellow-400 transition-colors"
              >
                <Link to={linkTo(title)} className="block">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-gray-100">{title.name}</span>
                    {title.average_rating !== null && (
                      <span className={`font-bold ${ratingColor(title.average_rating)}`}>
                        {title.average_rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{typeLabel(title.type)}</span>
                </Link>
                {renderActions && <div className="mt-3">{renderActions(title)}</div>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
