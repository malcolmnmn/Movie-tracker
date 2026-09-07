// Wikimedia (Wikipedia/Wikidata) verlangt laut eigener API-Etikette einen
// aussagekräftigen User-Agent – ohne ihn werden Anfragen, gerade von Server-/Cloud-IPs
// wie bei den meisten Hostern, oft mit 403 abgelehnt. Node schickt sonst keinen mit.
// https://meta.wikimedia.org/wiki/User-Agent_policy
const USER_AGENT =
  'MovieTrackerApp/1.0 (https://github.com/malcolmnmn/Movie-tracker; kontakt ueber GitHub) node-fetch';

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error(`Anfrage fehlgeschlagen (${response.status})`);
  return response.json();
}

const WIKIPEDIA_SUMMARY_URL = 'https://de.wikipedia.org/api/rest_v1/page/summary/';
const WIKIPEDIA_SUMMARY_URL_EN = 'https://en.wikipedia.org/api/rest_v1/page/summary/';

// Holt eine kurze, wikipedia-basierte "Steckbrief"-Beschreibung zu einem Film/einer Serie,
// vergleichbar mit dem Infokasten einer Google-Suche. Fällt auf die englische Wikipedia
// zurück, falls kein deutscher Artikel existiert, und liefert einen Platzhalter, falls
// gar kein Artikel gefunden wird (kein API-Key erforderlich).
export async function fetchTitleSummary(name) {
  const encoded = encodeURIComponent(name.trim().replace(/\s+/g, '_'));

  for (const baseUrl of [WIKIPEDIA_SUMMARY_URL, WIKIPEDIA_SUMMARY_URL_EN]) {
    try {
      const data = await fetchJson(baseUrl + encoded);
      if (data.type === 'disambiguation' || !data.extract) continue;
      return {
        description: data.extract,
        sourceUrl: data.content_urls?.desktop?.page || null,
      };
    } catch {
      // Diese Quelle hat nicht geklappt – nächste probieren, statt ganz aufzugeben.
    }
  }

  return {
    description:
      'Für diesen Titel konnte keine automatische Beschreibung gefunden werden. ' +
      'Du kannst eigene Notizen im Bewertungsformular ergänzen.',
    sourceUrl: null,
  };
}

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
// Wikidata-Eigenschaft "Genre" (P136) – funktioniert sowohl für Filme als auch Serien.
const GENRE_PROPERTY = 'P136';

async function wikidataRequest(params) {
  const url = `${WIKIDATA_API}?${new URLSearchParams({ format: 'json', ...params })}`;
  return fetchJson(url);
}

// Versucht, für einen einzelnen Wikidata-Kandidaten (z. B. Suchtreffer für einen Filmtitel)
// dessen Genre-Angabe(n) (P136) als lesbaren Text aufzulösen. Gibt null zurück, wenn der
// Kandidat keine Genre-Angabe hat (z. B. weil es gar kein Film/Serien-Eintrag ist).
async function resolveGenreForCandidate(entityId) {
  const claimsData = await wikidataRequest({
    action: 'wbgetentities',
    ids: entityId,
    props: 'claims',
  });
  const genreClaims = claimsData.entities?.[entityId]?.claims?.[GENRE_PROPERTY];
  if (!genreClaims?.length) return null;

  const genreIds = genreClaims
    .map((claim) => claim.mainsnak?.datavalue?.value?.id)
    .filter(Boolean)
    .slice(0, 3);
  if (genreIds.length === 0) return null;

  const labelsData = await wikidataRequest({
    action: 'wbgetentities',
    ids: genreIds.join('|'),
    props: 'labels',
    languages: 'de|en',
  });
  const labels = genreIds
    .map((id) => {
      const entityLabels = labelsData.entities?.[id]?.labels;
      return entityLabels?.de?.value || entityLabels?.en?.value;
    })
    .filter(Boolean);

  return labels.length > 0 ? labels.join(', ') : null;
}

// Schlägt anhand von Wikidata automatisch ein Genre für einen Film-/Serientitel vor
// (kein API-Key nötig). Probiert dafür mehrere Suchtreffer und beide Sprachen durch,
// bevor aufgegeben wird – ein einzelner Fehlschlag (Netzwerk, falscher erster Treffer
// ohne Genre-Angabe, …) beendet die Suche nicht sofort. Gibt null zurück, wenn wirklich
// nichts gefunden wird – dann greift im Frontend/Backend ein Sammel-Genre als Fallback.
export async function fetchGenreSuggestion(name) {
  for (const language of ['de', 'en']) {
    let candidates;
    try {
      const search = await wikidataRequest({
        action: 'wbsearchentities',
        search: name.trim(),
        language,
        type: 'item',
        limit: '5',
      });
      candidates = search.search ?? [];
    } catch {
      continue; // Suche in dieser Sprache fehlgeschlagen – nächste Sprache probieren.
    }

    for (const candidate of candidates) {
      try {
        const genre = await resolveGenreForCandidate(candidate.id);
        if (genre) return genre;
      } catch {
        // Dieser Kandidat hat nicht geklappt – nächsten Kandidaten probieren.
      }
    }
  }
  return null;
}
