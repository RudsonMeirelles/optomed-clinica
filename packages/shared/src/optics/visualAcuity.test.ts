import { describe, it, expect } from 'vitest';
import { 
  calculate2020PhysicalHeightMm, 
  calculateOptotypeHeightMm, 
  mmToPixels,
  convertAcuity,
  STANDARD_ACUITY_LEVELS 
} from './visualAcuity';
import { calculatePixelsPerMm } from './calibration';

describe('Cálculos de Acuidade Visual e Óptica Geométrica', () => {
  it('deve calcular a altura física do optotipo 20/20 a 6 metros com precisão milimétrica (~8.7266 mm)', () => {
    const heightAt6m = calculate2020PhysicalHeightMm(6.0);
    // H = 2 * 6000 * tan(5'/2) ~= 8.7266 mm
    expect(heightAt6m).toBeCloseTo(8.7266, 3);
  });

  it('deve calcular a altura física do optotipo 20/20 a 3 metros (~4.3633 mm)', () => {
    const heightAt3m = calculate2020PhysicalHeightMm(3.0);
    expect(heightAt3m).toBeCloseTo(4.3633, 3);
  });

  it('deve calcular a altura proporcional do 20/200 como 10x o 20/20', () => {
    const height2020At3m = calculate2020PhysicalHeightMm(3.0);
    const height20200At3m = calculateOptotypeHeightMm(10.0, 3.0);
    expect(height20200At3m).toBeCloseTo(height2020At3m * 10.0, 4);
  });

  it('deve calcular a conversão física de mm para pixels a partir da barra de calibração de 100 mm', () => {
    // Se a barra de 100 mm tiver 400 pixels na tela
    const pxPerMm = calculatePixelsPerMm(400, 100, 1.0);
    expect(pxPerMm).toBe(4.0); // 4 pixels por mm

    const optotypeMm = calculate2020PhysicalHeightMm(3.0); // ~4.3633 mm
    const optotypePixels = mmToPixels(optotypeMm, pxPerMm);
    expect(optotypePixels).toBeCloseTo(17.453, 2);
  });

  it('deve converter valores de logMAR e Decimal corretamente', () => {
    const fromDecimal = convertAcuity(1.0, 'decimal');
    expect(fromDecimal.logMAR).toBe(0.0);
    expect(fromDecimal.snellen20).toBe('20/20');

    const fromLogMar = convertAcuity(1.0, 'logMAR');
    expect(fromLogMar.decimal).toBe(0.1);
    expect(fromLogMar.snellen20).toBe('20/200');
  });

  it('deve possuir a tabela de níveis padrão completa do 20/400 ao 20/10', () => {
    expect(STANDARD_ACUITY_LEVELS.length).toBeGreaterThanOrEqual(16);
    expect(STANDARD_ACUITY_LEVELS[0].snellen20).toBe('20/400');
    expect(STANDARD_ACUITY_LEVELS.find(l => l.snellen20 === '20/20')?.logMAR).toBe(0.0);
  });

  it('deve calcular corretamente a altura física para diferentes distâncias clínicas (2.0m a 6.0m)', () => {
    // Para 2.0m: H = 2 * 2000 * tan(5'/2) ~= 2.9089 mm
    const h2m = calculate2020PhysicalHeightMm(2.0);
    expect(h2m).toBeCloseTo(2.9089, 3);

    // Para 3.5m (padrão clínica): H = 2 * 3500 * tan(5'/2) ~= 5.0905 mm
    const h3_5m = calculate2020PhysicalHeightMm(3.5);
    expect(h3_5m).toBeCloseTo(5.0905, 3);

    // Para 4.0m: H = 2 * 4000 * tan(5'/2) ~= 5.8178 mm
    const h4m = calculate2020PhysicalHeightMm(4.0);
    expect(h4m).toBeCloseTo(5.8178, 3);

    // Para 6.0m (padrão ouro): H = 2 * 6000 * tan(5'/2) ~= 8.7266 mm
    const h6m = calculate2020PhysicalHeightMm(6.0);
    expect(h6m).toBeCloseTo(8.7266, 3);
  });

  it('deve calcular pixels precisos para resoluções 1080p (3.78 px/mm) e 1600x900 (3.15 px/mm) a 3.5 metros', () => {
    const h3_5m = calculate2020PhysicalHeightMm(3.5); // ~5.0905 mm

    // Full HD 1080p (barra de 100mm = 378px -> 3.78 px/mm)
    const ppm1080p = calculatePixelsPerMm(378, 100, 1.0);
    expect(ppm1080p).toBe(3.78);
    const px1080p = mmToPixels(h3_5m, ppm1080p);
    expect(px1080p).toBeCloseTo(19.24, 1);

    // HD+ 1600x900 (barra de 100mm = 315px -> 3.15 px/mm)
    const ppm900p = calculatePixelsPerMm(315, 100, 1.0);
    expect(ppm900p).toBe(3.15);
    const px900p = mmToPixels(h3_5m, ppm900p);
    expect(px900p).toBeCloseTo(16.03, 1);
  });
});
