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
app.use(express.json());

const PORT_DEFAULT = 8765;
const PORT_HTTP = 80;

const server = createServer(app);

// Caminhos dos arquivos estáticos compilados
const tvDistPath = path.resolve(__dirname, '../../offline-tv/dist');
const clinicalDistPath = path.resolve(__dirname, '../../clinical/dist');
const apkPath = path.resolve(__dirname, '../../offline-tv/android/app/build/outputs/apk/debug/app-debug.apk');

// Servir arquivos estáticos da TV e do Portal Clínico
if (fs.existsSync(tvDistPath)) {
  app.use('/tv', express.static(tvDistPath));
}

if (fs.existsSync(clinicalDistPath)) {
  app.use('/clinical', express.static(clinicalDistPath));
  app.use('/controle', express.static(clinicalDistPath));
}

// Rotas SPA para subcaminhos
app.get(['/clinical', '/clinical/*'], (req, res) => {
  const clinicalIndex = path.join(clinicalDistPath, 'index.html');
  if (fs.existsSync(clinicalIndex)) {
    res.sendFile(clinicalIndex);
  } else {
    res.redirect('/');
  }
});

app.get(['/tv', '/tv/*'], (req, res) => {
  const tvIndex = path.join(tvDistPath, 'index.html');
  if (fs.existsSync(tvIndex)) {
    res.sendFile(tvIndex);
  } else {
    res.redirect('/');
  }
});

// Download direto do APK para quem acessar pelo navegador
app.get(['/download', '/apk', '/OptotipoMeirelles.apk'], (req, res) => {
  if (fs.existsSync(apkPath)) {
    res.download(apkPath, 'OptotipoMeirelles.apk');
  } else {
    res.status(404).send('Arquivo APK ainda não compilado no servidor.');
  }
});

// WebSockets para pareamento e controle LAN em tempo real
const wss = new WebSocketServer({ server });

interface DeviceClient {
  id: string;
  type: 'tv' | 'clinical';
  ws: WebSocket;
  ip: string;
}

const connectedDevices: Map<string, DeviceClient> = new Map();

wss.on('connection', (ws: WebSocket, req) => {
  const url = req.url || '';
  const isTv = url.includes('/tv');
  const deviceId = `dev_${Math.random().toString(36).substring(2, 9)}`;
  const ip = req.socket.remoteAddress || 'unknown';

  const client: DeviceClient = {
    id: deviceId,
    type: isTv ? 'tv' : 'clinical',
    ws,
    ip
  };

  connectedDevices.set(deviceId, client);
  console.log(`[LAN Bridge] Dispositivo CONECTADO: ${client.type.toUpperCase()} (ID: ${deviceId}, IP: ${ip}) - Total: ${connectedDevices.size}`);

  // Notifica novo estado para todos
  ws.on('message', (data: string) => {
    try {
      const raw = data.toString();
      const message = JSON.parse(raw);
      
      // Reencaminha a mensagem para todos os outros dispositivos conectados na rede local
      for (const [id, target] of connectedDevices.entries()) {
        if (id !== deviceId && target.ws.readyState === WebSocket.OPEN) {
          target.ws.send(raw);
        }
      }
    } catch (err) {
      console.error('[LAN Bridge] Erro ao retransmitir mensagem:', err);
    }
  });

  ws.on('close', () => {
    connectedDevices.delete(deviceId);
    console.log(`[LAN Bridge] Dispositivo DESCONECTADO: ${client.type.toUpperCase()} (ID: ${deviceId}) - Total: ${connectedDevices.size}`);
  });

  ws.on('error', (err) => {
    console.error(`[LAN Bridge] Erro no socket ${deviceId}:`, err);
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    platform: 'Optotipo Meirelles LAN Server (Fire TV Stick, Android & PC)',
    connectedDevicesCount: connectedDevices.size,
    devices: Array.from(connectedDevices.values()).map(d => ({ id: d.id, type: d.type, ip: d.ip }))
  });
});

