import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PORT_DEFAULT = 8765;
const PORT_HTTP = 80;
const server = createServer(app);

const VALID_ENTITIES = ['patients','encounters','appointments','prescriptions','audit_logs','return_reminders','transactions','work_sessions','pos_items','cash_registers','clinics'];

const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

function getDataPath(clinicId: string, entity: string): string {
  const clinicDir = path.join(dataDir, clinicId);
  if (!fs.existsSync(clinicDir)) fs.mkdirSync(clinicDir, { recursive: true });
  return path.join(clinicDir, entity + '.json');
}

function readData(clinicId: string, entity: string): any[] {
  try {
    const filePath = getDataPath(clinicId, entity);
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch { return []; }
}

function writeData(clinicId: string, entity: string, data: any[]): void {
  fs.writeFileSync(getDataPath(clinicId, entity), JSON.stringify(data, null, 2), 'utf-8');
}

const tvDistPath = path.resolve(__dirname, '../../offline-tv/dist');
const clinicalDistPath = path.resolve(__dirname, '../../clinical/dist');
const apkPath = path.resolve(__dirname, '../../offline-tv/android/app/build/outputs/apk/debug/app-debug.apk');

if (fs.existsSync(tvDistPath)) app.use('/tv', express.static(tvDistPath));
if (fs.existsSync(clinicalDistPath)) {
  app.use('/clinical', express.static(clinicalDistPath));
  app.use('/controle', express.static(clinicalDistPath));
}

app.get(['/clinical', '/clinical/*'], (req, res) => {
  const idx = path.join(clinicalDistPath, 'index.html');
  fs.existsSync(idx) ? res.sendFile(idx) : res.redirect('/');
});
app.get(['/tv', '/tv/*'], (req, res) => {
  const idx = path.join(tvDistPath, 'index.html');
  fs.existsSync(idx) ? res.sendFile(idx) : res.redirect('/');
});
app.get(['/download', '/apk', '/OptotipoMeirelles.apk'], (req, res) => {
  fs.existsSync(apkPath) ? res.download(apkPath, 'OptotipoMeirelles.apk') : res.status(404).send('APK nao compilado.');
});

interface DeviceClient { id: string; type: 'tv' | 'clinical'; ws: WebSocket; ip: string; }
const connectedDevices: Map<string, DeviceClient> = new Map();
const wss = new WebSocketServer({ server });

function broadcastToAll(payload: string, exceptId?: string) {
  for (const [id, target] of connectedDevices.entries()) {
    if (id !== exceptId && target.ws.readyState === WebSocket.OPEN) target.ws.send(payload);
  }
}

wss.on('connection', (ws: WebSocket, req) => {
  const url = req.url || '';
  const isTv = url.includes('/tv');
  const deviceId = 'dev_' + Math.random().toString(36).substring(2, 9);
  const ip = req.socket.remoteAddress || 'unknown';
  connectedDevices.set(deviceId, { id: deviceId, type: isTv ? 'tv' : 'clinical', ws, ip });
  console.log('[LAN] CONECTADO: ' + (isTv ? 'TV' : 'CLINICAL') + ' (' + deviceId + ') Total: ' + connectedDevices.size);
  ws.on('message', (data: Buffer) => {
    try { const raw = data.toString(); JSON.parse(raw); broadcastToAll(raw, deviceId); } catch {}
  });
  ws.on('close', () => { connectedDevices.delete(deviceId); });
  ws.on('error', (err: Error) => { console.error('[LAN] Erro ' + deviceId + ':', err); });
});

app.get('/api/data/:clinicId/:entity', (req, res) => {
  const { clinicId, entity } = req.params;
  if (!VALID_ENTITIES.includes(entity)) return res.status(400).json({ error: 'Entidade invalida' });
  res.json({ clinicId, entity, data: readData(clinicId, entity), updatedAt: new Date().toISOString() });
});

app.post('/api/data/:clinicId/:entity', (req, res) => {
  const { clinicId, entity } = req.params;
  if (!VALID_ENTITIES.includes(entity)) return res.status(400).json({ error: 'Entidade invalida' });
  const incoming = req.body?.data;
  if (!Array.isArray(incoming)) return res.status(400).json({ error: 'Campo data deve ser array' });
  writeData(clinicId, entity, incoming);
  broadcastToAll(JSON.stringify({ type: 'server_data_updated', clinicId, entity, data: incoming, updatedAt: new Date().toISOString() }));
  console.log('[DataAPI] ' + entity + ' (' + clinicId + ') salvo: ' + incoming.length + ' registros');
  res.json({ ok: true, clinicId, entity, count: incoming.length });
});

app.post('/api/data/:clinicId/:entity/upsert', (req, res) => {
  const { clinicId, entity } = req.params;
  if (!VALID_ENTITIES.includes(entity)) return res.status(400).json({ error: 'Entidade invalida' });
  const record = req.body?.record;
  if (!record || typeof record !== 'object') return res.status(400).json({ error: 'Campo record obrigatorio' });
  const list = readData(clinicId, entity);
  const idx = list.findIndex((r: any) => r.id === record.id);
  if (idx >= 0) list[idx] = record; else list.unshift(record);
  writeData(clinicId, entity, list);
  broadcastToAll(JSON.stringify({ type: 'server_data_updated', clinicId, entity, data: list, updatedAt: new Date().toISOString() }));
  res.json({ ok: true, clinicId, entity, record });
});

app.delete('/api/data/:clinicId/:entity/:id', (req, res) => {
  const { clinicId, entity, id } = req.params;
  if (!VALID_ENTITIES.includes(entity)) return res.status(400).json({ error: 'Entidade invalida' });
  const list = readData(clinicId, entity).filter((r: any) => r.id !== id);
  writeData(clinicId, entity, list);
  broadcastToAll(JSON.stringify({ type: 'server_data_updated', clinicId, entity, data: list, updatedAt: new Date().toISOString() }));
  res.json({ ok: true, clinicId, entity, deletedId: id });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '2.1.0', connectedDevicesCount: connectedDevices.size });
});

const PORTAL_HTML = '<h1>OPTOMED CLINICA</h1><p>Plataforma Oftalmologica</p><a href="/clinical">Recepcao</a><a href="/tv">TV</a>';
app.get('/', (req, res) => { res.send(PORTAL_HTML); });

app.get('*', (req, res) => {
  const indexPath = path.join(tvDistPath, 'index.html');
  fs.existsSync(indexPath) ? res.sendFile(indexPath) : res.redirect('/');
});

server.listen(PORT_DEFAULT, () => {
  console.log('OPTOTIPO MEIRELLES v2.1 - SERVIDOR LAN + API DADOS');
  console.log('Portal: http://192.168.1.144:' + PORT_DEFAULT);
  console.log('API: http://192.168.1.144:' + PORT_DEFAULT + '/api/data');
  console.log('Dados: ' + dataDir);
});

try {
  const httpDirectServer = createServer(app);
  httpDirectServer.listen(PORT_HTTP, () => { console.log('Porta 80: http://192.168.1.144/'); });
  httpDirectServer.on('error', () => { console.log('(Porta 80 indisponivel)'); });
} catch {}