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
      const response = await fetch(baseUrl + encoded, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) continue;
      const data = await response.json();
      if (data.type === 'disambiguation' || !data.extract) continue;
      return {
        description: data.extract,
        sourceUrl: data.content_urls?.desktop?.page || null,
      };
    } catch {
      // Netzwerkfehler ignorieren und nächste Quelle versuchen
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
  const url = `${WIKIDATA_API}?${new URLSearchParams({ format: 'json', origin: '*', ...params })}`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Wikidata-Anfrage fehlgeschlagen (${response.status})`);
  return response.json();
}

// Schlägt anhand von Wikidata automatisch ein Genre für einen Film-/Serientitel vor
// (kein API-Key nötig). Gibt null zurück, wenn nichts Passendes gefunden wird – dann
// bleibt das Genre-Feld im Frontend einfach leer und der Nutzer trägt es manuell ein.
export async function fetchGenreSuggestion(name) {
  try {
    for (const language of ['de', 'en']) {
      const search = await wikidataRequest({
        action: 'wbsearchentities',
        search: name.trim(),
        language,
        type: 'item',
        limit: '3',
      });
      const candidate = search.search?.[0];
      if (!candidate) continue;

      const claimsData = await wikidataRequest({
        action: 'wbgetentities',
        ids: candidate.id,
        props: 'claims',
      });
      const genreClaims = claimsData.entities?.[candidate.id]?.claims?.[GENRE_PROPERTY];
      if (!genreClaims?.length) continue;

      const genreIds = genreClaims
        .map((claim) => claim.mainsnak?.datavalue?.value?.id)
        .filter(Boolean)
        .slice(0, 3);
      if (genreIds.length === 0) continue;

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

      if (labels.length > 0) return labels.join(', ');
    }
  } catch {
    // Netzwerk-/API-Fehler: einfach kein Vorschlag, Nutzer trägt Genre manuell ein.
  }
  return null;
}
