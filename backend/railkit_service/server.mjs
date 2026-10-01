// RailKit microservice: wraps the official RailKit Node SDK and exposes a
// tiny REST surface on 127.0.0.1 for the FastAPI backend to call.

import express from 'express';
import {
  configure,
  checkPNRStatus,
  getTrainInfo,
  trackTrain,
  getTrainHistory,
  searchTrainBetweenStations,
  getAvailability,
  fareLookup,
  stationsByName,
  stationByCode,
} from 'railkit';

const PORT = parseInt(process.env.PORT || process.env.RAILKIT_PORT || '7001', 10);
const HOST = process.env.RAILKIT_HOST || '0.0.0.0';
const KEY = process.env.RAILKIT_API_KEY || '';

if (!KEY) {
  console.error('[railkit] RAILKIT_API_KEY is not set; service will reject calls.');
}
configure(KEY);

const app = express();

function wrap(fn) {
  return async (req, res) => {
    try {
      const result = await fn(req);
      // RailKit SDK already returns {success, data|error}; forward verbatim.
      if (result && typeof result === 'object' && 'success' in result) {
        return res.status(result.success ? 200 : 400).json(result);
      }
      return res.json({ success: true, data: result });
    } catch (err) {
      console.error('[railkit] handler error:', err?.message || err);
      return res.status(500).json({ success: false, error: String(err?.message || err) });
    }
  };
}

app.get('/health', (_req, res) => res.json({ ok: true, service: 'railkit', hasKey: Boolean(KEY) }));

app.get('/pnr/:pnr', wrap(async (req) => checkPNRStatus(req.params.pnr)));

app.get('/trains/between/:from/:to', wrap(async (req) =>
  searchTrainBetweenStations(req.params.from, req.params.to),
));

app.get('/trains/:number/info', wrap(async (req) => getTrainInfo(req.params.number)));

app.get('/trains/:number/live', wrap(async (req) => {
  let date = (req.query.date || '').toString();
  if (!date || date === 'today') {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    date = `${dd}-${mm}-${yyyy}`;
  }
  return trackTrain(req.params.number, date);
}));

app.get('/trains/:number/history', wrap(async (req) => {
  const date = (req.query.date || '').toString();
  return getTrainHistory(req.params.number, date);
}));

app.get('/seats/:trainNo/:from/:to/:date/:coach/:quota', wrap(async (req) => {
  const { trainNo, from, to, date, coach, quota } = req.params;
  return getAvailability(trainNo, from, to, date, coach, quota);
}));

app.get('/fare/:trainNo/:from/:to/:date/:coach/:quota', wrap(async (req) => {
  const { trainNo, from, to, date, coach, quota } = req.params;
  return fareLookup(trainNo, from, to, date, coach, quota);
}));

app.get('/stations/search', wrap(async (req) => {
  const name = (req.query.name || '').toString().trim();
  if (!name) return { success: false, error: 'name query is required' };
  return stationsByName(name);
}));

app.get('/stations/:code', wrap(async (req) => stationByCode(req.params.code)));

app.listen(PORT, HOST, () => {
  console.log(`[railkit] listening on ${HOST}:${PORT}`);
});
