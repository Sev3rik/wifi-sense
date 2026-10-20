const $ = (id) => document.getElementById(id);
const WINDOW = 10;          // muestras para medir variación (~5 s)
const HISTORY = 240;        // ~2 minutos en el gráfico
const data = [];
let threshold = Number(localStorage.th || 2);
let calibrating = null;
let soundOn = localStorage.sound !== 'off', wasMoving = false, lastBeep = 0, actx;
const paintSound = () => ($('sound').textContent = soundOn ? '🔔 Sonido: activado' : '🔕 Sonido: apagado');
paintSound();
$('sound').onclick = () => { soundOn = !soundOn; localStorage.sound = soundOn ? 'on' : 'off'; paintSound(); actx ??= new AudioContext(); };
function beep() {
  if (!soundOn || Date.now() - lastBeep < 3000) return;
  lastBeep = Date.now(); actx ??= new AudioContext();
  [0, 0.18].forEach((d, i) => {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = 'sine'; o.frequency.value = i ? 1320 : 880;
    g.gain.setValueAtTime(0.25, actx.currentTime + d); g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + d + 0.15);
    o.connect(g).connect(actx.destination); o.start(actx.currentTime + d); o.stop(actx.currentTime + d + 0.16);
  });
}

$('th').value = threshold; $('thVal').textContent = threshold.toFixed(1);
$('th').oninput = (e) => { threshold = Number(e.target.value); localStorage.th = threshold; $('thVal').textContent = threshold.toFixed(1); };

const std = (a) => { const m = a.reduce((s, x) => s + x, 0) / a.length; return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length); };
const distance = (rssi) => rssi > -50 ? 'Muy cerca del router' : rssi > -62 ? 'Cerca' : rssi > -72 ? 'Media distancia' : 'Lejos';

$('calib').onclick = () => {
  calibrating = []; $('calib').disabled = true; $('calib').textContent = 'Calibrando… no te muevas';
  setTimeout(() => {
    const base = std(calibrating); threshold = Math.max(0.5, +(base * 2.5 + 0.5).toFixed(1));
    $('th').value = threshold; $('th').oninput({ target: $('th') });
    calibrating = null; $('calib').disabled = false; $('calib').textContent = 'Calibrar (habitación vacía, 10 s)';
  }, 10000);
};

function draw(moving) {
  const c = $('chart'), ctx = c.getContext('2d');
  c.width = c.clientWidth * devicePixelRatio; c.height = 260 * devicePixelRatio; ctx.scale(devicePixelRatio, devicePixelRatio);
  const w = c.clientWidth, h = 260, vals = data.map((d) => d.rssi);
  if (vals.length < 2) return;
  const min = Math.min(...vals) - 3, max = Math.max(...vals) + 3;
  ctx.strokeStyle = '#232c4d'; ctx.fillStyle = '#8a94b8'; ctx.font = '11px system-ui';
  for (let i = 0; i <= 4; i++) { const y = (h / 4) * i; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); ctx.fillText((max - ((max - min) / 4) * i).toFixed(0) + ' dBm', 6, y + 12); }
  const g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#7c5cff'); g.addColorStop(1, moving ? '#f59e0b' : '#22d3ee');
  ctx.strokeStyle = g; ctx.lineWidth = 2.5; ctx.beginPath();
  vals.forEach((v, i) => { const x = (i / (HISTORY - 1)) * w, y = h - ((v - min) / (max - min)) * h; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  ctx.stroke();
}

function connect() {
  const ws = new WebSocket('ws://localhost:8787');
  ws.onmessage = (e) => {
    const s = JSON.parse(e.data);
    if (!s.ok) { $('net').textContent = '⚠️ ' + s.error; return; }
    $('net').textContent = `${s.ssid} · canal ${s.channel ?? '?'} · ${s.band ?? ''} · señal ${s.signal}%`;
    data.push(s); if (data.length > HISTORY) data.shift();
    if (calibrating) calibrating.push(s.rssi);
    const v = std(data.slice(-WINDOW).map((d) => d.rssi));
    const moving = data.length >= WINDOW && v > threshold;
    $('rssi').textContent = s.rssi; $('std').textContent = v.toFixed(2);
    $('state').textContent = moving ? '🚶 Movimiento' : '🧘 Quieto';
    $('dist').textContent = distance(s.rssi);
    $('stateCard').className = 'card ' + (moving ? 'moving' : 'still');
    if (moving && !wasMoving) beep();
    wasMoving = moving;
    draw(moving);
  };
  ws.onclose = () => { $('net').textContent = 'Reconectando con el servidor…'; setTimeout(connect, 1500); };
}
connect();
