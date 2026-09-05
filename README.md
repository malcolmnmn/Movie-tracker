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

### Variante A: Render.com (empfohlen, per Blueprint) – aktuell auf den kostenlosen Plan eingestellt

1. Bei [render.com](https://render.com) registrieren und das GitHub-Repo verbinden.
2. „New +“ → „Blueprint“ → dieses Repo auswählen. Render liest automatisch die Datei
   `render.yaml` im Root und richtet den Dienst ein (aktuell: kostenloser Plan, kein
   persistenter Speicher).
3. Deploy bestätigen. `JWT_SECRET` wird automatisch generiert.
4. Nach ein paar Minuten ist die Website unter der von Render vergebenen `*.onrender.com`-
   Adresse erreichbar.

**Zwei Dinge zum kostenlosen Plan, die für ein erstes Testen okay sind, aber gut zu
wissen:**
- **Keine dauerhafte Datenspeicherung:** Ohne bezahlten persistenten Speicher können
  deine Einträge verloren gehen, wenn der Server neu startet (z. B. nach einem neuen
  Deploy). Für's Ausprobieren durch dich allein unproblematisch – sobald auch Freunde
  mitmachen sollen und die Daten bleiben sollen, auf Renders „Starter“-Plan (~7 $/Monat)
  wechseln und in `render.yaml` den Block `disk:` wieder ergänzen sowie
  `DATABASE_PATH=/data/data.sqlite` setzen (war vorher schon einmal so konfiguriert).
- **„Einschlafen“ nach Inaktivität:** Kostenlose Render-Dienste pausieren nach ca. 15
  Minuten ohne Zugriff. Der nächste Aufruf dauert dann ca. 30–60 Sekunden (Server startet
  neu), danach läuft alles normal.

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

## Später: iOS-App

Sobald die Website läuft, lässt sie sich mit [Capacitor](https://capacitorjs.com/) fast
unverändert in eine native iOS-App verpacken (App-Store-fähig) – der bestehende
React-Code wird dabei größtenteils wiederverwendet. Alternativ funktioniert die Website
schon jetzt als installierbare PWA auf dem iPhone-Homescreen, ganz ohne App-Store-Review.
