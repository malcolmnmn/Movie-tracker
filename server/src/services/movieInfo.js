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
        posterUrl: data.thumbnail?.source || data.originalimage?.source || null,
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
    posterUrl: null,
  };
}

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
// Wikidata-Eigenschaften, die für Filme/Serien ausgewertet werden.
const GENRE_PROPERTY = 'P136';
const DIRECTOR_PROPERTY = 'P57';
const CAST_PROPERTY = 'P161';
const AWARD_PROPERTY = 'P166';
const RELEASE_DATE_PROPERTY = 'P577';
const DURATION_PROPERTY = 'P2047';

async function wikidataRequest(params) {
  const url = `${WIKIDATA_API}?${new URLSearchParams({ format: 'json', ...params })}`;
  return fetchJson(url);
}

// Sucht auf Wikidata nach Kandidaten für einen Titel, probiert dafür Deutsch und
// Englisch durch. Liefert eine Liste von { id, language }-Kandidaten in Suchreihenfolge,
// über die Aufrufer iterieren, bis einer mit den benötigten Angaben gefunden wird.
async function searchWikidataCandidates(name) {
  const candidates = [];
  for (const language of ['de', 'en']) {
    try {
      const search = await wikidataRequest({
        action: 'wbsearchentities',
        search: name.trim(),
        language,
        type: 'item',
        limit: '5',
      });
      for (const c of search.search ?? []) candidates.push(c.id);
    } catch {
      // Suche in dieser Sprache fehlgeschlagen – trotzdem mit der anderen weitermachen.
    }
  }
  return candidates;
}

// Löst eine Liste von Wikidata-Entity-IDs (z. B. Schauspieler, Auszeichnungen) in einem
// einzigen Request zu lesbaren Bezeichnungen auf.
async function resolveLabels(ids) {
  if (ids.length === 0) return new Map();
  const data = await wikidataRequest({
    action: 'wbgetentities',
    ids: ids.join('|'),
    props: 'labels',
    languages: 'de|en',
  });
  const map = new Map();
  for (const id of ids) {
    const labels = data.entities?.[id]?.labels;
    const label = labels?.de?.value || labels?.en?.value;
    if (label) map.set(id, label);
  }
  return map;
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

  return labels.length > 0 ? labels : null;
}

// Schlägt anhand von Wikidata automatisch die (meist mehreren, spezifischen) Genres für
// einen Film-/Serientitel vor (kein API-Key nötig) und gibt sie als Liste zurück – die
// Aufrufer entscheiden, ob sie die volle Liste anzeigen oder daraus eine grobe
// Hauptkategorie ableiten (siehe genreClassifier.js). Probiert dafür mehrere
// Suchtreffer und beide Sprachen durch, bevor aufgegeben wird – ein einzelner
// Fehlschlag (Netzwerk, falscher erster Treffer ohne Genre-Angabe, …) beendet die Suche
// nicht sofort. Gibt null zurück, wenn wirklich nichts gefunden wird.
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

