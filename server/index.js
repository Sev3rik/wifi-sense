// Lee la señal WiFi en Windows con `netsh wlan show interfaces` y la emite por WebSocket.
import { exec } from 'node:child_process';
import { WebSocketServer } from 'ws';

const PORT = 8787;
const INTERVAL_MS = 500;
const DEMO = process.argv.includes('--demo') || process.platform !== 'win32';

const wss = new WebSocketServer({ port: PORT });
console.log(`📡 wifi-sense API en ws://localhost:${PORT} ${DEMO ? '(modo demo: datos simulados)' : ''}`);

function parse(out) {
  const get = (re) => (out.match(re) || [])[1]?.trim();
  // Funciona con Windows en español o inglés
  const signal = Number(get(/(?:Se[ñn]al|Signal)\s*:\s*(\d+)\s*%/i));
  const rssiRaw = get(/Rssi\s*:\s*(-?\d+)/i);
  const ssid = get(/^\s*SSID\s*:\s*(.+)$/im);
  const bssid = get(/BSSID\s*:\s*([0-9a-f:]{17})/i);
  const channel = get(/(?:Canal|Channel)\s*:\s*(\d+)/i);
  const band = get(/(?:Banda|Band)\s*:\s*(.+)/i);
  if (Number.isNaN(signal)) return null;
  // Si Windows no da RSSI en dBm, se estima desde el porcentaje
  const rssi = rssiRaw ? Number(rssiRaw) : Math.round(signal / 2 - 100);
  return { signal, rssi, ssid, bssid, channel, band };
}

let t = 0;
function demoSample() {
  t += INTERVAL_MS / 1000;
  const moving = Math.sin(t / 8) > 0.3;
  const noise = (Math.random() - 0.5) * (moving ? 9 : 1.5);
  const rssi = Math.round(-52 + Math.sin(t / 20) * 6 + noise);
  return { signal: Math.min(100, (rssi + 100) * 2), rssi, ssid: 'Archer_AX23 (demo)', bssid: '00:00:00:00:00:00', channel: '36', band: '5 GHz' };
}

function sample() {
  return new Promise((resolve) => {
    if (DEMO) return resolve(demoSample());
    exec('netsh wlan show interfaces', { windowsHide: true }, (err, stdout) => resolve(err ? null : parse(stdout)));
  });
}

setInterval(async () => {
  const s = await sample();
  const msg = JSON.stringify(s ? { ok: true, ts: Date.now(), ...s } : { ok: false, ts: Date.now(), error: 'No hay conexión WiFi activa' });
  for (const c of wss.clients) if (c.readyState === 1) c.send(msg);
}, INTERVAL_MS);
