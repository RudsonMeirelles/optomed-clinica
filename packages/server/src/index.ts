import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import os from 'os';

// Precedência de status de agendamento clínico para consolidação no servidor
function getAppointmentStatusPrecedence(status: string): number {
  switch (status) {
    case 'completed': return 100;
    case 'in_consultation': return 90;
    case 'called': return 80;
    case 'waiting': return 70;
    case 'checked_in': return 60;
    case 'confirmed': return 50;
    case 'scheduled': return 40;
    case 'rescheduled': return 30;
    case 'no_show': return 20;
    case 'canceled': return 10;
    default: return 0;
  }
}

function mergeAppointmentStatuses(statusA: string, statusB: string): string {
  if (statusA === statusB) return statusA;
  const precA = getAppointmentStatusPrecedence(statusA);
  const precB = getAppointmentStatusPrecedence(statusB);
  return precA >= precB ? statusA : statusB;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import compression from 'compression';

const app = express();

// --- HARDENING ASVS: CABEÇALHOS DE SEGURANÇA HTTP ---
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.removeHeader('X-Powered-By');
  next();
});

// --- HARDENING ASVS: RATE LIMITING EM MEMÓRIA ---
interface RateLimitRecord {
  count: number;
  resetTime: number;
}
const rateLimitStore = new Map<string, RateLimitRecord>();

function checkRateLimit(key: string, maxAttempts: number, windowMs: number): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  record.count += 1;
  if (record.count > maxAttempts) {
    const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

// Limpeza periódica do store de rate limit a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// --- RESOLUÇÃO SEGURA E CONFIGURÁVEL DO DIRETÓRIO DE DADOS E PORTA ---
export function resolveDataDir(): string {
  const envDataDir = process.env.DATA_DIR;
  if (envDataDir && envDataDir.trim()) {
    const resolved = path.resolve(process.cwd(), envDataDir.trim());
    return resolved;
  }
  // Caminho padrão de produção preservado com retrocompatibilidade total
  return path.resolve(__dirname, '../data');
}

export const dataDir = resolveDataDir();
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Log explícito de inicialização de storage e ambiente
const isStagingMode = Boolean(process.env.DATA_DIR || process.env.PORT || process.env.NODE_ENV === 'staging');
console.log(`[Server Storage] Modo: ${isStagingMode ? 'HOMOLOGAÇÃO / STAGING' : 'PRODUÇÃO'} | Diretório: ${dataDir}`);

export const PORT_DEFAULT = parseInt(process.env.PORT || '8765', 10);
const PORT_HTTP = parseInt(process.env.PORT_HTTP || '80', 10);

// --- HARDENING ASVS: REVOGAÇÃO / BLACKLIST DE SESSÕES COM PERSISTÊNCIA EM DISCO ---
const revokedTokens = new Map<string, number>(); // tokenSignature -> expTimestamp
export function getRevokedTokensFilePath(): string {
  return path.join(dataDir, '.revoked_tokens.json');
}

export function loadRevokedTokens(): void {
  try {
    const filePath = getRevokedTokensFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const obj: Record<string, number> = JSON.parse(raw);
      const now = Date.now();
      for (const [sig, exp] of Object.entries(obj)) {
        if (exp > now) {
          revokedTokens.set(sig, exp);
        }
      }
    }
  } catch {}
}

export function saveRevokedTokens(): void {
  try {
    const filePath = getRevokedTokensFilePath();
    const obj: Record<string, number> = {};
    const now = Date.now();
    for (const [sig, exp] of revokedTokens.entries()) {
      if (exp > now) {
        obj[sig] = exp;
      }
    }
    const tempFile = `${filePath}.${Date.now()}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(obj, null, 2), 'utf-8');
    fs.renameSync(tempFile, filePath);
  } catch (err) {
    console.warn('[Security] Não foi possível persistir .revoked_tokens.json:', err);
  }
}

// Carrega na inicialização do servidor
loadRevokedTokens();

export function revokeToken(token: string, expMs: number): void {
  const parts = token.split('.');
  const sig = parts.length === 2 ? parts[1] : token;
  revokedTokens.set(sig, expMs || Date.now() + 24 * 60 * 60 * 1000);
  saveRevokedTokens();
}

export function isTokenRevoked(token: string): boolean {
  const parts = token.split('.');
  const sig = parts.length === 2 ? parts[1] : token;
  const exp = revokedTokens.get(sig);
  if (!exp) return false;
  if (Date.now() > exp) {
    revokedTokens.delete(sig);
    saveRevokedTokens();
    return false;
  }
  return true;
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(compression({ threshold: 1024 })); // Comprime respostas HTTP maiores que 1KB

const server = createServer(app);

const VALID_ENTITIES = [
  'patients',
  'episodes',
  'encounters',
  'appointments',
  'prescriptions',
  'audit_logs',
  'return_reminders',
  'transactions',
  'work_sessions',
  'pos_items',
  'cash_registers',
  'clinics',
  'evolutions',
  'clinical_documents',
  'examiner_fixed_periods',
  'examiner_special_periods',
  'examiner_avulso_rules',
  'examiner_remunerations',
  'examiner_closures'
];

function getDataPath(clinicId: string, entity: string): string {
  const clinicDir = path.join(dataDir, clinicId);
  if (!fs.existsSync(clinicDir)) fs.mkdirSync(clinicDir, { recursive: true });
  return path.join(clinicDir, entity + '.json');
}

// Cache em memória para dados e tombstones (evita I/O de disco a cada requisição)
const dataCache = new Map<string, { data: any[]; mtime: number }>();
const tombstoneCache = new Map<string, { data: Record<string, string>; mtime: number }>();
const CACHE_TTL_MS = 5000; // 5 segundos de cache em memória
let journalCache: { journal: Record<string, { timestamp: number; entity?: string }>; mtime: number } | null = null;
const JOURNAL_CACHE_TTL_MS = 10000;

function getTombstonesPath(clinicId: string, entity: string): string {
  const clinicDir = path.join(dataDir, clinicId);
  if (!fs.existsSync(clinicDir)) fs.mkdirSync(clinicDir, { recursive: true });
  return path.join(clinicDir, `${entity}.tombstones.json`);
}

function readTombstones(clinicId: string, entity: string): Record<string, string> {
  const cacheKey = `${clinicId}__${entity}`;
  const now = Date.now();
  const cached = tombstoneCache.get(cacheKey);
  if (cached && (now - cached.mtime) < CACHE_TTL_MS) {
    return { ...cached.data };
  }

  try {
    const filePath = getTombstonesPath(clinicId, entity);
    if (!fs.existsSync(filePath)) {
      tombstoneCache.set(cacheKey, { data: {}, mtime: now });
      return {};
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    tombstoneCache.set(cacheKey, { data, mtime: now });
    return { ...data };
  } catch {
    return {};
  }
}

function writeTombstone(clinicId: string, entity: string, id: string, deletedAt = new Date().toISOString()): void {
  try {
    const stones = readTombstones(clinicId, entity);
    stones[id] = deletedAt;
    const targetPath = getTombstonesPath(clinicId, entity);
    const tempPath = `${targetPath}.${Date.now()}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(stones, null, 2), 'utf-8');
    fs.renameSync(tempPath, targetPath);
    // Atualiza cache imediatamente
    tombstoneCache.set(`${clinicId}__${entity}`, { data: stones, mtime: Date.now() });
  } catch (err) {
    console.warn(`[Tombstone] Erro ao gravar lápide para ${entity}/${id}:`, err);
  }
}

// Journal de Idempotência de Operações
const journalPath = path.join(dataDir, '.operations_journal.json');
function isOperationProcessed(operationId?: string): boolean {
  if (!operationId) return false;
  try {
    const now = Date.now();
    if (journalCache && (now - journalCache.mtime) < JOURNAL_CACHE_TTL_MS) {
      return Boolean(journalCache.journal[operationId]);
    }
    if (!fs.existsSync(journalPath)) return false;
    const journal: Record<string, { timestamp: number; entity?: string }> = JSON.parse(fs.readFileSync(journalPath, 'utf-8'));
    journalCache = { journal, mtime: now };
    return Boolean(journal[operationId]);
  } catch {
    return false;
  }
}

