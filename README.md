# 🎬 Movie Tracker

Eine Web-App zum Verwalten von Filmen und Serien: was du noch schauen willst, was du
bereits geschaut und bewertet hast – inklusive einer Freundesliste, mit der du die
Listen und Bewertungen anderer einsehen kannst.

## Funktionen

- **Task-Leiste (Navigation)** mit den Bereichen *Watchlist*, *Geschaut* und *Freunde*.
- **Watchlist**: Filme/Serien nach Name, Typ (Film/Serie) und Genre hinzufügen; per Klick
  als "geschaut" markieren.
- **Geschaut**: Titel nach Genre gruppiert, innerhalb jeder Gruppe von der besten zur
  schlechtesten Bewertung sortiert.
- **Bewertung**: Auf der Detailseite eines Titels lässt sich jede Kategorie
  (Schauspielleistung, Story, Spannung/Interesse, Länge/Pacing, Bildgestaltung) von
  1–10 bewerten. Der Durchschnitt wird automatisch berechnet und in der Liste angezeigt.
- **Kurzbeschreibung**: Auf der Detailseite wird automatisch eine kurze
  Wikipedia-Zusammenfassung zum Titel geladen (ähnlich der Infobox einer Google-Suche).
- **Freunde**: Freunde per Benutzername hinzufügen und deren Watchlist, geschaute Titel
  und Bewertungen einsehen.

## Projektstruktur

```
server/   Express-API + SQLite-Datenbank (Node.js)
client/   React + Vite + TypeScript + Tailwind CSS
```

## Voraussetzungen

- Node.js 18 oder neuer

## Setup & Start

### 1. Backend (API)

```bash
cd server
npm install
cp .env.example .env
npm run dev      # startet auf http://localhost:4000
```

### 2. Frontend

In einem zweiten Terminal:

```bash
cd client
npm install
npm run dev       # startet auf http://localhost:5173
```

Die App im Browser unter `http://localhost:5173` öffnen. Anfragen an `/api/*` werden im
Dev-Modus automatisch an das Backend auf Port 4000 weitergeleitet (siehe
`client/vite.config.ts`).

### Produktion

```bash
cd client && npm run build   # erzeugt client/dist
cd server && npm start       # API-Server
```

Für den produktiven Betrieb `client/dist` z. B. per Nginx/Reverse-Proxy vor die API
schalten oder die API zusätzlich statische Dateien ausliefern lassen.

## Datenspeicherung

Die App nutzt eine lokale SQLite-Datei (`server/data.sqlite`, wird automatisch beim
ersten Start angelegt). Für mehrere Nutzer (z. B. dich und deine Freunde) reicht ein
gemeinsam erreichbarer Server-Prozess – jede Person meldet sich mit ihrem eigenen
Konto an.

## Hinweis zur Kurzbeschreibung

Die automatische Kurzbeschreibung wird live von Wikipedia geladen (deutsch, mit
Rückfalloption auf die englische Wikipedia). Es wird kein API-Key benötigt. Findet sich
kein Artikel, wird ein Platzhaltertext angezeigt.
