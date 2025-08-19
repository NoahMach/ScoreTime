const els = {
  title: document.getElementById('title'),
  timer: document.getElementById('timer'),
  score0: document.getElementById('score0'),
  score1: document.getElementById('score1'),
  name0: document.getElementById('name0'),
  name1: document.getElementById('name1'),
  logo0: document.getElementById('logo0'),
  logo1: document.getElementById('logo1'),
  series0: document.getElementById('series0'),
  series1: document.getElementById('series1'),
  ticker: document.getElementById('ticker')
};

let state = null;

function connect() {
  const url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
  const ws = new WebSocket(url);
  ws.addEventListener('message', (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'state') {
        state = msg.payload;
        render(state);
      }
    } catch {}
  });
  ws.addEventListener('close', () => setTimeout(connect, 1000));
}

async function init() {
  try {
    const res = await fetch('/api/state');
    state = await res.json();
    render(state);
  } catch {}
  connect();
}

function render(s) {
  document.body.classList.toggle('light', s.theme === 'light');
  els.title.textContent = s.title || '';
  els.score0.textContent = String(s.teams?.[0]?.score ?? 0);
  els.score1.textContent = String(s.teams?.[1]?.score ?? 0);
  els.name0.textContent = s.teams?.[0]?.name ?? 'Team A';
  els.name1.textContent = s.teams?.[1]?.name ?? 'Team B';
  els.logo0.src = s.teams?.[0]?.logo || '';
  els.logo0.hidden = !s.teams?.[0]?.logo;
  els.logo1.src = s.teams?.[1]?.logo || '';
  els.logo1.hidden = !s.teams?.[1]?.logo;

  // apply team accent colors
  const color0 = s.teams?.[0]?.color || '#1f8ef1';
  const color1 = s.teams?.[1]?.color || '#f5365c';
  document.documentElement.style.setProperty('--accent-a', color0);
  document.documentElement.style.setProperty('--accent-b', color1);

  const series = s.series?.enabled ? `Series: ${s.series.wins?.[0] ?? 0} - ${s.series.wins?.[1] ?? 0} (BO${s.series.bestOf ?? 1})` : '';
  els.series0.textContent = series;
  els.series1.textContent = series;

  const t = s.timers?.main?.seconds ?? 0;
  const mm = Math.floor(t / 60).toString().padStart(2, '0');
  const ss = Math.floor(t % 60).toString().padStart(2, '0');
  els.timer.textContent = `${mm}:${ss}`;

  if (s.ticker?.enabled && s.ticker.text) {
    els.ticker.textContent = s.ticker.text;
    els.ticker.hidden = false;
  } else {
    els.ticker.hidden = true;
  }
}

init();

