// Kuratierte Ausgangsliste für die "Film-Vorschlag"-Kategorie: eine Mischung aus
// zeitlosen Klassikern, besonders gefeierten Werken und neueren, viel diskutierten
// Titeln – pro Kategorie 7 Filme und 3 Serien, damit die Ansicht übersichtlich bleibt.
// Da es keine Anbindung an Social Media oder einen Live-Trend-Feed gibt, ist das eine
// von Hand gepflegte Liste (kein API-Key nötig) – sie lässt sich hier jederzeit um neue
// Titel ergänzen, wenn sich der Hype verschiebt oder neue Filme/Serien erscheinen (der
// Abgleich mit der Datenbank beim Serverstart übernimmt sowohl das Hinzufügen neuer als
// auch das Entfernen gestrichener Einträge automatisch, siehe db.js). Bereits von einem
// Nutzer hinzugefügte Titel werden beim Anzeigen automatisch herausgefiltert (siehe
// routes/suggestions.js).
export const SUGGESTED_TITLES = [
  // Klassiker – Filme
  { name: 'The Shawshank Redemption', type: 'movie', category: 'Klassiker' },
  { name: 'The Godfather', type: 'movie', category: 'Klassiker' },
  { name: 'Pulp Fiction', type: 'movie', category: 'Klassiker' },
  { name: 'Forrest Gump', type: 'movie', category: 'Klassiker' },
  { name: 'The Dark Knight', type: 'movie', category: 'Klassiker' },
  { name: 'Fight Club', type: 'movie', category: 'Klassiker' },
  { name: 'Goodfellas', type: 'movie', category: 'Klassiker' },
  // Klassiker – Serien
  { name: 'Breaking Bad', type: 'series', category: 'Klassiker' },
  { name: 'The Sopranos', type: 'series', category: 'Klassiker' },
  { name: 'The Wire', type: 'series', category: 'Klassiker' },

  // Meistgefeiert – Filme
  { name: 'Parasite', type: 'movie', category: 'Meistgefeiert' },
  { name: 'Everything Everywhere All at Once', type: 'movie', category: 'Meistgefeiert' },
  { name: 'Oppenheimer', type: 'movie', category: 'Meistgefeiert' },
  { name: 'Whiplash', type: 'movie', category: 'Meistgefeiert' },
  { name: 'La La Land', type: 'movie', category: 'Meistgefeiert' },
  { name: 'Spirited Away', type: 'movie', category: 'Meistgefeiert' },
  { name: 'No Country for Old Men', type: 'movie', category: 'Meistgefeiert' },
  // Meistgefeiert – Serien
  { name: 'Chernobyl', type: 'series', category: 'Meistgefeiert' },
  { name: 'Game of Thrones', type: 'series', category: 'Meistgefeiert' },
  { name: 'Succession', type: 'series', category: 'Meistgefeiert' },

  // Neu – Filme
  { name: 'Dune: Part Two', type: 'movie', category: 'Neu' },
  { name: 'Poor Things', type: 'movie', category: 'Neu' },
  { name: 'Anora', type: 'movie', category: 'Neu' },
  { name: 'The Boy and the Heron', type: 'movie', category: 'Neu' },
  { name: 'Conclave', type: 'movie', category: 'Neu' },
  { name: 'Killers of the Flower Moon', type: 'movie', category: 'Neu' },
  { name: 'Past Lives', type: 'movie', category: 'Neu' },
  // Neu – Serien
  { name: 'The Bear', type: 'series', category: 'Neu' },
  { name: 'Shogun', type: 'series', category: 'Neu' },
  { name: 'Fallout', type: 'series', category: 'Neu' },
];
