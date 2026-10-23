/**
 * OPTOMED — MÓDULO DE MATEMÁTICA E REGRAS REFRATIVAS
 * Precisão matemática determinística, normalização clínica e suporte a equipamentos.
 */
import { EyeRefractionValues } from '../clinical/types';
/**
 * Normaliza um valor de ponto flutuante para evitar anomalias de precisão (ex: -0.2499999 -> -0.25).
 * Trata -0 como +0.
 */
export declare function roundToStep(val: number, decimals?: number): number;
/**
 * Normaliza valores de dioptria esférica, cilíndrica ou adição.
 * Trata null, undefined, NaN, Infinity e preserva números válidos.
 */
export declare function normalizeDiopter(val?: number | null): number | undefined;
/**
 * Normaliza o eixo refracional no intervalo convencional de 1° a 180° (ou 0° a 180°).
 * Por convenção clínica oftálmica internacional:
 * 0° é equivalente a 180°.
 * Valores fora de faixa (ex: -10°, 185°, 270°) são transladados deterministicamente via módulo 180.
 */
export declare function normalizeAxis(axis?: number | null): number | undefined;
/**
 * Calcula o Equivalente Esférico (Spherical Equivalent - SE):
 * SE = Esfera + (Cilindro / 2)
 *
 * Retorna null se nem a esfera nem o cilindro forem fornecidos.
 */
export declare function calculateSphericalEquivalent(sphere?: number | null, cylinder?: number | null): number | null;
/**
 * Realiza a Transposição Esferocilíndrica (+ <-> -):
 * 1. Esfera' = Esfera + Cilindro
 * 2. Cilindro' = -Cilindro
 * 3. Eixo' = (Eixo +- 90°) normalizado para 1°–180°
 *
 * Se não houver cilindro (cilindro == 0 ou undefined), mantém os valores originais.
 */
export declare function transposeRefraction(refraction: EyeRefractionValues): EyeRefractionValues;
/**
 * Formata um valor de dioptria para exibição clínica.
 * Ex: +1.25, -2.50, Plano, 0.00.
 */
export declare function formatDiopter(val?: number | null, options?: {
    showPlus?: boolean;
    zeroAsPlano?: boolean;
    precision?: number;
}): string;
/**
 * Formatação clínica completa de uma refração ocular.
 * Ex: "+1.00 -0.50 x 180° (SE: +0.75)" ou "Plano"
 */
export declare function formatRefractionString(ref?: EyeRefractionValues | null, options?: {
    showSE?: boolean;
    showVA?: boolean;
}): string;
/**
 * Validação rigorosa dos valores refrativos.
 */
export interface RefractionValidationResult {
    isValid: boolean;
    errors: string[];
}
export declare function validateRefractionValues(ref: EyeRefractionValues): RefractionValidationResult;
/**
 * Comparação paramétrica neutra entre duas medições refrativas.
 */
export declare function compareRefractionValues(base: EyeRefractionValues, target: EyeRefractionValues): {
    deltaSphere: number;
    deltaCylinder: number;
    deltaAxis: number;
    deltaSE: number;
};
//# sourceMappingURL=refractionMath.d.ts.map