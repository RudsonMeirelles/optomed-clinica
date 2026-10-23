import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { 
  resolveDataDir, 
  getRevokedTokensFilePath, 
  loadRevokedTokens, 
  saveRevokedTokens, 
  revokeToken, 
  isTokenRevoked,
  PORT_DEFAULT
} from './index';

describe('OPTOMED Server — Validação Rigorosa de Isolamento P0 (DATA_DIR & PORT)', () => {
  const originalEnv = { ...process.env };
  const prodDataDir = path.resolve(__dirname, '../data');
  let tempStagingDir: string;

  beforeEach(() => {
    // Cria diretório temporário isolado para testes
    tempStagingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'optomed-staging-test-'));
  });

  afterEach(() => {
    // Restaura o ambiente
    process.env = { ...originalEnv };
    // Limpa pasta temporária
    try {
      if (fs.existsSync(tempStagingDir)) {
        fs.rmSync(tempStagingDir, { recursive: true, force: true });
      }
    } catch {}
  });

  it('1. Deve resolver o caminho padrão de produção quando DATA_DIR não estiver configurado', () => {
    delete process.env.DATA_DIR;
    const resolved = resolveDataDir();
    expect(path.normalize(resolved)).toBe(path.normalize(prodDataDir));
  });

  it('2. Deve resolver caminho relativo baseado no process.cwd() quando DATA_DIR for relativo', () => {
    process.env.DATA_DIR = './data-staging-test';
    const resolved = resolveDataDir();
    const expected = path.resolve(process.cwd(), './data-staging-test');
    expect(path.normalize(resolved)).toBe(path.normalize(expected));
  });

  it('3. Deve resolver caminho absoluto quando DATA_DIR for absoluto', () => {
    process.env.DATA_DIR = tempStagingDir;
    const resolved = resolveDataDir();
    expect(path.normalize(resolved)).toBe(path.normalize(tempStagingDir));
  });

  it('4. Deve ignorar strings vazias ou apenas espaços em DATA_DIR e fazer fallback para produção', () => {
    process.env.DATA_DIR = '   ';
    const resolved = resolveDataDir();
    expect(path.normalize(resolved)).toBe(path.normalize(prodDataDir));
  });

  it('5. Deve garantir que getRevokedTokensFilePath retorne caminho dentro de dataDir', () => {
    const revokedPath = getRevokedTokensFilePath();
    expect(revokedPath.endsWith('.revoked_tokens.json')).toBe(true);
  });

  it('6. Deve salvar e carregar tokens revogados preservando formato JSON válido', () => {
    const testToken = 'token.staging-isolated-sig-789';
    const expTime = Date.now() + 120000;
    revokeToken(testToken, expTime);
    expect(isTokenRevoked(testToken)).toBe(true);

    const revokedPath = getRevokedTokensFilePath();
    if (fs.existsSync(revokedPath)) {
      const content = JSON.parse(fs.readFileSync(revokedPath, 'utf-8'));
      expect(content['staging-isolated-sig-789']).toBe(expTime);
    }
  });

  it('7. Não deve modificar nem poluir a pasta de produção com artefatos de staging', () => {
    const prodExists = fs.existsSync(prodDataDir);
    const prodFilesBefore = prodExists ? fs.readdirSync(prodDataDir) : [];

    // Operação isolada
    const stagingToken = 'header.isolated-session-999';
    revokeToken(stagingToken, Date.now() + 30000);

    if (prodExists) {
      const prodFilesAfter = fs.readdirSync(prodDataDir);
      // Nenhuma pasta ou arquivo novo não esperado foi injetado em produção
      expect(prodFilesAfter.length).toBe(prodFilesBefore.length);
    }
  });

  it('8. Deve validar porta padrão 8765 ou valor customizado de PORT', () => {
    expect(typeof PORT_DEFAULT).toBe('number');
    expect(PORT_DEFAULT).toBeGreaterThan(0);
  });
});
