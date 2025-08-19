const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

const clients = new Set();

const defaultState = {
  theme: 'dark',
  title: 'Match',
  teams: [
    { name: 'Team A', score: 0, color: '#1f8ef1', logo: '' },
    { name: 'Team B', score: 0, color: '#f5365c', logo: '' }
  ],
  series: { enabled: true, bestOf: 5, wins: [0, 0] },
  timers: { main: { running: false, seconds: 0 } },
  ticker: { text: '', enabled: false },
  lastUpdatedAt: Date.now()
};

let state = { ...defaultState };

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(target, source) {
  if (Array.isArray(target) && Array.isArray(source)) {
    const maxLength = Math.max(target.length, source.length);
    const result = [];
    for (let i = 0; i < maxLength; i++) {
      const t = target[i];
      const s = source[i];
      if (s === undefined) {
        result[i] = t;
      } else if (isObject(t) && isObject(s)) {
        result[i] = deepMerge({ ...t }, s);
      } else if (Array.isArray(t) && Array.isArray(s)) {
        result[i] = deepMerge(t, s);
      } else {
        result[i] = s;
      }
    }
    return result;
  }
  if (isObject(target) && isObject(source)) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      const t = target[key];
      const s = source[key];
      if (isObject(t) && isObject(s)) {
        result[key] = deepMerge(t, s);
      } else if (Array.isArray(t) && Array.isArray(s)) {
        result[key] = deepMerge(t, s);
      } else {
        result[key] = s;
      }
    }
    return result;
  }
  return source;
}

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/state', (req, res) => {
  res.json(state);
});

app.post('/api/state', (req, res) => {
  state = deepMerge(state, { ...req.body, lastUpdatedAt: Date.now() });
  broadcast({ type: 'state', payload: state });
  res.json({ ok: true });
});

app.post('/api/score', (req, res) => {
  const { teamIndex, delta } = req.body;
  if (typeof teamIndex === 'number' && (delta === 1 || delta === -1)) {
    const teams = state.teams.map((t, i) => i === teamIndex ? { ...t, score: Math.max(0, t.score + delta) } : t);
    state = { ...state, teams, lastUpdatedAt: Date.now() };
    broadcast({ type: 'state', payload: state });
    return res.json({ ok: true });
  }
  res.status(400).json({ ok: false, error: 'Invalid payload' });
});

app.post('/api/series', (req, res) => {
  const { teamIndex, delta } = req.body;
  if (state.series?.enabled && typeof teamIndex === 'number' && (delta === 1 || delta === -1)) {
    const wins = state.series.wins.map((w, i) => i === teamIndex ? Math.max(0, w + delta) : w);
    state = { ...state, series: { ...state.series, wins }, lastUpdatedAt: Date.now() };
    broadcast({ type: 'state', payload: state });
    return res.json({ ok: true });
  }
  res.status(400).json({ ok: false, error: 'Invalid payload' });
});

app.post('/api/reset', (req, res) => {
  state = { ...defaultState, theme: state.theme };
  broadcast({ type: 'state', payload: state });
  res.json({ ok: true });
});

app.post('/api/timer', (req, res) => {
  const { action } = req.body || {};
  const timers = { ...state.timers };
  const main = timers.main || { running: false, seconds: 0 };
  if (action === 'start') main.running = true;
  else if (action === 'stop') main.running = false;
  else if (action === 'zero') { main.running = false; main.seconds = 0; }
  timers.main = main;
  state = { ...state, timers, lastUpdatedAt: Date.now() };
  broadcast({ type: 'state', payload: state });
  res.json({ ok: true });
});

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.send(JSON.stringify({ type: 'state', payload: state }));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'set') {
        state = deepMerge(state, { ...msg.payload, lastUpdatedAt: Date.now() });
        broadcast({ type: 'state', payload: state });
      }
    } catch (_) {
      // ignore
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

function broadcast(message) {
  const data = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

// Tick timer in backend when running
setInterval(() => {
  try {
    const timers = state.timers || {};
    const main = timers.main || { running: false, seconds: 0 };
    if (main.running) {
      main.seconds = (main.seconds || 0) + 1;
      timers.main = main;
      state = { ...state, timers, lastUpdatedAt: Date.now() };
      broadcast({ type: 'state', payload: state });
    }
  } catch {}
}, 1000);

server.listen(PORT, () => {
  console.log(`Scoreboard Overlay running on http://localhost:${PORT}`);
});

