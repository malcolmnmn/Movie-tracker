# 🎬 Movie Tracker

Eine Web-App zum Verwalten von Filmen und Serien: was du noch schauen willst, was du
bereits geschaut und bewertet hast – inklusive einer Freundesliste, mit der du die
Listen und Bewertungen anderer einsehen kannst.

## Funktionen

- **Task-Leiste (Navigation)** mit den Bereichen *Film-Vorschlag*, *Watchlist*,
  *Geschaut* und *Freunde* (in dieser Reihenfolge, *Film-Vorschlag* ganz links).
- **Watchlist**: Nur Name und Typ (Film/Serie) eintragen; per Klick als "geschaut"
  markieren. Das Genre wird komplett automatisch ermittelt (Wikidata) – kein manuelles
  Eintippen nötig. Liegt die Erkennung mal daneben, lässt sich das Genre auf der
  Detailseite eines Titels per Klick korrigieren.
- **Genre-Gruppierung**: Für die Listen wird aus den oft sehr spezifischen,
  automatisch erkannten Genres (z. B. "Heist-Movie, Science-Fiction-Film, Thriller")
  eine grobe Hauptkategorie abgeleitet (z. B. "Sci-Fi"), damit ähnliche Filme
  zusammenlanden statt in vielen einzigartigen Mini-Gruppen. Die volle, spezifische
  Genre-Liste bleibt auf der Detailseite eines Titels sichtbar.
- **Geschaut**: Titel nach Hauptkategorie gruppiert, innerhalb jeder Gruppe von der
  besten zur schlechtesten Bewertung sortiert.
- **Bewertung**: Erst möglich, nachdem ein Titel als "gesehen" markiert wurde – in der
  Watchlist lässt sich noch nicht bewerten. Auf der Detailseite eines gesehenen Titels
  lassen sich dann 10 feste Kategorien (Schauspielleistung, Story, Spannung/Interesse,
  Länge/Pacing, Bildgestaltung, Sound/Musik, Regie, Charakterentwicklung, Originalität,
  Emotionale Wirkung) von 1–10 bewerten – plus beliebig viele **eigene Kategorien**
  (Button "+ Eigene Kategorie hinzufügen"), die violett hervorgehoben werden, damit auch
  Freunde erkennen, welche Kategorien selbst hinzugefügt wurden. Der Durchschnitt über
  alle ausgefüllten Kategorien wird automatisch berechnet und in der Liste angezeigt.
- **Filminfos auf der Detailseite** (bereits in der Watchlist sichtbar, nicht erst nach
  dem Ansehen): Cover-Bild, kurze Wikipedia-Zusammenfassung, Regie, Besetzung,
  Erscheinungsjahr, Laufzeit, Auszeichnungen sowie ein Link zur Trailer-Suche auf
  YouTube – automatisch über Wikipedia/Wikidata geladen, kein API-Key nötig.
- **Freunde**: Freunde per Benutzername hinzufügen und deren Watchlist, geschaute Titel
  und Bewertungen (inkl. deren eigener Kategorien) einsehen. Ganz oben auf dem Profil
  eines Freundes stehen direkt dessen **Top 10 Filme** und **Top 10 Serien** (siehe
  unten).
- **Film-Vorschlag**: Eine handverlesene Liste aus Klassikern, besonders gefeierten
  Werken und neueren Titeln (Kategorien "Klassiker", "Meistgefeiert", "Neu"), pro
  Kategorie unterteilt in **Filme** und **Serien** (dezente graue Unterüberschrift) für
  bessere Übersicht. Titel, die bereits in der eigenen Watchlist oder bei "Geschaut"
  stehen, werden automatisch herausgefiltert, sodass die Liste sich beim Hinzufügen
  laufend aktualisiert. Ein Klick auf einen Titel öffnet eine schlanke Detailseite mit
  nur einer kurzen Beschreibung und einem Trailer-Link (bewusst ohne Poster, Cast oder
  Bewertung – das bleibt der Detailseite bereits hinzugefügter Titel vorbehalten); von
  dort oder direkt aus der Liste heraus lässt sich der Titel per Klick auf "Geschaut"
  oder "+ Watchlist" übernehmen. Die Liste stammt aus einer kuratierten, leicht
  erweiterbaren Datenquelle (`server/src/data/suggestedTitles.js`) – es gibt keine
  Anbindung an Social Media oder einen Live-Trend-Feed, die Liste kann aber jederzeit
  von Hand um neue Titel ergänzt werden.
- **Top 10**: Zwei getrennte Ranglisten – **Top 10 Filme** und **Top 10 Serien** –,
  jeweils automatisch berechnet aus den eigenen bewerteten, bereits geschauten Titeln
  des jeweiligen Typs (nach Durchschnittsbewertung sortiert). Aktualisiert sich von
  selbst, sobald sich Bewertungen ändern. Stehen am Ende der eigenen "Geschaut"-Seite
  (nach den Genre-Gruppen) und ganz oben auf dem Profil eines Freundes.