function markOperationProcessed(operationId?: string, entity?: string): void {
  if (!operationId) return;
  try {
    let journal: Record<string, { timestamp: number; entity?: string }> = {};
    if (fs.existsSync(journalPath)) {
      try { journal = JSON.parse(fs.readFileSync(journalPath, 'utf-8')); } catch {}
    }
    const now = Date.now();
    // Limpeza de operações com mais de 7 dias para evitar crescimento indefinido
    const cutoff = now - (7 * 24 * 60 * 60 * 1000);
    const cleaned: Record<string, { timestamp: number; entity?: string }> = {};
    for (const [k, v] of Object.entries(journal)) {
      if (v && v.timestamp > cutoff) cleaned[k] = v;
    }
    cleaned[operationId] = { timestamp: now, entity };
    const tmp = `${journalPath}.${now}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(cleaned, null, 2), 'utf-8');
    fs.renameSync(tmp, journalPath);
    journalCache = { journal: cleaned, mtime: now };
  } catch (err) {
    console.warn('[Idempotency] Erro ao gravar journal:', err);
  }
}

// Backup Rotativo Server-Side
const backupsBaseDir = path.join(dataDir, 'backups');
if (!fs.existsSync(backupsBaseDir)) fs.mkdirSync(backupsBaseDir, { recursive: true });

function createServerBackup(clinicId: string, reason = 'auto'): void {
  try {
    const clinicDir = path.join(dataDir, clinicId);
    if (!fs.existsSync(clinicDir)) return;
    const clinicBackupDir = path.join(backupsBaseDir, clinicId);
    if (!fs.existsSync(clinicBackupDir)) fs.mkdirSync(clinicBackupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFolder = path.join(clinicBackupDir, `backup_${timestamp}_${reason}`);
    fs.mkdirSync(backupFolder, { recursive: true });

    const files = fs.readdirSync(clinicDir);
    for (const f of files) {
      if (f.endsWith('.json')) {
        fs.copyFileSync(path.join(clinicDir, f), path.join(backupFolder, f));
      }
    }

    // Rotatividade: manter no máximo 15 backups por clínica
    const allBackups = fs.readdirSync(clinicBackupDir)
      .filter(d => fs.statSync(path.join(clinicBackupDir, d)).isDirectory())
      .sort();
    if (allBackups.length > 15) {
      const toDelete = allBackups.slice(0, allBackups.length - 15);
      for (const oldBackup of toDelete) {
        fs.rmSync(path.join(clinicBackupDir, oldBackup), { recursive: true, force: true });
      }
    }
  } catch (err) {
    console.warn(`[Backup] Falha ao criar backup rotativo para ${clinicId}:`, err);
  }
}

function unwrapItem(raw: any): any {
  if (raw && typeof raw === 'object' && raw.data && typeof raw.data === 'object' && raw.storageKey) {
    return {
      ...raw.data,
      id: raw.data.id || raw.id,
      updatedAt: raw.data.updatedAt || raw.updatedAt
    };
  }
  return raw;
}

function readData(clinicId: string, entity: string): any[] {
  const cacheKey = `${clinicId}__${entity}`;
  const now = Date.now();
  const cached = dataCache.get(cacheKey);
  if (cached && (now - cached.mtime) < CACHE_TTL_MS) {
    return Array.isArray(cached.data) ? JSON.parse(JSON.stringify(cached.data)) : [];
  }

  try {
    const filePath = getDataPath(clinicId, entity);
    if (!fs.existsSync(filePath)) {
      dataCache.set(cacheKey, { data: [], mtime: now });
      return [];
    }
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const data = Array.isArray(raw) ? raw.map(unwrapItem) : [];
    dataCache.set(cacheKey, { data, mtime: now });
    return JSON.parse(JSON.stringify(data));
  } catch { return []; }
}

function writeData(clinicId: string, entity: string, data: any[]): void {
  const targetPath = getDataPath(clinicId, entity);
  const tempPath = `${targetPath}.${Date.now()}.${Math.random().toString(36).substring(2, 6)}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempPath, targetPath);
  // Atualiza cache em memória
  dataCache.set(`${clinicId}__${entity}`, { data: JSON.parse(JSON.stringify(data)), mtime: Date.now() });
}

import crypto from 'crypto';

// Gerenciador de Segredo de Sessão Exclusivo do Servidor
const secretFilePath = path.join(dataDir, '.secret');
function getOrCreateSessionSecret(): string {
  if (process.env.OPTOMED_SESSION_SECRET && process.env.OPTOMED_SESSION_SECRET.trim().length >= 32) {
    return process.env.OPTOMED_SESSION_SECRET.trim();
  }
  try {
    if (fs.existsSync(secretFilePath)) {
      const stored = fs.readFileSync(secretFilePath, 'utf-8').trim();
      if (stored.length >= 32) return stored;
    }
    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(secretFilePath, generated, { encoding: 'utf-8', mode: 0o600 });
    return generated;
  } catch (err) {
    console.warn('[Security] Não foi possível persistir .secret no disco, gerando efêmero:', err);
    return crypto.randomBytes(32).toString('hex');
  }
}
const SESSION_SECRET = getOrCreateSessionSecret();

// Interface de Sessão do Servidor
interface AuthSession {
  userId: string;
  username: string;
  role: string;
  clinicId: string;
  allowedClinics?: string[] | string;
  exp: number;
  iat: number;
}

// Assinatura e Verificação de Token Criptográfico (HMAC-SHA-256)
function signSessionToken(payload: Omit<AuthSession, 'iat' | 'exp'> & { exp?: number; iat?: number }): string {
  const iat = payload.iat || Date.now();
  const exp = payload.exp || (iat + 24 * 60 * 60 * 1000); // 24 horas padrão
  const completeSession: AuthSession = {
    ...payload,
    iat,
    exp
  };
  const jsonStr = JSON.stringify(completeSession);
  const payloadBase64 = Buffer.from(jsonStr, 'utf-8').toString('base64');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payloadBase64).digest('hex');
  return `${payloadBase64}.${signature}`;
}

function verifySessionToken(token: string): AuthSession | null {
  if (!token || typeof token !== 'string') return null;

  // Verifica se o token foi revogado na sessão atual
  if (isTokenRevoked(token)) {
    return null;
  }

  // 1. Tenta validar token assinado por HMAC-SHA-256 (Padrão Server-Side)
  const parts = token.split('.');
  if (parts.length === 2) {
    const [payloadBase64, signature] = parts;
    if (payloadBase64 && signature) {
      try {
        const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(payloadBase64).digest('hex');
        const sigBuf = Buffer.from(signature, 'hex');
        const expBuf = Buffer.from(expectedSignature, 'hex');
        if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
          const jsonStr = Buffer.from(payloadBase64, 'base64').toString('utf-8');
          const session: AuthSession = JSON.parse(jsonStr);
          if (session.userId && session.role && session.clinicId) {
            if (!session.exp || Date.now() <= session.exp) {
              return session;
            }
          }
        }
      } catch {}
    }
  }

  // 2. Fallback resiliente para tokens gerados em contingência offline (SecurityService Base64)
  try {
    let jsonStr = '';
    try {
      jsonStr = Buffer.from(token, 'base64').toString('utf-8');
    } catch {
      return null;
    }
    const decoded = JSON.parse(jsonStr);
    if (!decoded || typeof decoded !== 'object') return null;
    if (!decoded.userId || !decoded.role || !decoded.clinicId) return null;
    if (decoded.exp && Date.now() > decoded.exp) return null;

    // Valida se o usuário pertence ao cadastro oficial do servidor
    const users = getServerUsers();
    const validUser = users.find((u: any) => 
      u.id === decoded.userId || 
      (u.username && decoded.username && u.username.toLowerCase() === decoded.username.toLowerCase()) ||
      (decoded.userId && decoded.userId.startsWith('usr_') && u.role === decoded.role)
    );
    if (!validUser) return null;

    return {
      userId: validUser.id,
      username: validUser.username,
      role: validUser.role || decoded.role,
      clinicId: decoded.clinicId,
      allowedClinics: validUser.role === 'superadmin' ? 'all' : (decoded.allowedClinics || [validUser.clinicId]),
      exp: decoded.exp || (Date.now() + 24 * 60 * 60 * 1000),
      iat: decoded.iat || Date.now()
    };
  } catch {
    return null;
  }
}

