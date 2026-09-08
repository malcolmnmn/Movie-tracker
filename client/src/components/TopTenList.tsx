import { Link } from 'react-router-dom';
import type { Title } from '../api/client';

function typeLabel(type: Title['type']) {
  return type === 'movie' ? 'Film' : 'Serie';
}

function ratingColor(avg: number) {
  if (avg >= 7) return 'text-green-400';
  if (avg >= 4) return 'text-yellow-400';
  return 'text-red-400';
}

interface Props {
  titles: Title[];
  linkTo?: (title: Title) => string;
  onSelect?: (title: Title) => void;
  heading?: string;
}

// Genreübergreifende Top 10 nach Durchschnittsbewertung – berücksichtigt nur bereits
// bewertete Titel und aktualisiert sich automatisch, sobald sich Bewertungen ändern
// (reine Ableitung aus den vorhandenen Titeln, keine eigene Speicherung nötig).
// Je nach Kontext entweder als Link zur eigenen Detailseite (linkTo) oder als
// klickbarer Eintrag, der z. B. bei einem Freund die Details inline aufklappt
// (onSelect) nutzbar.
export function TopTenList({ titles, linkTo, onSelect, heading = 'Top 10' }: Props) {
  const top10 = titles
    .filter((t) => t.rating_count > 0 && t.average_rating !== null)
    .sort((a, b) => b.average_rating! - a.average_rating!)
    .slice(0, 10);

  if (top10.length === 0) return null;

  const itemClass =
    'flex items-center gap-3 bg-gray-800 rounded-xl px-3 py-2.5 border border-gray-700 hover:border-yellow-400 transition-colors w-full text-left';

  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-gray-100 mb-1">🏆 {heading}</h2>
      <p className="text-gray-400 text-sm mb-3">
        Die bestbewerteten Titel, genreübergreifend – nach Durchschnittsbewertung sortiert.
      </p>
      <ol className="grid gap-2 sm:grid-cols-2">
        {top10.map((title, index) => {
          const content = (
            <>
              <span className="text-yellow-400 font-bold w-6 text-center shrink-0">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <span className="block text-gray-100 font-medium truncate">{title.name}</span>
                <span className="text-xs text-gray-400">
                  {typeLabel(title.type)} · {title.main_genre}
                </span>
              </div>
              <span className={`font-bold shrink-0 ${ratingColor(title.average_rating!)}`}>
                {title.average_rating!.toFixed(1)}
              </span>
            </>
          );
          return (
            <li key={title.id}>
              {linkTo ? (
                <Link to={linkTo(title)} className={itemClass}>
                  {content}
                </Link>
              ) : (
                <button onClick={() => onSelect?.(title)} className={itemClass}>
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
