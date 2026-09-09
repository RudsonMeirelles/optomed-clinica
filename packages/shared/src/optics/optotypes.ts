/**
 * OPTOTIPO MEIRELLES - DEFINIÇÕES GEOMÉTRICAS DE OPTOTIPOS
 * Proporções 5x5 estritas para Tumbling E, Landolt C, Sloan e Pediátrico
 */

export type OptotypeType = 
  | 'tumbling_e' 
  | 'landolt_c' 
  | 'sloan' 
  | 'numbers' 
  | 'pediatric' 
  | 'etdrs';

export type TumblingEOrientation = 0 | 90 | 180 | 270; // 0=Direita, 90=Baixo, 180=Esquerda, 270=Cima
export type LandoltCOrientation = 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315;

export const SLOAN_LETTERS = ['C', 'D', 'E', 'F', 'H', 'K', 'N', 'P', 'R', 'V', 'Z'] as const;
export type SloanLetter = typeof SLOAN_LETTERS[number];

export const NUMBERS = ['2', '3', '4', '5', '6', '7', '8', '9'] as const;
export type NumberOptotype = typeof NUMBERS[number];

export const PEDIATRIC_SYMBOLS = ['house', 'apple', 'circle', 'square', 'star', 'fish'] as const;
export type PediatricSymbol = typeof PEDIATRIC_SYMBOLS[number];

/**
 * Função para gerar orientações aleatórias de Tumbling E
 */
export function getRandomTumblingE(count: number = 5): TumblingEOrientation[] {
  const orientations: TumblingEOrientation[] = [0, 90, 180, 270];
  const result: TumblingEOrientation[] = [];
  while (result.length < count) {
    const candidate = orientations[Math.floor(Math.random() * orientations.length)];
    if (result.length === 0 || result[result.length - 1] !== candidate) {
      result.push(candidate);
    }
  }
  return result;
}

/**
 * Função para gerar orientações aleatórias de Landolt C (4 ou 8 posições)
 */
export function getRandomLandoltC(count: number = 5, positions: 4 | 8 = 4): LandoltCOrientation[] {
  const orientations: LandoltCOrientation[] = positions === 4 
    ? [0, 90, 180, 270] 
    : [0, 45, 90, 135, 180, 225, 270, 315];
  const result: LandoltCOrientation[] = [];
  while (result.length < count) {
    const candidate = orientations[Math.floor(Math.random() * orientations.length)];
    if (result.length === 0 || result[result.length - 1] !== candidate) {
      result.push(candidate);
    }
  }
  return result;
}

/**
 * Função para gerar letras Sloan aleatórias sem repetição na mesma linha
 */
export function getRandomSloan(count: number = 5): SloanLetter[] {
  const shuffled = [...SLOAN_LETTERS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Função para gerar números aleatórios
 */
export function getRandomNumbers(count: number = 5): NumberOptotype[] {
  const result: NumberOptotype[] = [];
  while (result.length < count) {
    const candidate = NUMBERS[Math.floor(Math.random() * NUMBERS.length)];
    if (result.length === 0 || result[result.length - 1] !== candidate) {
      result.push(candidate);
    }
  }
  return result;
}

/**
 * Função para gerar símbolos pediátricos aleatórios
 */
export function getRandomPediatric(count: number = 4): PediatricSymbol[] {
  const result: PediatricSymbol[] = [];
  while (result.length < count) {
    const candidate = PEDIATRIC_SYMBOLS[Math.floor(Math.random() * PEDIATRIC_SYMBOLS.length)];
    if (result.length === 0 || result[result.length - 1] !== candidate) {
      result.push(candidate);
    }
  }
  return result;
}