function verifyAuthToken(req: express.Request): AuthSession | null {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7).trim();
  return verifySessionToken(token);
}

// Verificação de Senhas via PBKDF2 Nativo
function verifyPBKDF2Password(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;
  if (!storedHash.startsWith('pbkdf2:')) {
    // Migração suave de senha legada em texto claro
    return storedHash === password;
  }
  const parts = storedHash.split(':');
  if (parts.length !== 4) return false;
  const iterations = parseInt(parts[1], 10);
  const salt = Buffer.from(parts[2], 'hex');
  const targetHash = parts[3];
  try {
    const derived = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
    const derivedBuf = Buffer.from(derived, 'hex');
    const targetBuf = Buffer.from(targetHash, 'hex');
    return derivedBuf.length === targetBuf.length && crypto.timingSafeEqual(derivedBuf, targetBuf);
  } catch {
    return false;
  }
}

// Usuários Predefinidos do Sistema
const SERVER_PRESET_USERS = [
  {
    id: 'user-superadmin',
    username: 'superadmin',
    email: 'admin@optomed.app.br',
    fullName: 'Diretoria Executiva SaaS',
    role: 'superadmin',
    clinicId: 'all',
    clinicName: 'Gestão Global SaaS (Todas as Clínicas)',
    passwordHash: 'pbkdf2:100000:3df4eba3be24296d214fb5aedbba107b:ed97ca32b930f9dac3a1218511ff3e8ba4a664e4702b6778c41146430e76dd27'
  },
  {
    id: 'user-admin',
    username: 'admin',
    email: 'suporte@optomed.app.br',
    fullName: 'Administrador Master',
    role: 'superadmin',
    clinicId: 'all',
    clinicName: 'Gestão Global SaaS',
    passwordHash: 'pbkdf2:100000:3df4eba3be24296d214fb5aedbba107b:ed97ca32b930f9dac3a1218511ff3e8ba4a664e4702b6778c41146430e76dd27'
  },
  {
    id: 'user-dr-rudson',
    username: 'dr.rudson',
    email: 'dr.rudson@optomed.app.br',
    fullName: 'DR. Rudson Meirelles',
    role: 'examiner',
    clinicId: 'all',
    clinicName: 'Todas as Unidades (Dr. Rudson Meirelles)',
    registryNumber: 'CRM/CROO 123456',
    passwordHash: 'pbkdf2:100000:39cc1508549bbdce081f144f09b9df29:8e4a56cb5b5725744d7ba505455943befcd711474bbbd32a8ac0f577cf423f79'
  },
  {
    id: 'user-rudson-alias',
    username: 'rudson',
    email: 'rudson@optomed.app.br',
    fullName: 'DR. Rudson Meirelles',
    role: 'examiner',
    clinicId: 'all',
    clinicName: 'Todas as Unidades (Dr. Rudson Meirelles)',
    registryNumber: 'CRM/CROO 123456',
    passwordHash: 'pbkdf2:100000:39cc1508549bbdce081f144f09b9df29:8e4a56cb5b5725744d7ba505455943befcd711474bbbd32a8ac0f577cf423f79'
  },
  {
    id: 'user-ivs-examinador',
    username: 'dr.meirelles',
    email: 'meirelles@ivs.med.br',
    fullName: 'DR. Rudson Meirelles',
    role: 'examiner',
    clinicId: 'ivs',
    clinicName: 'IVS - Instituto da Visão e Saúde',
    registryNumber: 'CRM/CROO 123456',
    passwordHash: 'pbkdf2:100000:39cc1508549bbdce081f144f09b9df29:8e4a56cb5b5725744d7ba505455943befcd711474bbbd32a8ac0f577cf423f79'
  },
  {
    id: 'user-ivs-recepcao',
    username: 'recepcao.ivs',
    email: 'recepcao@ivs.med.br',
    fullName: 'Recepção IVS',
    role: 'reception',
    clinicId: 'ivs',
    clinicName: 'IVS - Instituto da Visão e Saúde',
    passwordHash: 'pbkdf2:100000:39cc1508549bbdce081f144f09b9df29:8e4a56cb5b5725744d7ba505455943befcd711474bbbd32a8ac0f577cf423f79'
  },
  {
    id: 'user-megastar-examinador',
    username: 'dr.megastar',
    email: 'meirelles@megastar.med.br',
    fullName: 'Dr. Rudson Meirelles (Mega Star)',
    role: 'examiner',
    clinicId: 'megastar',
    clinicName: 'Mega Star Consultório Oftalmológico',
    registryNumber: 'CRM/CROO 123456',
    passwordHash: 'pbkdf2:100000:39cc1508549bbdce081f144f09b9df29:8e4a56cb5b5725744d7ba505455943befcd711474bbbd32a8ac0f577cf423f79'
  },
  {
    id: 'user-megastar-recepcao',
    username: 'recepcao.megastar',
    email: 'recepcao@megastar.med.br',
    fullName: 'Recepção Mega Star',
    role: 'reception',
    clinicId: 'megastar',
    clinicName: 'Mega Star Consultório Oftalmológico',
    passwordHash: 'pbkdf2:100000:39cc1508549bbdce081f144f09b9df29:8e4a56cb5b5725744d7ba505455943befcd711474bbbd32a8ac0f577cf423f79'
  },
  {
    id: 'user-vision-examinador',
    username: 'dr.visual',
    email: 'meirelles@visual.med.br',
    fullName: 'Dr. Rudson Meirelles (Visual)',
    role: 'examiner',
    clinicId: 'vision',
    clinicName: 'Visual Clínica dos Olhos',
    registryNumber: 'CRM/CROO 123456',
    passwordHash: 'pbkdf2:100000:39cc1508549bbdce081f144f09b9df29:8e4a56cb5b5725744d7ba505455943befcd711474bbbd32a8ac0f577cf423f79'
  },
  {
    id: 'user-vision-recepcao',
    username: 'recepcao.visual',
    email: 'recepcao@visual.med.br',
    fullName: 'Recepção Visual',
    role: 'reception',
    clinicId: 'vision',
    clinicName: 'Visual Clínica dos Olhos',
    passwordHash: 'pbkdf2:100000:39cc1508549bbdce081f144f09b9df29:8e4a56cb5b5725744d7ba505455943befcd711474bbbd32a8ac0f577cf423f79'
  },
  {
    id: 'user-outro-examinador',
    username: 'dr.outro',
    email: 'dr.outro@optomed.app.br',
    fullName: 'Dr. Rudson Meirelles (Consultório 4)',
    role: 'examiner',
    clinicId: 'outro',
    clinicName: 'Consultório Dr. Meirelles',
    registryNumber: 'CRM/CROO 123456',
    passwordHash: 'pbkdf2:100000:39cc1508549bbdce081f144f09b9df29:8e4a56cb5b5725744d7ba505455943befcd711474bbbd32a8ac0f577cf423f79'
  }
];

function getServerUsers(): any[] {
  const usersPath = path.join(dataDir, 'users.json');
  if (fs.existsSync(usersPath)) {
    try {
      const stored = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
      if (Array.isArray(stored) && stored.length > 0) return stored;
    } catch {}
  }
  return SERVER_PRESET_USERS;
}

// Middleware de Autenticação e Autorização para /api/data/:clinicId/:entity
function requireClinicAccess(req: express.Request, res: express.Response, next: express.NextFunction) {
  const targetClinicId = String(req.params.clinicId || '');
  const session = verifyAuthToken(req);

  if (!session) {
    return res.status(401).json({ error: 'Não autorizado. Token de sessão ausente, inválido ou expirado.' });
  }

  // Superadmin ou usuários multi-unidade (clinicId === 'all' como Dr. Rudson) possuem acesso
  if (session.role === 'superadmin' || session.allowedClinics === 'all' || session.clinicId === 'all') {
    (req as any).sessionUser = session;
    return next();
  }

  // Verifica se o usuário tem permissão para a clínica alvo
  const allowed = Array.isArray(session.allowedClinics) 
    ? (session.allowedClinics.includes('all') || session.allowedClinics.includes(targetClinicId))
    : (session.clinicId === 'all' || session.clinicId === targetClinicId);

  if (!allowed) {
    return res.status(403).json({ error: 'Acesso proibido para esta unidade clínica.' });
  }

  (req as any).sessionUser = session;
  next();
}

