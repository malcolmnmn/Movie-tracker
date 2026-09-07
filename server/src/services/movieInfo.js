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

const TYPE_PROPERTY = 'P31'; // "ist ein(e)" / instance of
const MINUTE_UNIT_ID = 'Q7727';

// Wikidata-"instance of"-Bezeichnungen, an denen ein Film- oder Serien-Eintrag erkannt
// wird. Wichtig: Genre (P136) und Erscheinungsdatum (P577) allein reichen NICHT als
// Nachweis, dass ein Eintrag ein Film/eine Serie ist – auch Alben, Bücher oder
// Videospiele haben ein Genre und ein Erscheinungsdatum. Nur die Prüfung, WAS der
// Eintrag laut Wikidata tatsächlich ist ("instance of"), verhindert zuverlässig
// Verwechslungen mit gleichnamigen Alben, Büchern o. Ä.
const FILM_OR_SERIES_TYPE_KEYWORDS = [
  'film',
  'movie',
  'kurzfilm',
  'fernsehfilm',
  'tv-film',
  'tv movie',
  'fernsehserie',
  'tv series',
  'television series',
  'web series',
  'webserie',
  'miniserie',
  'mini-series',
  'miniseries',
  'anime',
];

function matchesFilmOrSeriesType(labels) {
  return labels.some((label) => {
    const lower = label.toLowerCase();
    return FILM_OR_SERIES_TYPE_KEYWORDS.some((kw) => lower.includes(kw));
  });
}

// Holt Claims + Sitelinks für einen Wikidata-Kandidaten und liefert die daraus
// extrahierten Angaben NUR zurück, wenn "instance of" (P31) den Eintrag eindeutig als
// Film oder Serie ausweist – sonst null (z. B. bei einem gleichnamigen Album, Buch,
// Begriffserklärungs-Artikel o. Ä.). Genre-Liste, Regie, Besetzung, Auszeichnungen,
// Erscheinungsjahr, Laufzeit (nur akzeptiert, wenn die Einheit "Minute" ist – andere
// Einheiten würden sonst als falsche Minutenzahl angezeigt) und der exakte
// Wikipedia-"Sitelink"-Titel werden in einem einzigen Request-Paar aufgelöst.
async function resolveVerifiedEntityDetails(entityId) {
  const data = await wikidataRequest({
    action: 'wbgetentities',
    ids: entityId,
    props: 'claims|sitelinks',
  });
  const entity = data.entities?.[entityId];
  const claims = entity?.claims;
  if (!claims) return null;

  const idsOf = (property, max) =>
    (claims[property] ?? [])
      .map((claim) => claim.mainsnak?.datavalue?.value?.id)
      .filter(Boolean)
      .slice(0, max);

  const typeIds = idsOf(TYPE_PROPERTY, 4);
  const directorIds = idsOf(DIRECTOR_PROPERTY, 2);
  const castIds = idsOf(CAST_PROPERTY, 6);
  const awardIds = idsOf(AWARD_PROPERTY, 5);
  const genreIds = idsOf(GENRE_PROPERTY, 3);

  const labels = await resolveLabels([...typeIds, ...directorIds, ...castIds, ...awardIds, ...genreIds]);

  const typeLabels = typeIds.map((id) => labels.get(id)).filter(Boolean);
  if (!matchesFilmOrSeriesType(typeLabels)) return null;

  const releaseTime = claims[RELEASE_DATE_PROPERTY]?.[0]?.mainsnak?.datavalue?.value?.time;
  const releaseYear = releaseTime ? releaseTime.slice(1, 5) : null;

  const duration = claims[DURATION_PROPERTY]?.[0]?.mainsnak?.datavalue?.value;
  const durationUnitId = duration?.unit?.split('/').pop();
  const runtimeMinutes =
    duration?.amount && durationUnitId === MINUTE_UNIT_ID
      ? Math.round(Math.abs(Number(duration.amount)))
      : null;

  const dewiki = entity.sitelinks?.dewiki?.title;
  const enwiki = entity.sitelinks?.enwiki?.title;

  return {
    genre: genreIds.map((id) => labels.get(id)).filter(Boolean),
    director: directorIds.map((id) => labels.get(id)).filter(Boolean)[0] || null,
    cast: castIds.map((id) => labels.get(id)).filter(Boolean),
    awards: awardIds.map((id) => labels.get(id)).filter(Boolean),
    releaseYear,
    runtimeMinutes,
    wikipediaTitle: dewiki || enwiki || null,
    wikipediaLang: dewiki ? 'de' : enwiki ? 'en' : null,
  };
}

// Sucht den Wikidata-Eintrag, der wirklich zum Film/zur Serie gehört (nicht z. B. ein
// gleichnamiges Album, Buch oder ein Begriffserklärungs-Artikel), und probiert dafür
// mehrere Suchtreffer durch, bis einer die Typprüfung besteht. Wird von der
// Genre-Erkennung UND von fetchFilmDetails verwendet, damit beide zuverlässig densel­
// ben, korrekt identifizierten Eintrag zugrunde legen.
async function resolveVerifiedFilmEntity(name) {
  const candidateIds = await searchWikidataCandidates(name);
  for (const entityId of candidateIds) {
    try {
      const details = await resolveVerifiedEntityDetails(entityId);
      if (details) return details;
    } catch {
      // Dieser Kandidat hat nicht geklappt – nächsten probieren.
    }
  }
  return null;
}

// Schlägt anhand von Wikidata automatisch die (meist mehreren, spezifischen) Genres für
// einen Film-/Serientitel vor (kein API-Key nötig) und gibt sie als Liste zurück – die
// Aufrufer entscheiden, ob sie die volle Liste anzeigen oder daraus eine grobe
// Hauptkategorie ableiten (siehe genreClassifier.js). Gibt null zurück, wenn kein
// verifizierter Film-/Serien-Eintrag mit Genre-Angabe gefunden wird.
export async function fetchGenreSuggestion(name) {
  const entity = await resolveVerifiedFilmEntity(name);
  return entity && entity.genre.length > 0 ? entity.genre : null;
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
// selben, über den Wikidata-Typ ("instance of") als Film/Serie verifizierten Eintrag
// wie die übrigen Angaben – nicht von einer unabhängigen, ggf. mehrdeutigen
// Wikipedia-Suche nach dem Namen. Wird kein passender Wikidata-Eintrag gefunden, fällt
// die Beschreibung auf eine direkte (weniger verlässliche) Wikipedia-Suche zurück.
export async function fetchFilmDetails(name) {
  const entity = await resolveVerifiedFilmEntity(name);

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
