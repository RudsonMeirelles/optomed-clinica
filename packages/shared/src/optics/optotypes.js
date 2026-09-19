/**
 * OPTOTIPO MEIRELLES - DEFINIÇÕES GEOMÉTRICAS DE OPTOTIPOS
 * Proporções 5x5 estritas para Tumbling E, Landolt C, Sloan e Pediátrico
 */
export const SLOAN_LETTERS = ['C', 'D', 'E', 'F', 'H', 'K', 'N', 'P', 'R', 'V', 'Z'];
export const NUMBERS = ['2', '3', '4', '5', '6', '7', '8', '9'];
export const PEDIATRIC_SYMBOLS = ['house', 'apple', 'circle', 'square', 'star', 'fish'];
/**
 * Função para gerar orientações aleatórias de Tumbling E
 */
export function getRandomTumblingE(count = 5) {
    const orientations = [0, 90, 180, 270];
    const result = [];
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
export function getRandomLandoltC(count = 5, positions = 4) {
    const orientations = positions === 4
        ? [0, 90, 180, 270]
        : [0, 45, 90, 135, 180, 225, 270, 315];
    const result = [];
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
export function getRandomSloan(count = 5) {
    const shuffled = [...SLOAN_LETTERS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}
/**
 * Função para gerar números aleatórios
 */
export function getRandomNumbers(count = 5) {
    const result = [];
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
export function getRandomPediatric(count = 4) {
    const result = [];
    while (result.length < count) {
        const candidate = PEDIATRIC_SYMBOLS[Math.floor(Math.random() * PEDIATRIC_SYMBOLS.length)];
        if (result.length === 0 || result[result.length - 1] !== candidate) {
            result.push(candidate);
        }
    }
    return result;
}
//# sourceMappingURL=optotypes.js.map