- **Installierbar** als App auf dem Homescreen (iOS/Android) – kein App-Store nötig.

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

### Produktion (lokal testen)

Im Produktivmodus liefert der Server API **und** das gebaute Frontend über einen
einzigen Prozess aus (kein separater Webserver nötig):

```bash
npm run build   # baut das Frontend und installiert die Server-Abhängigkeiten
npm start        # startet auf http://localhost:4000 (API + Website)
```

## Datenspeicherung

Die App nutzt eine lokale SQLite-Datei (`server/data.sqlite`, wird automatisch beim
ersten Start angelegt). Für mehrere Nutzer (z. B. dich und deine Freunde) reicht ein
gemeinsam erreichbarer Server-Prozess – jede Person meldet sich mit ihrem eigenen
Konto an.

## Hinweis zur Kurzbeschreibung

Die automatische Kurzbeschreibung wird live von Wikipedia geladen (deutsch, mit
Rückfalloption auf die englische Wikipedia). Es wird kein API-Key benötigt. Findet sich
kein Artikel, wird ein Platzhaltertext angezeigt.

## Als Website live schalten (Deployment)

Die App ist so gebaut, dass **ein einziger Dienst** (Node-Server) sowohl die API als
auch die Website ausliefert – kein separates Hosting für Frontend/Backend, keine
CORS-Konfiguration nötig.

### Variante A: Render.com (empfohlen, per Blueprint) – mit dauerhaftem Speicher

1. Bei [render.com](https://render.com) registrieren und das GitHub-Repo verbinden.
2. „New +“ → „Blueprint“ → dieses Repo auswählen. Render liest automatisch die Datei
   `render.yaml` im Root und richtet den Dienst inkl. persistentem Speicher (1 GB Disk)
   für die SQLite-Datenbank ein, damit deine Einträge dauerhaft erhalten bleiben.
3. Deploy bestätigen. `JWT_SECRET` wird automatisch generiert.
4. Nach ein paar Minuten ist die Website unter der von Render vergebenen `*.onrender.com`-
   Adresse erreichbar.

**Kostenhinweis:** Der persistente Speicher erfordert Renders „Starter“-Plan (aktuell ca.
7 $/Monat) statt der kostenlosen Stufe.

### Variante B: Fly.io, Railway, eigener Server – per Docker

Das mitgelieferte `Dockerfile` im Root baut Frontend und Backend in einem Image und
funktioniert auf jedem Docker-fähigen Hoster:

```bash
docker build -t movie-tracker .
docker run -p 4000:4000 \
  -e JWT_SECRET=ein-langes-zufaelliges-geheimnis \
  -e DATABASE_PATH=/data/data.sqlite \
  -v movie-tracker-data:/data \
  movie-tracker
```

Bei Fly.io/Railway das Repo verbinden (beide erkennen das `Dockerfile` automatisch),
ein persistentes Volume auf `/data` mounten und `DATABASE_PATH=/data/data.sqlite` sowie
ein eigenes `JWT_SECRET` als Umgebungsvariable setzen.

### Wichtige Umgebungsvariablen

| Variable        | Bedeutung                                                        | Pflicht |
|-----------------|-------------------------------------------------------------------|---------|
| `JWT_SECRET`    | Geheimschlüssel zum Signieren der Login-Sitzungen                  | ja      |
| `PORT`          | Port, auf dem der Server lauscht (viele Hoster setzen ihn selbst)  | nein    |
| `DATABASE_PATH` | Pfad zur SQLite-Datei (auf persistentem Speicher ablegen!)         | nein    |
| `CORS_ORIGIN`   | Kommagetrennte Liste erlaubter Origins (nur bei getrenntem Hosting)| nein    |

## Zum Home-Bildschirm hinzufügen (schon jetzt möglich)

Die Website ist als installierbare PWA eingerichtet (eigenes Icon, eigener Name, läuft
im Vollbild ohne Browser-Leiste):

- **iPhone/iPad (Safari):** Website öffnen → Teilen-Symbol (Quadrat mit Pfeil nach oben)
  → „Zum Home-Bildschirm" → Hinzufügen.
- **Android (Chrome):** Website öffnen → Menü (⋮) → „App installieren" bzw. „Zum
  Startbildschirm hinzufügen".

## Später: iOS-App im App Store

Sobald du magst, lässt sich die Website mit [Capacitor](https://capacitorjs.com/) fast
unverändert in eine native, App-Store-fähige iOS-App verpacken – der bestehende
React-Code wird dabei größtenteils wiederverwendet.
