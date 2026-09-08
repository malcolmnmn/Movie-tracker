import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/auth.js';
import titlesRoutes from './routes/titles.js';
import friendsRoutes from './routes/friends.js';
import suggestionsRoutes from './routes/suggestions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

// Ohne CORS_ORIGIN (kommagetrennte Liste) sind alle Origins erlaubt – praktisch für
// lokale Entwicklung und eine in eine native App (Capacitor u. Ä.) verpackte Version,
// die von einem eigenen Origin aus auf die API zugreift. Für den Produktivbetrieb kann
// CORS_ORIGIN auf die eigene(n) Domain(s) eingeschränkt werden.
const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim());
app.use(cors(allowedOrigins ? { origin: allowedOrigins } : undefined));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/titles', titlesRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/suggestions', suggestionsRoutes);

// Im Produktivbetrieb liefert derselbe Server auch das gebaute Frontend aus (client/dist),
// damit nur ein einziger Dienst deployt werden muss und keine CORS-Konfiguration nötig ist.
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Interner Serverfehler.' });
});

app.listen(PORT, () => {
  console.log(`Movie-Tracker Server läuft auf http://localhost:${PORT}`);
});