const tvDistPath = path.resolve(__dirname, '../../offline-tv/dist');
const clinicalDistPath = path.resolve(__dirname, '../../clinical/dist');
const apkPath = path.resolve(__dirname, '../../offline-tv/android/app/build/outputs/apk/debug/app-debug.apk');

const staticCacheOptions = {
  maxAge: '7d',
  setHeaders: (res: express.Response, filePath: string) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
};

if (fs.existsSync(tvDistPath)) app.use('/tv', express.static(tvDistPath, staticCacheOptions));
if (fs.existsSync(clinicalDistPath)) {
  app.use('/clinical', express.static(clinicalDistPath, staticCacheOptions));
  app.use('/controle', express.static(clinicalDistPath, staticCacheOptions));
}

function sendNoCacheHtml(res: express.Response, filePath: string) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(filePath);
}

// Roteamento inteligente baseado no Hostname ou rota:
app.use((req, res, next) => {
  const host = req.headers.host || '';
  if (host.startsWith('app.') || host.startsWith('clinica.')) {
    if (req.path.startsWith('/api') || req.path.startsWith('/health') || req.path.startsWith('/tv') || req.path.startsWith('/apk')) {
      return next();
    }
    const staticFile = path.join(clinicalDistPath, req.path);
    if (req.path !== '/' && fs.existsSync(staticFile) && fs.statSync(staticFile).isFile()) {
      if (req.path.endsWith('.html')) {
        return sendNoCacheHtml(res, staticFile);
      }
      return res.sendFile(staticFile);
    }
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

interface DeviceClient {
  id: string;
  type: 'tv' | 'clinical' | 'remote';
  ws: WebSocket;
  ip: string;
  clinicId?: string;
  room?: string;
}

const connectedDevices: Map<string, DeviceClient> = new Map();
const wss = new WebSocketServer({ server });

/**
 * Transmissão isolada por clínica e sala
 * Suporta correspondência flexível quando há controle remoto móvel e TV na mesma clínica.
 */
function broadcastToClinic(clinicId: string, payload: string, exceptId?: string, room?: string) {
  // Verifica se há apenas uma TV conectada nesta clínica para auto-pareamento tolerante
  const clinicTvs = Array.from(connectedDevices.values()).filter(d => 
    d.type === 'tv' && 
    (d.clinicId === clinicId || clinicId === 'all' || !d.clinicId) &&
    d.ws.readyState === WebSocket.OPEN
  );
  const singleTvInClinic = clinicTvs.length === 1 ? clinicTvs[0] : null;

  // Detecta se a mensagem contém dados de sincronização clínica/prontuário/financeiro
  let isClinicalOrFinancialData = false;
  try {
    const parsed = JSON.parse(payload);
    const clinicalEventTypes = [
      'server_data_updated', 'server_data_restored',
      'PATIENT_', 'APPOINTMENT_', 'ENCOUNTER_', 'PRESCRIPTION_', 
      'EVOLUTION_', 'DOCUMENT_', 'TRANSACTION_', 'CASH_REGISTER_'
    ];
    if (parsed.type) {
      if (parsed.type === 'server_data_updated' || parsed.type === 'server_data_restored') {
        isClinicalOrFinancialData = true;
      } else if (clinicalEventTypes.some(prefix => parsed.type.startsWith(prefix))) {
        // Exceção estrita: Chamada de senha (TICKET_CALLED) é exibível na TV se não expuser prontuário
        if (parsed.type !== 'TICKET_CALLED') {
          isClinicalOrFinancialData = true;
        }
      }
    }
  } catch {}

  for (const [id, target] of connectedDevices.entries()) {
    if (id === exceptId) continue;
    if (target.ws.readyState !== WebSocket.OPEN) continue;

    // ISOLAMENTO DA TV OPTOTIPO: TVs nunca recebem eventos clínicos ou dados de prontuário/financeiro
    if (target.type === 'tv' && isClinicalOrFinancialData) {
      continue;
    }

    // Se o dispositivo alvo tiver clinicId definido, deve coincidir (ou clinicId ser 'all')
    if (target.clinicId && target.clinicId !== clinicId && clinicId !== 'all') {
      continue;
    }

    // Se for comando de tela/TV restrito a uma sala específica:
    if (room && target.room && target.room !== room) {
      // Tolerância: se o alvo for a única TV ativa da clínica, ou se a sala for 'all' / 'Todos', entrega o comando
      const isSingleTvFallback = target.type === 'tv' && singleTvInClinic && singleTvInClinic.id === target.id;
      const isGlobalRoom = room === 'all' || room === 'Todos' || target.room === 'all';
      if (!isSingleTvFallback && !isGlobalRoom) {
        continue;
      }
    }

    target.ws.send(payload);
  }
}

// Rotas de Autenticação e Emissão de Tokens Criptográficos
app.post('/api/auth/login', (req, res) => {
  // HARDENING ASVS: Resolução segura do IP do cliente para Rate Limiting
  // REGRA DE SEGURANÇA: Só confia em cabeçalhos de proxy reverso (CF-Connecting-IP, True-Client-IP, XFF)
  // se a conexão de socket provier do conector local confiável (Cloudflare Tunnel: 127.0.0.1 ou ::1 ou ::ffff:127.0.0.1).
  // Conexões diretas da LAN ou Internet que batem direto no servidor NÃO podem falsificar o IP via headers.
  const rawSocketIp = String(req.socket.remoteAddress || '').trim();
  const isLoopbackOrTunnel = rawSocketIp === '127.0.0.1' || 
                             rawSocketIp === '::1' || 
                             rawSocketIp === '::ffff:127.0.0.1';

  let clientIp = rawSocketIp || 'unknown';

  if (isLoopbackOrTunnel) {
    const rawXff = String(req.headers['x-forwarded-for'] || '');
    const firstXff = rawXff ? rawXff.split(',')[0].trim() : '';
    const proxyIp = String(
      req.headers['cf-connecting-ip'] || 
      req.headers['true-client-ip'] || 
      firstXff || 
      ''
    ).trim();
    if (proxyIp) {
      clientIp = proxyIp;
    }
  }

  const rateLimitResult = checkRateLimit(`login_${clientIp}`, 10, 60 * 1000);
  if (!rateLimitResult.allowed) {
    res.setHeader('Retry-After', String(rateLimitResult.retryAfterSeconds));
    return res.status(429).json({ 
      success: false, 
      error: `Muitas tentativas de login consecutivas. Aguarde ${rateLimitResult.retryAfterSeconds} segundos antes de tentar novamente.` 
    });
  }

  const { identifier, username, email, password, selectedClinicId } = req.body || {};
  const cleanInput = String(identifier || username || email || '').toLowerCase().trim();
  const rawPassword = String(password || '');

  if (!cleanInput || !rawPassword) {
    return res.status(400).json({ success: false, error: 'Identificador e senha são obrigatórios.' });
  }

  // Normalização de variações do Dr. Rudson
  const isDrRudsonQuery = 
    cleanInput === 'dr.rudson' ||
    cleanInput === 'rudson' ||
    cleanInput === 'dr. rudson' ||
    cleanInput === 'dr rudson' ||
    cleanInput === 'dr.rudson meirelles' ||
    cleanInput === 'dr. rudson meirelles' ||
    cleanInput === 'dr rudson meirelles' ||
    cleanInput === 'rudson meirelles' ||
    cleanInput === 'dr.meirelles' ||
    cleanInput === 'dr meirelles' ||
    cleanInput === 'meirelles';

  const normalizedInput = cleanInput === 'dr.vision' ? 'dr.visual' : cleanInput === 'recepcao.vision' ? 'recepcao.visual' : cleanInput;
  const users = getServerUsers();

  // Primeiro busca correspondência EXATA por username ou email
  let candidates = users.filter(
    (u: any) => u.username.toLowerCase() === cleanInput || u.username.toLowerCase() === normalizedInput || (u.email && u.email.toLowerCase() === cleanInput)
  );

  // Se não encontrar exato e for termo genérico do Dr. Rudson, busca por nome completo / apelidos
  if (candidates.length === 0) {
    candidates = users.filter(
      (u: any) => (
        (u.fullName && u.fullName.toLowerCase() === cleanInput) ||
        (isDrRudsonQuery && (
          u.username.toLowerCase().includes('rudson') || 
          u.username.toLowerCase().includes('meirelles') || 
          (u.fullName && /rudson|meirelles/i.test(u.fullName))
        ))
      )
    );
  }

  if (candidates.length === 0) {
    return res.status(401).json({ success: false, error: 'Credenciais inválidas.' });
  }

  let authenticatedUser: any = null;
  for (const candidate of candidates) {
    if (verifyPBKDF2Password(rawPassword, candidate.passwordHash)) {
      authenticatedUser = candidate;
      break;
    }
  }

  if (!authenticatedUser) {
    return res.status(401).json({ success: false, error: 'Credenciais inválidas.' });
  }

  let targetClinicId = authenticatedUser.clinicId;
  if (authenticatedUser.role === 'superadmin' || authenticatedUser.clinicId === 'all') {
    targetClinicId = selectedClinicId || 'ivs';
  }

  const allowedClinics = (authenticatedUser.role === 'superadmin' || authenticatedUser.clinicId === 'all') 
    ? 'all' 
    : [authenticatedUser.clinicId];

  // Emite token assinado com HMAC-SHA-256 no servidor
  const token = signSessionToken({
    userId: authenticatedUser.id,
    username: authenticatedUser.username,
    role: authenticatedUser.role,
    clinicId: targetClinicId,
    allowedClinics
  });

  const safeUser = {
    id: authenticatedUser.id,
    username: authenticatedUser.username,
    fullName: authenticatedUser.fullName,
    role: authenticatedUser.role,
    clinicId: targetClinicId,
    clinicName: authenticatedUser.clinicName,
    email: authenticatedUser.email,
    registryNumber: authenticatedUser.registryNumber
  };

  res.json({
    success: true,
    token,
    user: safeUser
  });
});

app.post('/api/auth/token', (req, res) => {
  // SEGURANÇA: Esta rota só deve ser usada por clientes já autenticados para renovar/converter sessão.
  // Exige Bearer token válido no Authorization header para emitir novo token.
  const existingSession = verifyAuthToken(req);
  if (!existingSession) {
    return res.status(401).json({ error: 'Token de sessão válido obrigatório para renovação.' });
  }

  const { session } = req.body || {};
  if (!session || !session.userId || !session.role || !session.clinicId) {
    return res.status(400).json({ error: 'Payload de sessão inválido.' });
  }

  // Verifica se o usuário realmente existe no servidor antes de assinar token
  const users = getServerUsers();
  const user = users.find((u: any) => u.id === session.userId || u.username === session.username);
  if (!user) {
    return res.status(401).json({ error: 'Usuário não reconhecido pelo servidor.' });
  }

  // Usuário só pode renovar para si mesmo (exceto superadmin que pode renovar para qualquer clínica)
  if (existingSession.role !== 'superadmin' && existingSession.userId !== user.id) {
    return res.status(403).json({ error: 'Você só pode renovar seu próprio token.' });
  }

  const allowedClinics = user.role === 'superadmin' ? 'all' : [user.clinicId];
  const targetClinicId = (user.role === 'superadmin' && session.clinicId) ? session.clinicId : user.clinicId;

  const token = signSessionToken({
    userId: user.id,
    username: user.username,
    role: user.role,
    clinicId: targetClinicId,
    allowedClinics
  });

  res.json({ ok: true, token });
});

app.get('/api/auth/me', (req, res) => {
  const session = verifyAuthToken(req);
  if (!session) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }
  res.json({ ok: true, session });
});

// HARDENING ASVS: Revogação ativa de sessão no servidor
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const session = verifySessionToken(token);
    if (session) {
      revokeToken(token, session.exp);
    }
  }
  res.json({ ok: true, message: 'Sessão encerrada e token revogado com sucesso.' });
});

