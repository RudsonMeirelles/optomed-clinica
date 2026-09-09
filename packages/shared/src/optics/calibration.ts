/**
 * OPTOTIPO MEIRELLES - CALIBRAÇÃO FÍSICA DA TELA
 * Especificação v2.0 - Requisito Crítico
 */

export interface DisplayCalibrationData {
  isCalibrated: boolean;
  referenceBarLengthMm: number; // Padrão 100 mm
  referenceBarPixels: number;   // Quantidade de pixels calibrada para a barra de 100mm
  pixelsPerMm: number;          // referenceBarPixels / referenceBarLengthMm
  displayScale: number;         // Multiplicador de escala fina
  calibratedAt: string | null;  // ISO timestamp
  defaultDistanceMeters: number;// Padrão (ex: 3.0m, 4.0m, 6.0m)
  screenWidthPx: number;
  screenHeightPx: number;
}

/**
 * Calibração padrão inicial (estimativa para 1080p típica ~96 DPI = ~3.78 px/mm)
 * Requer calibração real com régua de 100mm pelo examinador.
 */
export const DEFAULT_CALIBRATION: DisplayCalibrationData = {
  isCalibrated: false,
  referenceBarLengthMm: 100,
  referenceBarPixels: 378,
  pixelsPerMm: 3.78,
  displayScale: 1.0,
  calibratedAt: null,
  defaultDistanceMeters: 3.0,
  screenWidthPx: 1920,
  screenHeightPx: 1080
};

/**
 * Calcula o fator pixelsPerMm a partir do comprimento da barra em pixels
 */
export function calculatePixelsPerMm(barPixels: number, barLengthMm: number = 100, fineScale: number = 1.0): number {
  if (barLengthMm <= 0) return 3.78;
  return (barPixels / barLengthMm) * fineScale;
}
