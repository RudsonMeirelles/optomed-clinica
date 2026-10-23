/**
 * OPTOMED — MÓDULO DE MATEMÁTICA E REGRAS REFRATIVAS
 * Precisão matemática determinística, normalização clínica e suporte a equipamentos.
 */

import { EyeRefractionValues } from '../clinical/types';

/**
 * Normaliza um valor de ponto flutuante para evitar anomalias de precisão (ex: -0.2499999 -> -0.25).
 * Trata -0 como +0.
 */
export function roundToStep(val: number, decimals: number = 2): number {
  if (isNaN(val) || !isFinite(val)) return 0;
  const factor = Math.pow(10, decimals);
  const rounded = Math.round(val * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/**
 * Normaliza valores de dioptria esférica, cilíndrica ou adição.
 * Trata null, undefined, NaN, Infinity e preserva números válidos.
 */
export function normalizeDiopter(val?: number | null): number | undefined {
  if (val === undefined || val === null) return undefined;
  if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) return undefined;
  return roundToStep(val, 2);
}

/**
 * Normaliza o eixo refracional no intervalo convencional de 1° a 180° (ou 0° a 180°).
 * Por convenção clínica oftálmica internacional:
 * 0° é equivalente a 180°.
 * Valores fora de faixa (ex: -10°, 185°, 270°) são transladados deterministicamente via módulo 180.
 */
export function normalizeAxis(axis?: number | null): number | undefined {
  if (axis === undefined || axis === null) return undefined;
  if (typeof axis !== 'number' || isNaN(axis) || !isFinite(axis)) return undefined;
  
  let rounded = Math.round(axis);
  let normalized = ((rounded % 180) + 180) % 180;
  return normalized === 0 ? 180 : normalized;
}

/**
 * Calcula o Equivalente Esférico (Spherical Equivalent - SE):
 * SE = Esfera + (Cilindro / 2)
 *
 * Retorna null se nem a esfera nem o cilindro forem fornecidos.
 */
export function calculateSphericalEquivalent(sphere?: number | null, cylinder?: number | null): number | null {
  if ((sphere === undefined || sphere === null) && (cylinder === undefined || cylinder === null)) {
    return null;
  }

  const sph = normalizeDiopter(sphere) ?? 0;
  const cyl = normalizeDiopter(cylinder) ?? 0;

  const se = sph + (cyl / 2);
  return roundToStep(se, 2);
}

/**
 * Realiza a Transposição Esferocilíndrica (+ <-> -):
 * 1. Esfera' = Esfera + Cilindro
 * 2. Cilindro' = -Cilindro
 * 3. Eixo' = (Eixo +- 90°) normalizado para 1°–180°
 *
 * Se não houver cilindro (cilindro == 0 ou undefined), mantém os valores originais.
 */
export function transposeRefraction(refraction: EyeRefractionValues): EyeRefractionValues {
  const sph = normalizeDiopter(refraction.sphere) ?? 0;
  const cyl = normalizeDiopter(refraction.cylinder) ?? 0;
  const axis = normalizeAxis(refraction.axis) ?? 180;

  if (cyl === 0) {
    return {
      ...refraction,
      sphere: sph,
      cylinder: 0,
      axis: axis
    };
  }

  const newSphere = roundToStep(sph + cyl, 2);
  const newCylinder = roundToStep(-cyl, 2);
  
  // Eixo +- 90° normalizado
  let newAxis = (axis + 90) % 180;
  if (newAxis === 0) newAxis = 180;

  return {
    ...refraction,
    sphere: newSphere,
    cylinder: newCylinder,
    axis: newAxis
  };
}

/**
 * Formata um valor de dioptria para exibição clínica.
 * Ex: +1.25, -2.50, Plano, 0.00.
 */
export function formatDiopter(
  val?: number | null, 
  options: { showPlus?: boolean; zeroAsPlano?: boolean; precision?: number } = {}
): string {
  const { showPlus = true, zeroAsPlano = false, precision = 2 } = options;
  if (val === undefined || val === null || isNaN(val)) return '';
  
  const normalized = roundToStep(val, precision);
  if (normalized === 0) {
    return zeroAsPlano ? 'Plano' : (0).toFixed(precision);
  }

  if (normalized > 0) {
    return showPlus ? '+' + normalized.toFixed(precision) : normalized.toFixed(precision);
  }

  return normalized.toFixed(precision);
}

/**
 * Formatação clínica completa de uma refração ocular.
 * Ex: "+1.00 -0.50 x 180° (SE: +0.75)" ou "Plano"
 */
export function formatRefractionString(
  ref?: EyeRefractionValues | null,
  options: { showSE?: boolean; showVA?: boolean } = {}
): string {
  if (!ref) return '—';

  const sphStr = formatDiopter(ref.sphere, { showPlus: true, zeroAsPlano: true });
  const hasCyl = ref.cylinder !== undefined && ref.cylinder !== null && ref.cylinder !== 0;
  
  let parts = [sphStr || 'Plano'];

  if (hasCyl) {
    const cylStr = formatDiopter(ref.cylinder, { showPlus: true, zeroAsPlano: false });
    const ax = normalizeAxis(ref.axis) ?? 180;
    parts.push(cylStr + ' x ' + ax + '°');
  }

  if (ref.prism && ref.prism > 0) {
    const baseStr = ref.prismBase ? ' Base ' + ref.prismBase.toUpperCase() : '';
    parts.push(ref.prism.toFixed(2) + 'Δ' + baseStr);
  }

  let text = parts.join(' ');

  if (options.showSE) {
    const se = calculateSphericalEquivalent(ref.sphere, ref.cylinder);
    if (se !== null) {
      text += ' (SE: ' + formatDiopter(se, { showPlus: true }) + ')';
    }
  }

  if (options.showVA && ref.visualAcuity) {
    text += ' [AV: ' + ref.visualAcuity + ']';
  }

  return text;
}

/**
 * Validação rigorosa dos valores refrativos.
 */
export interface RefractionValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateRefractionValues(ref: EyeRefractionValues): RefractionValidationResult {
  const errors: string[] = [];

  // Validação da Esfera (-35.00 a +35.00 D)
  if (ref.sphere !== undefined && ref.sphere !== null) {
    if (isNaN(ref.sphere) || !isFinite(ref.sphere)) {
      errors.push('Esfera contém valor numérico inválido (NaN/Infinity).');
    } else if (Math.abs(ref.sphere) > 35) {
      errors.push('Esfera fora do limite clínico seguro (-35D a +35D): ' + ref.sphere);
    }
  }

  // Validação do Cilindro (-15.00 a +15.00 D)
  if (ref.cylinder !== undefined && ref.cylinder !== null) {
    if (isNaN(ref.cylinder) || !isFinite(ref.cylinder)) {
      errors.push('Cilindro contém valor numérico inválido (NaN/Infinity).');
    } else if (Math.abs(ref.cylinder) > 15) {
      errors.push('Cilindro fora do limite clínico seguro (-15D a +15D): ' + ref.cylinder);
    }
  }

  // Validação do Eixo (0° a 180°)
  if (ref.axis !== undefined && ref.axis !== null) {
    if (isNaN(ref.axis) || !isFinite(ref.axis)) {
      errors.push('Eixo contém valor numérico inválido.');
    } else if (ref.axis < 0 || ref.axis > 180) {
      errors.push('Eixo convencional deve estar entre 0° e 180°: fornecido ' + ref.axis + '°');
    }
  }

  // Validação da Adição (0.00 a +6.00 D)
  if (ref.addition !== undefined && ref.addition !== null) {
    if (isNaN(ref.addition) || !isFinite(ref.addition)) {
      errors.push('Adição contém valor numérico inválido.');
    } else if (ref.addition < 0 || ref.addition > 6.0) {
      errors.push('Adição fora da faixa clínica padrão (0.00D a +6.00D): ' + ref.addition);
    }
  }

  // Validação do Prisma
  if (ref.prism !== undefined && ref.prism !== null) {
    if (isNaN(ref.prism) || !isFinite(ref.prism) || ref.prism < 0) {
      errors.push('Prisma deve ser um valor positivo.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Comparação paramétrica neutra entre duas medições refrativas.
 */
export function compareRefractionValues(
  base: EyeRefractionValues, 
  target: EyeRefractionValues
): {
  deltaSphere: number;
  deltaCylinder: number;
  deltaAxis: number;
  deltaSE: number;
} {
  const bSph = normalizeDiopter(base.sphere) ?? 0;
  const tSph = normalizeDiopter(target.sphere) ?? 0;

  const bCyl = normalizeDiopter(base.cylinder) ?? 0;
  const tCyl = normalizeDiopter(target.cylinder) ?? 0;

  const bAxis = normalizeAxis(base.axis) ?? 180;
  const tAxis = normalizeAxis(target.axis) ?? 180;

  const bSE = calculateSphericalEquivalent(base.sphere, base.cylinder) ?? 0;
  const tSE = calculateSphericalEquivalent(target.sphere, target.cylinder) ?? 0;

  // Cálculo da menor diferença angular em eixo circular (180°)
  let axisDiff = Math.abs(tAxis - bAxis);
  if (axisDiff > 90) {
    axisDiff = 180 - axisDiff;
  }

  return {
    deltaSphere: roundToStep(tSph - bSph, 2),
    deltaCylinder: roundToStep(tCyl - bCyl, 2),
    deltaAxis: axisDiff,
    deltaSE: roundToStep(tSE - bSE, 2)
  };
}