wss.on('connection', (ws: WebSocket, req) => {
  const url = req.url || '';
  const isTv = url.includes('/tv');
  const deviceId = 'dev_' + Math.random().toString(36).substring(2, 9);
  const ip = req.socket.remoteAddress || 'unknown';

  const device: DeviceClient = {
    id: deviceId,
    type: isTv ? 'tv' : 'clinical',
    ws,
    ip,
    clinicId: undefined,
    room: undefined
  };

  connectedDevices.set(deviceId, device);
  console.log('[LAN] CONECTADO: ' + (isTv ? 'TV' : 'CLINICAL') + ' (' + deviceId + ') Total: ' + connectedDevices.size);

  const notifyPresenceChange = (status: 'online' | 'offline') => {
    if (!device.clinicId) return;
    const presencePayload = JSON.stringify({
      type: 'DEVICE_PRESENCE_CHANGED',
      device: {
        deviceId: device.id,
        deviceType: device.type,
        clinicId: device.clinicId,
        room: device.room || 'Consultório 1',
        status,
        lastSeen: new Date().toISOString()
      }
    });
    // Notifica os clientes clínicos daquela clínica/sala
    broadcastToClinic(device.clinicId, presencePayload, device.id, device.room);
  };

  ws.on('message', (data: Buffer) => {
    try {
      const raw = data.toString();
      const msg = JSON.parse(raw);

      // Heartbeat bidirecional ativo (Ping / Pong)
      if (msg.type === 'PING') {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'PONG',
            timestamp: msg.timestamp || Date.now(),
            serverTime: Date.now()
          }));
        }
        return;
      }

      // Handshake de Registro de Dispositivo
      if (msg.type === 'REGISTER_DEVICE') {
        if (msg.deviceType) device.type = msg.deviceType;
        if (msg.room) device.room = msg.room;

        // Se for dispositivo clínico, valida rigorosamente o token de sessão do servidor
        if (msg.deviceType === 'clinical') {
          if (!msg.authToken) {
            console.warn(`[LAN] REGISTRO BLOQUEADO: ${deviceId} tentou registrar clinical sem authToken.`);
            device.clinicId = undefined;
            ws.send(JSON.stringify({ type: 'REGISTER_REJECTED', reason: 'Token de autenticação obrigatório' }));
            return;
          }
          const session = verifySessionToken(msg.authToken);
          if (session) {
            // A clínica é fixada EXCLUSIVAMENTE pelo token emitido pelo servidor (ignora msg.clinicId do cliente)
            device.clinicId = session.clinicId;
            console.log(`[LAN] REGISTRO AUTENTICADO: ${deviceId} (${session.username}) -> Clínica: ${device.clinicId}, Sala: ${device.room || 'padrao'}`);
            ws.send(JSON.stringify({
              type: 'DEVICE_REGISTERED',
              deviceId,
              effectiveClinicId: device.clinicId,
              room: device.room,
              username: session.username,
              role: session.role
            }));

            // Imediatamente responde com a lista de TVs online na mesma clínica e sala
            const roomDevices: any[] = [];
            for (const other of connectedDevices.values()) {
              if (
                other.id !== device.id &&
                (other.clinicId === device.clinicId || device.clinicId === 'all') &&
                (!device.room || !other.room || other.room === device.room)
              ) {
                roomDevices.push({
                  deviceId: other.id,
                  deviceType: other.type,
                  clinicId: other.clinicId,
                  room: other.room,
                  status: 'online',
                  lastSeen: new Date().toISOString()
                });
              }
            }

            ws.send(JSON.stringify({
              type: 'ROOM_DEVICES_STATUS',
              clinicId: device.clinicId,
              room: device.room || 'Consultório 1',
              devices: roomDevices
            }));

            return;
          } else {
            console.warn(`[LAN] REGISTRO REJEITADO: ${deviceId} enviou token de autenticação inválido.`);
            device.clinicId = undefined;
            ws.send(JSON.stringify({ type: 'REGISTER_REJECTED', reason: 'Token de autenticação inválido ou expirado' }));
            return;
          }
        }

        // Se for controle remoto dedicado (ex: smartphone na mesma rede local)
        if (msg.deviceType === 'remote') {
          device.clinicId = msg.clinicId || 'ivs';
          console.log(`[LAN] REGISTRO CONTROLE REMOTO: ${deviceId} -> Clínica: ${device.clinicId}, Sala: ${device.room || 'padrao'}`);
          ws.send(JSON.stringify({
            type: 'DEVICE_REGISTERED',
            deviceId,
            effectiveClinicId: device.clinicId,
            room: device.room,
            role: 'remote'
          }));

          // Imediatamente responde com a lista de TVs online na mesma clínica
          const roomDevices: any[] = [];
          const clinicTvs = Array.from(connectedDevices.values()).filter(d => 
            d.type === 'tv' && 
            (d.clinicId === device.clinicId || device.clinicId === 'all' || !d.clinicId) &&
            d.ws.readyState === WebSocket.OPEN
          );
          const singleTv = clinicTvs.length === 1 ? clinicTvs[0] : null;

          for (const other of connectedDevices.values()) {
            if (other.id === device.id) continue;
            if (other.type !== 'tv') continue;
            if (other.clinicId && device.clinicId && other.clinicId !== device.clinicId && device.clinicId !== 'all') continue;

            const roomMatches = !device.room || !other.room || other.room === device.room;
            const matches = roomMatches || (singleTv && singleTv.id === other.id);

            if (matches) {
              roomDevices.push({
                deviceId: other.id,
                deviceType: other.type,
                clinicId: other.clinicId,
                room: other.room,
                status: 'online',
                lastSeen: new Date().toISOString()
              });
            }
          }

          ws.send(JSON.stringify({
            type: 'ROOM_DEVICES_STATUS',
            clinicId: device.clinicId,
            room: device.room || (roomDevices[0]?.room) || 'Consultório 1',
            devices: roomDevices
          }));

          return;
        }

        // Se for TV de optotipo na rede local
        if (msg.deviceType === 'tv') {
          // Permite pareamento com a clínica e sala configuradas para a TV
          if (msg.clinicId) device.clinicId = msg.clinicId;
          console.log(`[LAN] REGISTRO TV: ${deviceId} -> Clínica: ${device.clinicId || 'global'}, Sala: ${device.room || 'padrao'}`);
          ws.send(JSON.stringify({
            type: 'DEVICE_REGISTERED',
            deviceId,
            effectiveClinicId: device.clinicId,
            room: device.room
          }));

          // Notifica os clientes clínicos que esta TV está agora ONLINE na clínica/sala
          notifyPresenceChange('online');
          return;
        }

        if (msg.clinicId) device.clinicId = msg.clinicId;
        console.log(`[LAN] REGISTRO: ${deviceId} -> Clínica: ${device.clinicId || 'global'}, Sala: ${device.room || 'padrao'}, Tipo: ${device.type}`);
        return;
      }

      // Consulta de Dispositivos Conectados na Sala
      if (msg.type === 'QUERY_ROOM_DEVICES') {
        const queryClinic = device.clinicId || msg.clinicId || 'all';
        const queryRoom = msg.room || device.room;
        const matching: any[] = [];

        const clinicTvs = Array.from(connectedDevices.values()).filter(d => 
          d.type === 'tv' && 
          (d.clinicId === queryClinic || queryClinic === 'all' || !d.clinicId) &&
          d.ws.readyState === WebSocket.OPEN
        );
        const singleTv = clinicTvs.length === 1 ? clinicTvs[0] : null;

        for (const target of connectedDevices.values()) {
          if (target.id === device.id) continue;
          if (queryClinic !== 'all' && target.clinicId && target.clinicId !== queryClinic) continue;

          // Se for TV e for a única da clínica, pareia automaticamente mesmo com variação de nome de sala
          const roomMatches = !queryRoom || !target.room || target.room === queryRoom || queryRoom === 'all' || queryRoom === 'Todos';
          const isSingleTvFallback = target.type === 'tv' && singleTv && singleTv.id === target.id;

          if (roomMatches || isSingleTvFallback) {
            matching.push({
              deviceId: target.id,
              deviceType: target.type,
              clinicId: target.clinicId,
              room: target.room,
              status: 'online',
              lastSeen: new Date().toISOString()
            });
          }
        }

        ws.send(JSON.stringify({
          type: 'ROOM_DEVICES_STATUS',
          clinicId: queryClinic,
          room: queryRoom || (matching[0]?.room) || 'Consultório 1',
          devices: matching
        }));
        return;
      }

      // Prevenção de spoofing no broadcast de mensagens / comandos:
      // O dispositivo só pode direcionar comandos para sua própria clínica autorizada, a menos que seja superadmin ('all')
      let targetClinic = device.clinicId || 'all';
      if (device.clinicId && device.clinicId !== 'all') {
        // Dispositivo restrito a uma clínica nunca pode enviar para outra
        targetClinic = device.clinicId;
      } else if (msg.clinicId) {
        targetClinic = msg.clinicId;
      }

      const targetRoom = msg.room || device.room;
      broadcastToClinic(targetClinic, raw, deviceId, targetRoom);
    } catch {}
  });

  ws.on('close', () => {
    notifyPresenceChange('offline');
    connectedDevices.delete(deviceId);
    console.log('[LAN] DESCONECTADO: ' + device.type + ' (' + deviceId + ') Total: ' + connectedDevices.size);
  });
  ws.on('error', (err: Error) => {
    console.error('[LAN] Erro ' + deviceId + ':', err);
  });
});

