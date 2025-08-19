const $ = (id) => document.getElementById(id);
const stateUrl = '/api/state';

async function loadState() {
  const res = await fetch(stateUrl);
  return res.json();
}

async function save(partial) {
  await fetch(stateUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(partial) });
}

async function post(path, payload) {
  await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
}

function bindScoreButtons() {
  document.querySelectorAll('button[data-score]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const teamIndex = Number(btn.getAttribute('data-score'));
      const delta = Number(btn.getAttribute('data-delta'));
      post('/api/score', { teamIndex, delta });
    });
  });
}

function bindSeriesButtons() {
  document.querySelectorAll('button[data-series]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const teamIndex = Number(btn.getAttribute('data-series'));
      const delta = Number(btn.getAttribute('data-delta'));
      post('/api/series', { teamIndex, delta });
    });
  });
}

function timerControls() {
  const start = () => post('/api/timer', { action: 'start' });
  const stop = () => post('/api/timer', { action: 'stop' });
  const zero = () => post('/api/timer', { action: 'zero' });
  return { start, stop, zero };
}

async function init() {
  bindScoreButtons();
  bindSeriesButtons();

  const timer = timerControls();
  $('start').addEventListener('click', timer.start);
  $('stop').addEventListener('click', timer.stop);
  $('zero').addEventListener('click', timer.zero);

  $('reset').addEventListener('click', () => post('/api/reset', {}));

  const s = await loadState();

  $('theme').checked = s.theme === 'light';
  $('theme').addEventListener('change', (e) => save({ theme: e.target.checked ? 'light' : 'dark' }));

  $('title').value = s.title || '';
  $('title').addEventListener('input', (e) => save({ title: e.target.value }));

  $('tickerText').value = s.ticker?.text || '';
  $('tickerEnabled').checked = !!s.ticker?.enabled;
  $('tickerText').addEventListener('input', (e) => save({ ticker: { ...(s.ticker || {}), text: e.target.value, enabled: $('tickerEnabled').checked } }));
  $('tickerEnabled').addEventListener('change', (e) => save({ ticker: { ...(s.ticker || {}), text: $('tickerText').value, enabled: e.target.checked } }));

  $('name0').value = s.teams?.[0]?.name || '';
  $('name1').value = s.teams?.[1]?.name || '';
  $('color0').value = s.teams?.[0]?.color || '#1f8ef1';
  $('color1').value = s.teams?.[1]?.color || '#f5365c';
  $('logo0').value = s.teams?.[0]?.logo || '';
  $('logo1').value = s.teams?.[1]?.logo || '';

  $('name0').addEventListener('input', (e) => save({ teams: [{ ...s.teams[0], name: e.target.value }, s.teams[1]] }));
  $('name1').addEventListener('input', (e) => save({ teams: [s.teams[0], { ...s.teams[1], name: e.target.value }] }));
  $('color0').addEventListener('input', (e) => save({ teams: [{ ...s.teams[0], color: e.target.value }, s.teams[1]] }));
  $('color1').addEventListener('input', (e) => save({ teams: [s.teams[0], { ...s.teams[1], color: e.target.value }] }));
  $('logo0').addEventListener('input', (e) => save({ teams: [{ ...s.teams[0], logo: e.target.value }, s.teams[1]] }));
  $('logo1').addEventListener('input', (e) => save({ teams: [s.teams[0], { ...s.teams[1], logo: e.target.value }] }));

  $('seriesEnabled').checked = !!s.series?.enabled;
  $('bestOf').value = s.series?.bestOf ?? 5;
  $('seriesEnabled').addEventListener('change', (e) => save({ series: { ...(s.series || {}), enabled: e.target.checked } }));
  $('bestOf').addEventListener('input', (e) => save({ series: { ...(s.series || {}), bestOf: Number(e.target.value) } }));
}

init();

