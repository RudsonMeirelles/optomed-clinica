/**
 * Optomed Security Service
 * Utiliza Web Crypto API nativa do navegador (PBKDF2, SHA-256, Salt criptografico).
 * 100% Offline-First, sem dependencias externas.
 */

const PBKDF2_ITERATIONS = 100000;
const HASH_ALGO = 'SHA-256';
const KEY_LEN_BYTES = 32; // 256 bits

export class SecurityService {
  /**
   * Converte ArrayBuffer para string hexadecimal
   */
  private static bufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Converte string hexadecimal para Uint8Array com ArrayBuffer proprio
   */
  private static hexToBytes(hex: string): Uint8Array {
    const len = hex.length / 2;
    const arrayBuffer = new ArrayBuffer(len);
    const bytes = new Uint8Array(arrayBuffer);
    for (let i = 0; i < len; i++) {
      bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }

  /**
   * Gera um salt criptografico aleatorio em hex
   */
  public static generateSalt(length = 16): string {
    const arrayBuffer = new ArrayBuffer(length);
    const bytes = new Uint8Array(arrayBuffer);
    crypto.getRandomValues(bytes);
    return this.bufferToHex(arrayBuffer);
  }

  /**
   * Deriva um hash seguro usando PBKDF2 com SHA-256 e 100.000 iteracoes.
   * Retorna no formato seguro: pbkdf2:<iterations>:<salt>:<derivedHex>
   */
  public static async hashPassword(password: string, saltHex?: string): Promise<string> {
    const salt = saltHex || this.generateSalt();
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);
    const saltBytes = this.hexToBytes(salt);

    const baseKey = await crypto.subtle.importKey(
      'raw',
      passwordBytes,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes.buffer as ArrayBuffer,
        iterations: PBKDF2_ITERATIONS,
        hash: HASH_ALGO
      },
      baseKey,
      KEY_LEN_BYTES * 8
    );

    const derivedHex = this.bufferToHex(derivedBits);
    return `pbkdf2:${PBKDF2_ITERATIONS}:${salt}:${derivedHex}`;
  }

  /**
   * Verifica uma senha contra um hash armazenado.
   * Suporta hashes no padrao PBKDF2 (pbkdf2:iterations:salt:derivedHex).
   * Compara em tempo constante para mitigar timing attacks.
   */
  public static async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    if (!storedHash || !password) return false;

    // Se estiver no formato PBKDF2
    if (storedHash.startsWith('pbkdf2:')) {
      const parts = storedHash.split(':');
      if (parts.length !== 4) return false;

      const iterations = parseInt(parts[1], 10);
      const saltHex = parts[2];
      const targetHashHex = parts[3];

      const encoder = new TextEncoder();
      const passwordBytes = encoder.encode(password);
      const saltBytes = this.hexToBytes(saltHex);

      const baseKey = await crypto.subtle.importKey(
        'raw',
        passwordBytes,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );

      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: saltBytes.buffer as ArrayBuffer,
          iterations,
          hash: HASH_ALGO
        },
        baseKey,
        KEY_LEN_BYTES * 8
      );

      const derivedHex = this.bufferToHex(derivedBits);
      return this.constantTimeCompare(derivedHex, targetHashHex);
    }

    return false;
  }

  /**
   * Compara duas strings em tempo constante para prevenir timing attacks
   */
  public static constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  /**
   * Gera um token de sessao seguro client-side
   */
  public static generateSessionToken(payload: Record<string, any>): string {
    const rawData = {
      ...payload,
      iat: Date.now(),
      exp: Date.now() + (24 * 60 * 60 * 1000), // 24 horas
      nonce: this.generateSalt(8)
    };
    const jsonStr = JSON.stringify(rawData);
    return btoa(unescape(encodeURIComponent(jsonStr)));
  }

  /**
   * Decodifica token de sessao
   */
  public static decodeSessionToken(token: string): Record<string, any> | null {
    try {
      const jsonStr = decodeURIComponent(escape(atob(token)));
      const decoded = JSON.parse(jsonStr);
      if (decoded.exp && Date.now() > decoded.exp) {
        return null; // Expirado
      }
      return decoded;
    } catch {
      return null;
    }
  }
}