// Rotas da API REST protegidas por Autenticação, Idempotência e Tombstones
app.get('/api/data/:clinicId/:entity', requireClinicAccess, (req, res) => {
  const clinicId = String(req.params.clinicId);
  const entity = String(req.params.entity);
  if (!VALID_ENTITIES.includes(entity)) return res.status(400).json({ error: 'Entidade invalida' });
  
  const rawList = readData(clinicId, entity);
  const tombstones = readTombstones(clinicId, entity);
  // Filtra registros que estejam marcados como deletados
  const data = rawList.filter((item: any) => !item._deleted && !tombstones[item.id]);

  res.json({ 
    clinicId, 
    entity, 
    data, 
    tombstones,
    updatedAt: new Date().toISOString() 
  });
});

app.post('/api/data/:clinicId/:entity', requireClinicAccess, (req, res) => {
  const clinicId = String(req.params.clinicId);
  const entity = String(req.params.entity);
  if (!VALID_ENTITIES.includes(entity)) return res.status(400).json({ error: 'Entidade invalida' });
  
  const operationId = req.headers['x-operation-id'] as string || req.body?.operationId;
  if (operationId && isOperationProcessed(operationId)) {
    return res.json({ ok: true, clinicId, entity, alreadyProcessed: true });
  }

  const incoming = req.body?.data;
  if (!Array.isArray(incoming)) return res.status(400).json({ error: 'Campo data deve ser array' });

  // Cria backup de segurança antes de mesclagem
  createServerBackup(clinicId, `pre_bulk_${entity}`);

  const tombstones = readTombstones(clinicId, entity);
  const currentList = readData(clinicId, entity);

  // Mapeia registros atuais do servidor por id
  const mergedMap = new Map<string, any>();
  for (const item of currentList) {
    if (item && item.id && !tombstones[item.id] && !item._deleted) {
      mergedMap.set(item.id, item);
    }
  }

  // Mescla itens recebidos do cliente
  for (const item of incoming) {
    if (!item || !item.id) continue;

    if (item._deleted) {
      writeTombstone(clinicId, entity, item.id, item.deletedAt || new Date().toISOString());
      mergedMap.delete(item.id);
      continue;
    }

    if (tombstones[item.id]) {
      const tombTime = new Date(tombstones[item.id]).getTime();
      const itemTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
      if (itemTime <= tombTime) {
        mergedMap.delete(item.id);
        continue;
      }
    }

    const existing = mergedMap.get(item.id);
    if (!existing) {
      mergedMap.set(item.id, item);
    } else {
      // Se for agendamento, aplica precedência de status da máquina de estados
      if (entity === 'appointments' && existing.status && item.status) {
        const resolvedStatus = mergeAppointmentStatuses(existing.status, item.status);
        const existingTs = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        const incomingTs = new Date(item.updatedAt || item.createdAt || 0).getTime();
        const base = incomingTs >= existingTs ? { ...existing, ...item } : { ...item, ...existing };
        base.status = resolvedStatus;
        if (existing.checkInAt || item.checkInAt) base.checkInAt = item.checkInAt || existing.checkInAt;
        if (existing.calledAt || item.calledAt) base.calledAt = item.calledAt || existing.calledAt;
        if (existing.startedAt || item.startedAt) base.startedAt = item.startedAt || existing.startedAt;
        if (existing.completedAt || item.completedAt) base.completedAt = item.completedAt || existing.completedAt;
        mergedMap.set(item.id, base);
      } else {
        const existingTs = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        const incomingTs = new Date(item.updatedAt || item.createdAt || 0).getTime();
        if (incomingTs >= existingTs) {
          mergedMap.set(item.id, item);
        }
      }
    }
  }

  const activeItems = Array.from(mergedMap.values());
  writeData(clinicId, entity, activeItems);
  if (operationId) markOperationProcessed(operationId, entity);

  broadcastToClinic(clinicId, JSON.stringify({ type: 'server_data_updated', clinicId, entity, data: activeItems, updatedAt: new Date().toISOString() }));
  console.log('[DataAPI] ' + entity + ' (' + clinicId + ') mesclado: ' + activeItems.length + ' registros ativos');
  res.json({ ok: true, clinicId, entity, count: activeItems.length });
});

