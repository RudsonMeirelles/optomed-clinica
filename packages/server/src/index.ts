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

function sendNoCacheHtml(res: express.Response, filePath: string) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(filePath);
}

// Roteamento inteligente baseado no Hostname ou rota:
// Se o acesso for feito por app.optomed.app.br ou clinica.optomed.app.br, entrega o app clínico direto na raiz!
app.use((req, res, next) => {
  const host = req.headers.host || '';
  if (host.startsWith('app.') || host.startsWith('clinica.')) {
    // Se for rota de API ou WebSocket ou tv, segue normal
    if (req.path.startsWith('/api') || req.path.startsWith('/health') || req.path.startsWith('/tv') || req.path.startsWith('/apk')) {
      return next();
    }
    // Tenta servir arquivos estáticos do clinical
    const staticFile = path.join(clinicalDistPath, req.path);
    if (req.path !== '/' && fs.existsSync(staticFile) && fs.statSync(staticFile).isFile()) {
      if (req.path.endsWith('.html')) {
        return sendNoCacheHtml(res, staticFile);
      }
      return res.sendFile(staticFile);
    }
    // Caso contrário (SPA router), entrega index.html do clinical sem cache
    const idx = path.join(clinicalDistPath, 'index.html');
    if (fs.existsSync(idx)) {
      return sendNoCacheHtml(res, idx);
    }
  }
  next();
});

app.get(['/clinical', '/clinical/*'], (req, res) => {
  const idx = path.join(clinicalDistPath, 'index.html');
  fs.existsSync(idx) ? sendNoCacheHtml(res, idx) : res.redirect('/');
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

const PORTAL_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OPTOMED Clinica — Portal</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f1f5f9}
    .card{background:#1e293b;border:1px solid #334155;border-radius:24px;padding:48px 40px;text-align:center;max-width:480px;width:90%}
    h1{font-size:28px;font-weight:900;letter-spacing:-0.5px;color:#fff;margin-bottom:4px}
    .sub{color:#64748b;font-size:13px;margin-bottom:32px}
    .badge{display:inline-block;background:#10b981;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;letter-spacing:1px;margin-bottom:24px}
    .links{display:flex;flex-direction:column;gap:12px}
    a{display:flex;align-items:center;justify-content:space-between;background:#0f172a;border:1px solid #334155;border-radius:14px;padding:16px 20px;color:#f1f5f9;text-decoration:none;font-weight:600;font-size:15px;transition:border-color 0.2s,background 0.2s}
    a:hover{background:#1e3a5f;border-color:#3b82f6}
    .arrow{color:#3b82f6;font-size:18px}
    .info{margin-top:24px;color:#475569;font-size:12px;border-top:1px solid #1e293b;padding-top:20px}
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">ONLINE</span>
    <h1>OPTOMED Clinica</h1>
    <p class="sub">Plataforma Oftalmologica • Instituto da Visao e Saude</p>
    <div class="links">
      <a href="/clinical/"><span>Recepcao & Consultorio</span><span class="arrow">&#8594;</span></a>
      <a href="/tv/"><span>TV Optotipo</span><span class="arrow">&#8594;</span></a>
    </div>
    <div class="info">
      Servidor v2.1 • API /api/data • WebSocket ativo
    </div>
  </div>
</body>
</html>`;
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