// Página Inicial / Portal de Acesso Rápido da Clínica
app.get('/', (req, res) => {
  const html = `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portal de Conexão • Clínica Meirelles</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
      body { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
      .card { background: rgba(30, 41, 59, 0.85); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; padding: 40px; max-width: 580px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); text-align: center; }
      h1 { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 6px; }
      h1 span { color: #3b82f6; }
      p.subtitle { color: #94a3b8; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 30px; }
      .badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; font-size: 13px; font-weight: 700; padding: 6px 16px; rounded-full; border-radius: 9999px; margin-bottom: 28px; }
      .btn-grid { display: flex; flex-direction: column; gap: 14px; text-align: left; }
      .btn { display: flex; align-items: center; gap: 16px; padding: 18px 22px; border-radius: 16px; text-decoration: none; font-weight: 700; transition: all 0.2s ease; border: 1px solid transparent; }
      .btn-primary { background: #2563eb; color: #ffffff; box-shadow: 0 10px 20px -5px rgba(37, 99, 235, 0.4); }
      .btn-primary:hover { background: #1d4ed8; transform: translateY(-2px); }
      .btn-secondary { background: #334155; color: #f8fafc; border-color: #475569; }
      .btn-secondary:hover { background: #475569; transform: translateY(-2px); }
      .btn-apk { background: rgba(16, 185, 129, 0.15); color: #34d399; border-color: rgba(16, 185, 129, 0.4); }
      .btn-apk:hover { background: rgba(16, 185, 129, 0.25); transform: translateY(-2px); }
      .icon { font-size: 24px; }
      .info-title { font-size: 16px; font-weight: 800; }
      .info-desc { font-size: 12px; opacity: 0.8; font-weight: 500; margin-top: 2px; }
      .footer { margin-top: 30px; font-size: 12px; color: #64748b; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>OPTOMED <span>CLÍNICA</span></h1>
      <p class="subtitle">Plataforma Oftalmológica & Exames Visuais</p>

      <div class="badge">
        <span>●</span> Servidor Ativo • <span id="domain-label">optomed.app.br</span>
      </div>

      <div class="btn-grid">
        <a id="link-clinical" href="/clinical" class="btn btn-primary">
          <span class="icon">📱</span>
          <div>
            <div class="info-title">Abrir Recepção / Prontuário / Controle</div>
            <div class="info-desc">Para Computador, Notebook, Tablet ou Celular</div>
          </div>
        </a>

        <a id="link-tv" href="/tv" class="btn btn-secondary">
          <span class="icon">📺</span>
          <div>
            <div class="info-title">Abrir Tela da TV (Optotipo 17 Módulos)</div>
            <div class="info-desc">Para Smart TV, TV Box ou Segundo Monitor</div>
          </div>
        </a>

        <a href="/download" class="btn btn-apk">
          <span class="icon">⬇️</span>
          <div>
            <div class="info-title">Baixar APK (OptotipoMeirelles.apk)</div>
            <div class="info-desc">Instalar na TV Box Android / Fire TV Stick</div>
          </div>
        </a>
      </div>

      <div class="footer">
        Acesso: <b>optomed.app.br</b> • LAN: <b>192.168.1.144</b> • Porta WS: <b>8765</b>
      </div>
    </div>

    <script>
      const host = window.location.hostname;
      const port = window.location.port ? ':' + window.location.port : '';
      document.getElementById('domain-label').innerText = host || 'optomed.app.br';
      
      // Se for porta padrão 8765 ou domínio reverso, direciona relativo
      if (window.location.port === '5174' || window.location.port === '5173') {
        document.getElementById('link-clinical').href = 'http://' + host + ':5174';
        document.getElementById('link-tv').href = 'http://' + host + ':5173';
      }
    </script>
  </body>
  </html>
  `;
  res.send(html);
});

// Fallback SPA para TV
app.get('*', (req, res) => {
  const indexPath = path.join(tvDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.redirect('/');
  }
});

// Inicia servidor na porta padrão 8765
server.listen(PORT_DEFAULT, () => {
  console.log(`====================================================`);
  console.log(`OPTOTIPO MEIRELLES v2.0 - SERVIDOR LAN`);
  console.log(`Servidor ativo na rede local:`);
  console.log(`  👉 Portal Principal: http://192.168.1.144:${PORT_DEFAULT}`);
  console.log(`  👉 Controle Remoto:  http://192.168.1.144:5174`);
  console.log(`  👉 Tela da TV:       http://192.168.1.144:5173`);
  console.log(`====================================================`);
});

// Tenta também abrir a porta 80 para acesso direto por http://192.168.1.144 (sem digitar número de porta)
try {
  const httpDirectServer = createServer(app);
  httpDirectServer.listen(PORT_HTTP, () => {
    console.log(`  👉 Acesso Direto (sem porta): http://192.168.1.144/`);
  });
  httpDirectServer.on('error', (e) => {
    console.log(`(Porta 80 não pôde ser aberta, use a porta ${PORT_DEFAULT} ou 5174)`);
  });
} catch {}