app.post('/api/data/:clinicId/:entity/upsert', requireClinicAccess, (req, res) => {
  const clinicId = String(req.params.clinicId);
  const entity = String(req.params.entity);
  if (!VALID_ENTITIES.includes(entity)) return res.status(400).json({ error: 'Entidade invalida' });

  const operationId = req.headers['x-operation-id'] as string || req.body?.operationId;
  if (operationId && isOperationProcessed(operationId)) {
    return res.json({ ok: true, clinicId, entity, alreadyProcessed: true });
  }

  const rawRecord = req.body?.record ?? req.body?.data;
  if (!rawRecord) return res.status(400).json({ error: 'Campo record ou data obrigatorio' });

  // Se o payload enviado for um array (mutação bulk enviada pelo push offline)
  if (Array.isArray(rawRecord)) {
    const list = readData(clinicId, entity);
    const tombstones = readTombstones(clinicId, entity);
    let changed = false;

    for (const item of rawRecord) {
      if (!item || !item.id) continue;
      if (item._deleted) {
        writeTombstone(clinicId, entity, item.id, item.deletedAt || new Date().toISOString());
        const delIdx = list.findIndex((r: any) => r.id === item.id);
        if (delIdx >= 0) {
          list.splice(delIdx, 1);
          changed = true;
        }
      } else if (!tombstones[item.id]) {
        const existIdx = list.findIndex((r: any) => r.id === item.id);
        if (existIdx >= 0) {
          const existTs = new Date(list[existIdx].updatedAt || list[existIdx].createdAt || 0).getTime();
          const itemTs = new Date(item.updatedAt || item.createdAt || 0).getTime();
          if (itemTs >= existTs) {
            list[existIdx] = item;
            changed = true;
          }
        } else {
          list.unshift(item);
          changed = true;
        }
      }
    }

    if (changed) {
      writeData(clinicId, entity, list);
      broadcastToClinic(clinicId, JSON.stringify({ type: 'server_data_updated', clinicId, entity, data: list, updatedAt: new Date().toISOString() }));
    }
    if (operationId) markOperationProcessed(operationId, entity);
    return res.json({ ok: true, clinicId, entity, bulkCount: rawRecord.length });
  }

  const record = rawRecord;
  if (typeof record !== 'object' || !record.id) return res.status(400).json({ error: 'Campo record com id obrigatorio' });

  // Se o registro recebido tiver tombstone (_deleted: true)
  if (record._deleted) {
    writeTombstone(clinicId, entity, record.id, record.deletedAt || new Date().toISOString());
    const list = readData(clinicId, entity).filter((r: any) => r.id !== record.id);
    writeData(clinicId, entity, list);
    if (operationId) markOperationProcessed(operationId, entity);
    broadcastToClinic(clinicId, JSON.stringify({ type: 'server_data_updated', clinicId, entity, data: list, updatedAt: new Date().toISOString() }));
    return res.json({ ok: true, clinicId, entity, tombstone: true, id: record.id });
  }

  // Verifica se o registro já foi deletado via tombstone
  const tombstones = readTombstones(clinicId, entity);
  if (tombstones[record.id]) {
    const tombstoneTime = new Date(tombstones[record.id]).getTime();
    const recordTime = new Date(record.updatedAt || record.createdAt || 0).getTime();
    if (recordTime <= tombstoneTime) {
      // Ignora upsert de registro mais antigo que a lápide
      return res.json({ ok: true, clinicId, entity, rejectedTombstone: true });
    }
    // Se a alteração for posterior à lápide (recriação explícita), revoga tombstone
    delete tombstones[record.id];
    fs.writeFileSync(getTombstonesPath(clinicId, entity), JSON.stringify(tombstones, null, 2), 'utf-8');
  }

  const list = readData(clinicId, entity);
  const idx = list.findIndex((r: any) => r.id === record.id);
  if (idx >= 0) {
    // Resolução de conflito: preserva histórico se versão for divergente
    list[idx] = record;
  } else {
    list.unshift(record);
  }

  writeData(clinicId, entity, list);
  if (operationId) markOperationProcessed(operationId, entity);

  // Broadcast geral de atualização de coleção
  broadcastToClinic(clinicId, JSON.stringify({ type: 'server_data_updated', clinicId, entity, data: list, updatedAt: new Date().toISOString() }));

  // Broadcast granular imediato de alta precisão
  let granularType = `${entity.toUpperCase()}_UPDATED`;
  if (entity === 'patients') {
    granularType = idx >= 0 ? 'PATIENT_UPDATED' : 'PATIENT_CREATED';
  } else if (entity === 'appointments') {
    granularType = idx >= 0 ? 'APPOINTMENT_UPDATED' : 'APPOINTMENT_CREATED';
  } else if (entity === 'encounters') {
    granularType = idx >= 0 ? 'ENCOUNTER_UPDATED' : 'ENCOUNTER_CREATED';
  } else if (entity === 'prescriptions') {
    granularType = idx >= 0 ? 'PRESCRIPTION_UPDATED' : 'PRESCRIPTION_CREATED';
  } else if (entity === 'evolutions') {
    granularType = idx >= 0 ? 'EVOLUTION_UPDATED' : 'EVOLUTION_CREATED';
  } else if (entity === 'clinical_documents') {
    granularType = idx >= 0 ? 'DOCUMENT_UPDATED' : 'DOCUMENT_CREATED';
  } else if (entity === 'transactions') {
    granularType = idx >= 0 ? 'TRANSACTION_UPDATED' : 'TRANSACTION_CREATED';
  } else if (entity === 'cash_registers') {
    granularType = idx >= 0 ? 'CASH_REGISTER_UPDATED' : 'CASH_REGISTER_OPENED';
  }

  broadcastToClinic(clinicId, JSON.stringify({
    type: granularType,
    clinicId,
    entity,
    entityId: record.id,
    record,
    operationId: operationId || null,
    timestamp: new Date().toISOString()
  }));

  res.json({ ok: true, clinicId, entity, record });
});

app.delete('/api/data/:clinicId/:entity/:id', requireClinicAccess, (req, res) => {
  const clinicId = String(req.params.clinicId);
  const entity = String(req.params.entity);
  const id = String(req.params.id);
  if (!VALID_ENTITIES.includes(entity)) return res.status(400).json({ error: 'Entidade invalida' });

  const operationId = req.headers['x-operation-id'] as string || req.query?.operationId as string;
  if (operationId && isOperationProcessed(operationId)) {
    return res.json({ ok: true, clinicId, entity, deletedId: id, alreadyProcessed: true });
  }

  writeTombstone(clinicId, entity, id);

  const list = readData(clinicId, entity).filter((r: any) => r.id !== id);
  writeData(clinicId, entity, list);
  if (operationId) markOperationProcessed(operationId, entity);

  broadcastToClinic(clinicId, JSON.stringify({ type: 'server_data_updated', clinicId, entity, data: list, updatedAt: new Date().toISOString() }));

  const deleteType = entity === 'appointments' ? 'APPOINTMENT_CANCELLED' : `${entity.toUpperCase()}_DELETED`;
  broadcastToClinic(clinicId, JSON.stringify({
    type: deleteType,
    clinicId,
    entity,
    entityId: id,
    operationId: operationId || null,
    timestamp: new Date().toISOString()
  }));

  res.json({ ok: true, clinicId, entity, deletedId: id, tombstone: true });
});

