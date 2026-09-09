/**
 * OPTOTIPO MEIRELLES - CÁLCULOS DE ACUIDADE VISUAL E GEOMETRIA ÓPTICA
 * Especificação v2.0 - Alta Precisão Clínica
 */

export interface AcuityLevel {
  id: string;
  snellen20: string; // ex: "20/200", "20/20"
  snellen6: string;  // ex: "6/60", "6/6"
  decimal: number;   // ex: 0.1, 1.0
  logMAR: number;    // ex: 1.0, 0.0
  marMinutes: number;// ex: 10.0, 1.0 (Min of Arc para o traço/detalhe de 1')
  relativeScale: number; // multiplicador em relação ao 20/20 (ex: 20/200 = 10.0, 20/20 = 1.0, 20/10 = 0.5)
}

/**
 * Tabela padrão de níveis de Acuidade Visual (Passos logMAR padrão de 0.1)
 */
export const STANDARD_ACUITY_LEVELS: AcuityLevel[] = [
  { id: '20_400', snellen20: '20/400', snellen6: '6/120', decimal: 0.05, logMAR: 1.30, marMinutes: 20.0, relativeScale: 20.0 },
  { id: '20_300', snellen20: '20/300', snellen6: '6/90',  decimal: 0.067, logMAR: 1.18, marMinutes: 15.0, relativeScale: 15.0 },
  { id: '20_200', snellen20: '20/200', snellen6: '6/60',  decimal: 0.10, logMAR: 1.00, marMinutes: 10.0, relativeScale: 10.0 },
  { id: '20_160', snellen20: '20/160', snellen6: '6/48',  decimal: 0.125, logMAR: 0.90, marMinutes: 8.0, relativeScale: 8.0 },
  { id: '20_125', snellen20: '20/125', snellen6: '6/38',  decimal: 0.16, logMAR: 0.80, marMinutes: 6.25, relativeScale: 6.25 },
  { id: '20_100', snellen20: '20/100', snellen6: '6/30',  decimal: 0.20, logMAR: 0.70, marMinutes: 5.0, relativeScale: 5.0 },
  { id: '20_80',  snellen20: '20/80',  snellen6: '6/24',  decimal: 0.25, logMAR: 0.60, marMinutes: 4.0, relativeScale: 4.0 },
  { id: '20_63',  snellen20: '20/63',  snellen6: '6/19',  decimal: 0.32, logMAR: 0.50, marMinutes: 3.16, relativeScale: 3.16 },
  { id: '20_50',  snellen20: '20/50',  snellen6: '6/15',  decimal: 0.40, logMAR: 0.40, marMinutes: 2.5, relativeScale: 2.5 },
  { id: '20_40',  snellen20: '20/40',  snellen6: '6/12',  decimal: 0.50, logMAR: 0.30, marMinutes: 2.0, relativeScale: 2.0 },
  { id: '20_32',  snellen20: '20/32',  snellen6: '6/9.5', decimal: 0.63, logMAR: 0.20, marMinutes: 1.58, relativeScale: 1.58 },
  { id: '20_25',  snellen20: '20/25',  snellen6: '6/7.5', decimal: 0.80, logMAR: 0.10, marMinutes: 1.25, relativeScale: 1.25 },
  { id: '20_20',  snellen20: '20/20',  snellen6: '6/6',   decimal: 1.00, logMAR: 0.00, marMinutes: 1.0, relativeScale: 1.0 },
  { id: '20_16',  snellen20: '20/16',  snellen6: '6/4.8', decimal: 1.25, logMAR: -0.10, marMinutes: 0.8, relativeScale: 0.8 },
  { id: '20_12_5',snellen20: '20/12.5', snellen6: '6/3.8', decimal: 1.60, logMAR: -0.20, marMinutes: 0.625, relativeScale: 0.625 },
  { id: '20_10',  snellen20: '20/10',  snellen6: '6/3',   decimal: 2.00, logMAR: -0.30, marMinutes: 0.5, relativeScale: 0.5 },
];

/**
 * Calcula a altura física exata do optotipo 20/20 (em milímetros) para uma dada distância (em metros).
 * Fórmula trigonométrica baseada no ângulo visual de 5 minutos de arco:
 * H = 2 * D * tan(5' / 2) = 2 * (distMeters * 1000) * tan((5 / 60) * (PI / 180) / 2)
 * 
 * @param distanceMeters Distância do olho à tela em metros (ex: 3.0, 4.0, 6.0)
 * @returns Altura física total do optotipo 20/20 em milímetros (mm)
 */
export function calculate2020PhysicalHeightMm(distanceMeters: number): number {
  const distanceMm = distanceMeters * 1000;
  // 5 minutos de arco em radianos: (5 / 60) * (Math.PI / 180)
  const fiveMinRad = (5 / 60) * (Math.PI / 180);
  return 2 * distanceMm * Math.tan(fiveMinRad / 2);
}

/**
 * Calcula a altura física (em mm) para um nível de acuidade específico e distância dada.
 * 
 * @param relativeScale Multiplicador relativo ao 20/20 (ex: 20/40 = 2.0, 20/200 = 10.0)
 * @param distanceMeters Distância em metros
 * @returns Altura do optotipo em mm
 */
export function calculateOptotypeHeightMm(relativeScale: number, distanceMeters: number): number {
  const base2020Mm = calculate2020PhysicalHeightMm(distanceMeters);
  return base2020Mm * relativeScale;
}

/**
 * Converte altura física em milímetros (mm) para pixels (px) da tela
 * baseado no fator de calibração física da tela.
 * 
 * @param heightMm Altura do elemento em mm
 * @param pixelsPerMm Fator de calibração (pixels por milímetro na tela atual)
 * @returns Tamanho em pixels (px)
 */
export function mmToPixels(heightMm: number, pixelsPerMm: number): number {
  return heightMm * pixelsPerMm;
}

/**
 * Converte notações de acuidade visual
 */
export function convertAcuity(value: number, from: 'decimal' | 'logMAR'): AcuityLevel {
  let decimal = 1.0;
  let logMAR = 0.0;
  
  if (from === 'decimal') {
    decimal = Math.max(0.01, value);
    logMAR = -Math.log10(decimal);
    if (Object.is(logMAR, -0) || Math.abs(logMAR) < 1e-10) logMAR = 0;
  } else {
    logMAR = value;
    if (Object.is(logMAR, -0) || Math.abs(logMAR) < 1e-10) logMAR = 0;
    decimal = Math.pow(10, -logMAR);
  }
  
  const snellenDenom = Math.round(20 / decimal);
  const snellen6Denom = Math.round((6 / decimal) * 10) / 10;
  const relativeScale = 1 / decimal;
  const marMinutes = relativeScale;

  const roundedLogMar = Math.round(logMAR * 100) / 100;

  return {
    id: `custom_${decimal.toFixed(2)}`,
    snellen20: `20/${snellenDenom}`,
    snellen6: `6/${snellen6Denom}`,
    decimal: Math.round(decimal * 1000) / 1000,
    logMAR: Object.is(roundedLogMar, -0) ? 0 : roundedLogMar,
    marMinutes: Math.round(marMinutes * 100) / 100,
    relativeScale
  };
}
