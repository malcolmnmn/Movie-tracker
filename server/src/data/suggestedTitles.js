// Kuratierte Ausgangsliste für die "Film-Vorschlag"-Kategorie: eine Mischung aus
// zeitlosen Klassikern, besonders gefeierten Werken und neueren, viel diskutierten
// Titeln. Da es keine Anbindung an Social Media oder einen Live-Trend-Feed gibt, ist
// das eine von Hand gepflegte Liste (kein API-Key nötig) – sie lässt sich hier jederzeit
// um neue Titel ergänzen, wenn sich der Hype verschiebt oder neue Filme/Serien
// erscheinen. Bereits von einem Nutzer hinzugefügte Titel werden beim Anzeigen
// automatisch herausgefiltert (siehe routes/suggestions.js).
export const SUGGESTED_TITLES = [
  // Klassiker
  { name: 'The Shawshank Redemption', type: 'movie', category: 'Klassiker' },
  { name: 'The Godfather', type: 'movie', category: 'Klassiker' },
  { name: 'Pulp Fiction', type: 'movie', category: 'Klassiker' },
  { name: 'Forrest Gump', type: 'movie', category: 'Klassiker' },
  { name: 'The Dark Knight', type: 'movie', category: 'Klassiker' },
  { name: 'Fight Club', type: 'movie', category: 'Klassiker' },
  { name: 'Spirited Away', type: 'movie', category: 'Klassiker' },
  { name: 'Goodfellas', type: 'movie', category: 'Klassiker' },
  { name: 'Breaking Bad', type: 'series', category: 'Klassiker' },
  { name: 'The Sopranos', type: 'series', category: 'Klassiker' },

  // Meistgefeiert
  { name: 'Parasite', type: 'movie', category: 'Meistgefeiert' },
  { name: 'Everything Everywhere All at Once', type: 'movie', category: 'Meistgefeiert' },
  { name: 'Oppenheimer', type: 'movie', category: 'Meistgefeiert' },
  { name: 'Whiplash', type: 'movie', category: 'Meistgefeiert' },
  { name: 'La La Land', type: 'movie', category: 'Meistgefeiert' },
  { name: 'Chernobyl', type: 'series', category: 'Meistgefeiert' },
  { name: 'The Wire', type: 'series', category: 'Meistgefeiert' },
  { name: 'Game of Thrones', type: 'series', category: 'Meistgefeiert' },
  { name: 'Succession', type: 'series', category: 'Meistgefeiert' },
  { name: 'Better Call Saul', type: 'series', category: 'Meistgefeiert' },

  // Neu
  { name: 'Dune: Part Two', type: 'movie', category: 'Neu' },
  { name: 'Poor Things', type: 'movie', category: 'Neu' },
  { name: 'The Bear', type: 'series', category: 'Neu' },
  { name: 'Shogun', type: 'series', category: 'Neu' },
  { name: 'Fallout', type: 'series', category: 'Neu' },
  { name: 'Anora', type: 'movie', category: 'Neu' },
  { name: 'The Boy and the Heron', type: 'movie', category: 'Neu' },
  { name: 'Baby Reindeer', type: 'series', category: 'Neu' },
  { name: 'Slow Horses', type: 'series', category: 'Neu' },
  { name: 'Conclave', type: 'movie', category: 'Neu' },
];