// Endpoint de Sincronização Incremental (Delta Sync)
app.get('/api/sync/delta/:clinicId', requireClinicAccess, (req, res) => {
  const clinicId = String(req.params.clinicId);
  const sinceParam = req.query.since as string;
  const sinceTime = sinceParam ? new Date(sinceParam).getTime() : 0;

  const delta: Record<string, any[]> = {};
  const tombstonesMap: Record<string, Record<string, string>> = {};

  for (const entity of VALID_ENTITIES) {
    const list = readData(clinicId, entity);
    const tombstones = readTombstones(clinicId, entity);

    if (sinceTime > 0) {
      // Filtrar registros atualizados/criados após o timestamp
      // Resiliente a campos variados de data (updatedAt, createdAt, date, issuedAt, timestamp)
      const filtered = list.filter((r: any) => {
        const itemDateStr = r.updatedAt || r.createdAt || r.date || r.issuedAt || r.timestamp;
        const itemTime = itemDateStr ? new Date(itemDateStr).getTime() : 0;
        return itemTime > sinceTime;
      });
      delta[entity] = filtered;

      // Filtrar tombstones gerados após o timestamp
      const filteredTombstones: Record<string, string> = {};
      for (const [id, deletedAt] of Object.entries(tombstones)) {
        if (new Date(deletedAt).getTime() > sinceTime) {
          filteredTombstones[id] = deletedAt;
        }
      }
      tombstonesMap[entity] = filteredTombstones;
    } else {
      delta[entity] = list;
      tombstonesMap[entity] = tombstones;
    }
  }

  res.json({
    ok: true,
    clinicId,
    since: sinceParam || null,
    syncedAt: new Date().toISOString(),
    delta,
    tombstones: tombstonesMap
  });
});

// Endpoint de Status de Backup e Recuperação
app.get('/api/backup/:clinicId', requireClinicAccess, (req, res) => {
  const clinicId = String(req.params.clinicId);
  const clinicBackupDir = path.join(backupsBaseDir, clinicId);
  if (!fs.existsSync(clinicBackupDir)) return res.json({ backups: [] });
  const backups = fs.readdirSync(clinicBackupDir)
    .filter(d => fs.statSync(path.join(clinicBackupDir, d)).isDirectory())
    .map(name => ({
      name,
      createdAt: fs.statSync(path.join(clinicBackupDir, name)).birthtime
    }));
  res.json({ ok: true, clinicId, backups });
});

app.post('/api/backup/:clinicId/create', requireClinicAccess, (req, res) => {
  const clinicId = String(req.params.clinicId);
  const sessionUser = (req as any).sessionUser;
  if (!sessionUser || (sessionUser.role !== 'superadmin' && sessionUser.role !== 'admin')) {
    return res.status(403).json({ error: 'Criação de backup exige perfil de administrador.' });
  }
  createServerBackup(clinicId, 'manual');
  res.json({ ok: true, clinicId, message: 'Backup criado com sucesso.' });
});

app.post('/api/backup/:clinicId/restore', requireClinicAccess, (req, res) => {
  const clinicId = String(req.params.clinicId);
  const { backupName } = req.body || {};
  if (!backupName) {
    return res.status(400).json({ error: 'backupName é obrigatório.' });
  }

  // SEGURANÇA: Restauração de backup exige perfil de superadmin (operação destrutiva irreversível)
  const sessionUser = (req as any).sessionUser;
  if (!sessionUser || (sessionUser.role !== 'superadmin' && sessionUser.role !== 'admin')) {
    return res.status(403).json({ error: 'Restauração de backup exige permissão de administrador.' });
  }

  const clinicBackupDir = path.join(backupsBaseDir, clinicId);
  const targetBackupFolder = path.join(clinicBackupDir, path.basename(backupName));

  if (!fs.existsSync(targetBackupFolder) || !fs.statSync(targetBackupFolder).isDirectory()) {
    return res.status(404).json({ error: 'Backup não encontrado.' });
  }

  const clinicDir = path.join(dataDir, clinicId);
  if (!fs.existsSync(clinicDir)) fs.mkdirSync(clinicDir, { recursive: true });

  // 1. Cria um snapshot de segurança antes de restaurar
  createServerBackup(clinicId, 'pre_restore_safety');

  // 2. Restaura todos os arquivos JSON do backup
  const files = fs.readdirSync(targetBackupFolder).filter(f => f.endsWith('.json'));
  for (const f of files) {
    fs.copyFileSync(path.join(targetBackupFolder, f), path.join(clinicDir, f));
  }

  console.log(`[Backup] Restauração concluída para a clínica ${clinicId} a partir de ${backupName} (${files.length} arquivos) por ${sessionUser.username}`);
  broadcastToClinic(clinicId, JSON.stringify({ type: 'server_data_restored', clinicId, backupName, timestamp: new Date().toISOString() }));
  res.json({ ok: true, clinicId, restoredBackup: backupName, filesCount: files.length });
});

app.get('/health', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: 'ok',
    version: '2.2.0',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    websocket: {
      connectedDevicesCount: connectedDevices.size,
      tvsCount: Array.from(connectedDevices.values()).filter(d => d.type === 'tv').length,
      clinicalCount: Array.from(connectedDevices.values()).filter(d => d.type === 'clinical').length
    },
    memory: {
      rssMB: Math.round(mem.rss / 1024 / 1024),
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024)
    },
    storage: {
      dataDirReady: fs.existsSync(dataDir),
      backupsDirReady: fs.existsSync(backupsBaseDir)
    }
  });
});

// OBSERVABILIDADE MÍNIMA AUTENTICADA: Métricas operacionais para administradores
app.get('/api/metrics', (req, res) => {
  const session = verifyAuthToken(req);
  if (!session || (session.role !== 'superadmin' && session.role !== 'admin')) {
    return res.status(403).json({ error: 'Acesso às métricas do sistema restrito a administradores.' });
  }

  const mem = process.memoryUsage();
  const devices = Array.from(connectedDevices.values()).map(d => ({
    id: d.id,
    type: d.type,
    clinicId: d.clinicId || 'unassigned',
    room: d.room || 'unassigned',
    ip: d.ip
  }));

  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    server: {
      status: 'online',
      nodeVersion: process.version,
      memoryRssMB: Math.round(mem.rss / 1024 / 1024),
      memoryHeapMB: Math.round(mem.heapUsed / 1024 / 1024)
    },
    security: {
      revokedTokensCount: revokedTokens.size
    },
    lanWebSocket: {
      totalConnected: connectedDevices.size,
      devices
    }
  });
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
      <a href="/controle/"><span>Controle Remoto (Celular)</span><span class="arrow">&#8594;</span></a>
    </div>
    <div class="info">
      Servidor v2.2 • API /api/data • WebSocket LAN & Celular ativo
    </div>
  </div>
</body>
</html>`;
app.get('/', (req, res) => { res.send(PORTAL_HTML); });

app.get('*', (req, res) => {
  const indexPath = path.join(tvDistPath, 'index.html');
  fs.existsSync(indexPath) ? res.sendFile(indexPath) : res.redirect('/');
});

function getLocalNetworkIp(): string {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          if (!iface.address.startsWith('169.254.')) {
            return iface.address;
          }
        }
      }
    }
  } catch {}
  return 'localhost';
}

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  const hostIp = getLocalNetworkIp();
  server.listen(PORT_DEFAULT, () => {
    console.log('OPTOTIPO MEIRELLES v2.2 - SERVIDOR LAN + API DADOS');
    console.log(`Portal: http://${hostIp}:${PORT_DEFAULT}`);
    console.log(`API: http://${hostIp}:${PORT_DEFAULT}/api/data`);
    console.log('Dados: ' + dataDir);
  });

  try {
    const httpDirectServer = createServer(app);
    httpDirectServer.listen(PORT_HTTP, () => { console.log(`Porta 80: http://${hostIp}/`); });
    httpDirectServer.on('error', () => { console.log('(Porta 80 indisponivel)'); });
  } catch {}
}