/**
 * OPTOTIPO MEIRELLES - DEFINIÇÕES GEOMÉTRICAS DE OPTOTIPOS
 * Proporções 5x5 estritas para Tumbling E, Landolt C, Sloan e Pediátrico
 */
export type OptotypeType = 'tumbling_e' | 'landolt_c' | 'sloan' | 'numbers' | 'pediatric' | 'etdrs';
export type TumblingEOrientation = 0 | 90 | 180 | 270;
export type LandoltCOrientation = 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315;
export declare const SLOAN_LETTERS: readonly ["C", "D", "E", "F", "H", "K", "N", "P", "R", "V", "Z"];
export type SloanLetter = typeof SLOAN_LETTERS[number];
export declare const NUMBERS: readonly ["2", "3", "4", "5", "6", "7", "8", "9"];
export type NumberOptotype = typeof NUMBERS[number];
export declare const PEDIATRIC_SYMBOLS: readonly ["house", "apple", "circle", "square", "star", "fish"];
export type PediatricSymbol = typeof PEDIATRIC_SYMBOLS[number];
/**
 * Função para gerar orientações aleatórias de Tumbling E
 */
export declare function getRandomTumblingE(count?: number): TumblingEOrientation[];
/**
 * Função para gerar orientações aleatórias de Landolt C (4 ou 8 posições)
 */
export declare function getRandomLandoltC(count?: number, positions?: 4 | 8): LandoltCOrientation[];
/**
 * Função para gerar letras Sloan aleatórias sem repetição na mesma linha
 */
export declare function getRandomSloan(count?: number): SloanLetter[];
/**
 * Função para gerar números aleatórios
 */
export declare function getRandomNumbers(count?: number): NumberOptotype[];
/**
 * Função para gerar símbolos pediátricos aleatórios
 */
export declare function getRandomPediatric(count?: number): PediatricSymbol[];
//# sourceMappingURL=optotypes.d.ts.map