// Sucht den Wikidata-Eintrag, der wirklich zum Film/zur Serie gehört (nicht z. B. eine
// gleichnamige Band, ein Begriffserklärungs-Artikel oder ein anderes Werk mit
// demselben Namen), und liest daraus Regie, Besetzung, Auszeichnungen,
// Erscheinungsjahr, Laufzeit sowie – über die Wikipedia-"Sitelinks" des Eintrags – den
// EXAKTEN Wikipedia-Artikeltitel. Ein Kandidat gilt nur dann als Treffer, wenn er
// Regie/Besetzung hat oder zumindest Genre + Erscheinungsjahr – generische
// Begriffs-Artikel oder thematisch verwandte, aber andere Werke haben das nicht und
// werden so aussortiert. Ohne diesen Schritt bestünde die Gefahr, dass Beschreibung
// und Bild (von Wikipedia) zu einem anderen Eintrag gehören als Regie/Besetzung (von
// Wikidata), weil beide sonst unabhängig voneinander suchen würden.
async function resolveFilmEntity(name) {
  const candidateIds = await searchWikidataCandidates(name);

  for (const entityId of candidateIds) {
    try {
      const data = await wikidataRequest({
        action: 'wbgetentities',
        ids: entityId,
        props: 'claims|sitelinks',
      });
      const entity = data.entities?.[entityId];
      const claims = entity?.claims;
      if (!claims) continue;

      const idsOf = (property, max) =>
        (claims[property] ?? [])
          .map((claim) => claim.mainsnak?.datavalue?.value?.id)
          .filter(Boolean)
          .slice(0, max);

      const directorIds = idsOf(DIRECTOR_PROPERTY, 2);
      const castIds = idsOf(CAST_PROPERTY, 6);
      const awardIds = idsOf(AWARD_PROPERTY, 5);
      const genreIds = idsOf(GENRE_PROPERTY, 3);

      const releaseTime = claims[RELEASE_DATE_PROPERTY]?.[0]?.mainsnak?.datavalue?.value?.time;
      const releaseYear = releaseTime ? releaseTime.slice(1, 5) : null;
      const durationAmount = claims[DURATION_PROPERTY]?.[0]?.mainsnak?.datavalue?.value?.amount;
      const runtimeMinutes = durationAmount ? Math.round(Math.abs(Number(durationAmount))) : null;

      const looksLikeFilmOrSeries =
        directorIds.length > 0 || castIds.length > 0 || (genreIds.length > 0 && releaseYear);
      if (!looksLikeFilmOrSeries) continue;

      const labels = await resolveLabels([...directorIds, ...castIds, ...awardIds]);

      const dewiki = entity.sitelinks?.dewiki?.title;
      const enwiki = entity.sitelinks?.enwiki?.title;

      return {
        director: directorIds.map((id) => labels.get(id)).filter(Boolean)[0] || null,
        cast: castIds.map((id) => labels.get(id)).filter(Boolean),
        awards: awardIds.map((id) => labels.get(id)).filter(Boolean),
        releaseYear,
        runtimeMinutes,
        wikipediaTitle: dewiki || enwiki || null,
        wikipediaLang: dewiki ? 'de' : enwiki ? 'en' : null,
      };
    } catch {
      // Dieser Kandidat hat nicht geklappt – nächsten probieren.
    }
  }
  return null;
}

async function fetchWikipediaSummaryByTitle(title, lang) {
  const baseUrl = lang === 'de' ? WIKIPEDIA_SUMMARY_URL : WIKIPEDIA_SUMMARY_URL_EN;
  const encoded = encodeURIComponent(title.replace(/\s+/g, '_'));
  try {
    const data = await fetchJson(baseUrl + encoded);
    if (!data.extract) return null;
    return {
      description: data.extract,
      sourceUrl: data.content_urls?.desktop?.page || null,
      posterUrl: data.thumbnail?.source || data.originalimage?.source || null,
    };
  } catch {
    return null;
  }
}

// Holt alle Detailinfos zu einem Film/einer Serie in einem Rutsch: Kurzbeschreibung,
// Poster, Regie, Besetzung, Auszeichnungen, Erscheinungsjahr, Laufzeit (Wikipedia +
// Wikidata, kein API-Key nötig). Beschreibung/Poster stammen dabei garantiert vom
// selben, über Regie/Besetzung/Genre verifizierten Eintrag wie die übrigen Angaben –
// nicht von einer unabhängigen, ggf. mehrdeutigen Wikipedia-Suche nach dem Namen.
// Wird kein passender Wikidata-Eintrag gefunden, fällt die Beschreibung auf eine
// direkte (weniger verlässliche) Wikipedia-Suche nach dem Namen zurück.
export async function fetchFilmDetails(name) {
  const entity = await resolveFilmEntity(name);

  let summary = null;
  if (entity?.wikipediaTitle) {
    summary = await fetchWikipediaSummaryByTitle(entity.wikipediaTitle, entity.wikipediaLang);
  }
  if (!summary) {
    summary = await fetchTitleSummary(name);
  }

  return {
    description: summary.description,
    sourceUrl: summary.sourceUrl,
    posterUrl: summary.posterUrl,
    director: entity?.director ?? null,
    cast: entity?.cast ?? [],
    awards: entity?.awards ?? [],
    releaseYear: entity?.releaseYear ?? null,
    runtimeMinutes: entity?.runtimeMinutes ?? null,
  };
}
