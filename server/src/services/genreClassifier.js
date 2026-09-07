// Bildet die oft sehr spezifischen Genre-Bezeichnungen von Wikidata (z. B.
// "Heist-Movie, Science-Fiction-Film, Thriller") auf eine kleine feste Menge grober
// Oberkategorien ab. Diese Oberkategorie wird zum Gruppieren/Sortieren in den Listen
// verwendet, damit ähnliche Filme zusammenlanden, statt dass fast jeder Titel seine
// eigene, einzigartige Genre-Kombination als Gruppe bekommt. Die vollständige,
// spezifische Liste bleibt separat erhalten und wird auf der Detailseite angezeigt.
const MAIN_GENRE_RULES = [
  { name: 'Action', keywords: ['action'] },
  { name: 'Komödie', keywords: ['komö', 'comedy', 'sitcom', 'satire'] },
  { name: 'Horror', keywords: ['horror', 'grusel', 'zombie', 'slasher'] },
  { name: 'Thriller', keywords: ['thriller', 'suspense', 'heist', 'noir'] },
  { name: 'Sci-Fi', keywords: ['science fiction', 'science-fiction', 'sci-fi', 'scifi'] },
  { name: 'Fantasy', keywords: ['fantasy'] },
  { name: 'Animation', keywords: ['animat', 'zeichentrick', 'anime'] },
  { name: 'Dokumentation', keywords: ['dokumentar', 'documentary'] },
  { name: 'Romantik', keywords: ['liebesfilm', 'romant', 'romance'] },
  { name: 'Krimi', keywords: ['krimi', 'kriminal', 'crime', 'detektiv'] },
  { name: 'Abenteuer', keywords: ['abenteuer', 'adventure'] },
  { name: 'Drama', keywords: ['drama'] },
  { name: 'Familie', keywords: ['familien', 'family'] },
  { name: 'Historie', keywords: ['historien', 'historical', 'history', 'biopic', 'biografie'] },
  { name: 'Musik', keywords: ['musical', 'musikfilm', 'music'] },
  { name: 'Krieg', keywords: ['kriegsfilm', 'war film'] },
  { name: 'Western', keywords: ['western'] },
  { name: 'Sport', keywords: ['sportfilm', 'sport'] },
];

export const FALLBACK_MAIN_GENRE = 'Sonstiges';
export const MAIN_GENRES = [...MAIN_GENRE_RULES.map((r) => r.name), FALLBACK_MAIN_GENRE];

// Nimmt eine Liste von (meist mehreren, spezifischen) Genre-Bezeichnungen und gibt die
// erste passende grobe Oberkategorie zurück. Passt keine der Bezeichnungen zu einer
// bekannten Kategorie, wird das Sammel-Genre zurückgegeben.
export function pickMainGenre(labels) {
  for (const label of labels) {
    const lower = String(label).toLowerCase();
    for (const rule of MAIN_GENRE_RULES) {
      if (rule.keywords.some((kw) => lower.includes(kw))) return rule.name;
    }
  }
  return FALLBACK_MAIN_GENRE;
}
