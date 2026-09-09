import React, { useState, useEffect, useRef } from 'react';
import { SubjectiveRefraction, PatientAge } from '@optotipo/shared';
import { Glasses, Sparkles, RefreshCw, Eye, Layers, ShieldCheck, Star } from 'lucide-react';

interface RefractionDialsProps {
  refraction: SubjectiveRefraction;
  patientAge?: PatientAge | null;
  onChange: (updated: SubjectiveRefraction) => void;
}

export const RefractionDials: React.FC<RefractionDialsProps> = ({ 
  refraction, 
  patientAge,
  onChange 
}) => {
  const numToStr = (val: number | undefined): string => {
    if (val === undefined || val === null || isNaN(val) || val === 0) return '';
    return val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2);
  };

  const axisToStr = (val: number | undefined): string => {
    if (val === undefined || val === null || isNaN(val) || val === 0) return '';
    return String(val);
  };

  const [odSphere, setOdSphere] = useState<string>(() => numToStr(refraction.od?.sphere));
  const [odCylinder, setOdCylinder] = useState<string>(() => numToStr(refraction.od?.cylinder));
  const [odAxis, setOdAxis] = useState<string>(() => axisToStr(refraction.od?.axis));
  const [odVA, setOdVA] = useState<string>(() => refraction.od?.visualAcuity || '');

  const [oeSphere, setOeSphere] = useState<string>(() => numToStr(refraction.oe?.sphere));
  const [oeCylinder, setOeCylinder] = useState<string>(() => numToStr(refraction.oe?.cylinder));
  const [oeAxis, setOeAxis] = useState<string>(() => axisToStr(refraction.oe?.axis));
  const [oeVA, setOeVA] = useState<string>(() => refraction.oe?.visualAcuity || '');

  const [pdDistance, setPdDistance] = useState<string>(() => refraction.pdDistanceMm ? String(refraction.pdDistanceMm) : '');
  const [addition, setAddition] = useState<string>(() => numToStr(refraction.addition));

  // Lentes, Tratamentos e Lentes Especiais Prescritas
  const [lensType, setLensType] = useState<string>(() => refraction.lensType || 'multifocal');
  const [material, setMaterial] = useState<string>(() => refraction.material || 'resina');
  const [treatments, setTreatments] = useState<string[]>(() => refraction.treatments || ['Antirreflexo Digital', 'Filtro Luz Azul (BlueCut)']);
  const [specialLenses, setSpecialLenses] = useState<string>(() => refraction.specialLenses || '');

  const lastRefractionId = useRef<string>(refraction.id);

  useEffect(() => {
    if (refraction.id !== lastRefractionId.current) {
      lastRefractionId.current = refraction.id;
      setOdSphere(numToStr(refraction.od?.sphere));
      setOdCylinder(numToStr(refraction.od?.cylinder));
      setOdAxis(axisToStr(refraction.od?.axis));
      setOdVA(refraction.od?.visualAcuity || '');

      setOeSphere(numToStr(refraction.oe?.sphere));
      setOeCylinder(numToStr(refraction.oe?.cylinder));
      setOeAxis(axisToStr(refraction.oe?.axis));
      setOeVA(refraction.oe?.visualAcuity || '');

      setPdDistance(refraction.pdDistanceMm ? String(refraction.pdDistanceMm) : '');
      setAddition(numToStr(refraction.addition));

      setLensType(refraction.lensType || 'multifocal');
      setMaterial(refraction.material || 'resina');
      setTreatments(refraction.treatments || ['Antirreflexo Digital', 'Filtro Luz Azul (BlueCut)']);
      setSpecialLenses(refraction.specialLenses || '');
    }
  }, [refraction.id]);

  const parseVal = (str: string, isAxis: boolean = false): number => {
    if (!str || str.trim() === '' || str === '+' || str === '-') return 0;
    const cleaned = str.replace(',', '.').trim();
    const num = parseFloat(cleaned);
    if (isNaN(num)) return 0;
    if (isAxis) {
      let axis = Math.round(num);
      axis = ((axis % 180) + 180) % 180;
      return axis === 0 ? 180 : axis;
    }
    return Math.round(num * 100) / 100;
  };

  const emitUpdate = (
    sphOD = odSphere,
    cylOD = odCylinder,
    axOD = odAxis,
    vaOD = odVA,
    sphOE = oeSphere,
    cylOE = oeCylinder,
    axOE = oeAxis,
    vaOE = oeVA,
    pd = pdDistance,
    add = addition,
    lType = lensType,
    mat = material,
    treats = treatments,
    specLenses = specialLenses
  ) => {
    onChange({
      ...refraction,
      od: {
        ...refraction.od,
        sphere: parseVal(sphOD),
        cylinder: parseVal(cylOD),
        axis: parseVal(axOD, true),
        visualAcuity: vaOD
      },
      oe: {
        ...refraction.oe,
        sphere: parseVal(sphOE),
        cylinder: parseVal(cylOE),
        axis: parseVal(axOE, true),
        visualAcuity: vaOE
      },
      pdDistanceMm: parseVal(pd) || undefined,
      addition: parseVal(add) || undefined,
      lensType: lType,
      material: mat,
      treatments: treats,
      specialLenses: specLenses
    });
  };

  // Incremento / Decremento Rápido (Teclado, Mouse Wheel ou Botões de Toque)
  const stepValue = (valStr: string, delta: number, isAxis: boolean = false): string => {
    const current = parseVal(valStr, isAxis);
    if (isAxis) {
      let nextAxis = current + delta;
      nextAxis = ((nextAxis % 180) + 180) % 180;
      return String(nextAxis === 0 ? 180 : nextAxis);
    }
    const nextVal = current + delta;
    return numToStr(Math.round(nextVal * 100) / 100);
  };

  const handleWheelAdjust = (
    e: React.WheelEvent<HTMLInputElement>,
    currentVal: string,
    setter: (v: string) => void,
    deltaStep: number,
    isAxis: boolean = false,
    updateParamIndex: number = 0
  ) => {
    e.preventDefault();
    const direction = e.deltaY < 0 ? 1 : -1;
    const newVal = stepValue(currentVal, direction * deltaStep, isAxis);
    setter(newVal);
    if (updateParamIndex === 1) emitUpdate(newVal); // odSphere
    if (updateParamIndex === 2) emitUpdate(undefined, newVal); // odCylinder
    if (updateParamIndex === 3) emitUpdate(undefined, undefined, newVal); // odAxis
    if (updateParamIndex === 4) emitUpdate(undefined, undefined, undefined, undefined, newVal); // oeSphere
    if (updateParamIndex === 5) emitUpdate(undefined, undefined, undefined, undefined, undefined, newVal); // oeCylinder
    if (updateParamIndex === 6) emitUpdate(undefined, undefined, undefined, undefined, undefined, undefined, newVal); // oeAxis
  };

  const handleKeyDownAdjust = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentVal: string,
    setter: (v: string) => void,
    deltaStep: number,
    isAxis: boolean = false,
    updateParamIndex: number = 0
  ) => {
    if (e.key === 'ArrowUp' || e.key === '+' || e.key === '=') {
      e.preventDefault();
      const newVal = stepValue(currentVal, deltaStep, isAxis);
      setter(newVal);
      if (updateParamIndex === 1) emitUpdate(newVal);
      if (updateParamIndex === 2) emitUpdate(undefined, newVal);
      if (updateParamIndex === 3) emitUpdate(undefined, undefined, newVal);
      if (updateParamIndex === 4) emitUpdate(undefined, undefined, undefined, undefined, newVal);
      if (updateParamIndex === 5) emitUpdate(undefined, undefined, undefined, undefined, undefined, newVal);
      if (updateParamIndex === 6) emitUpdate(undefined, undefined, undefined, undefined, undefined, undefined, newVal);
    } else if (e.key === 'ArrowDown' || e.key === '-') {
      e.preventDefault();
      const newVal = stepValue(currentVal, -deltaStep, isAxis);
      setter(newVal);
      if (updateParamIndex === 1) emitUpdate(newVal);
      if (updateParamIndex === 2) emitUpdate(undefined, newVal);
      if (updateParamIndex === 3) emitUpdate(undefined, undefined, newVal);
      if (updateParamIndex === 4) emitUpdate(undefined, undefined, undefined, undefined, newVal);
      if (updateParamIndex === 5) emitUpdate(undefined, undefined, undefined, undefined, undefined, newVal);
      if (updateParamIndex === 6) emitUpdate(undefined, undefined, undefined, undefined, undefined, undefined, newVal);
    }
  };

  // Sugestão Inteligente de Adição
  const calculateSuggestedAddition = (years: number): number | null => {
    if (years < 39) return null;
    if (years >= 39 && years <= 42) return 1.00;
    if (years >= 43 && years <= 44) return 1.25;
    if (years >= 45 && years <= 46) return 1.50;
    if (years >= 47 && years <= 48) return 1.75;
    if (years >= 49 && years <= 51) return 2.00;
    if (years >= 52 && years <= 54) return 2.25;
    if (years >= 55 && years <= 58) return 2.50;
    if (years >= 59 && years <= 62) return 2.75;
    return 3.00;
  };

  const handleApplyAgeAddition = () => {
    if (!patientAge) return;
    const suggested = calculateSuggestedAddition(patientAge.years);
    if (suggested !== null) {
      const formatted = `+${suggested.toFixed(2)}`;
      setAddition(formatted);
      emitUpdate(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, formatted);
    }
  };

  // Transposição Óptica
  const handleTransposeCylinder = () => {
    const sphODNum = parseVal(odSphere);
    const cylODNum = parseVal(odCylinder);
    const axODNum = parseVal(odAxis, true);

    let newSphOD = odSphere;
    let newCylOD = odCylinder;
    let newAxOD = odAxis;

    if (cylODNum !== 0) {
      const transSph = sphODNum + cylODNum;
      const transCyl = -cylODNum;
      let transAx = (axODNum + 90) % 180;
      if (transAx === 0) transAx = 180;

      newSphOD = numToStr(transSph) || '0.00';
      newCylOD = numToStr(transCyl);
      newAxOD = String(transAx);
      setOdSphere(newSphOD);
      setOdCylinder(newCylOD);
      setOdAxis(newAxOD);
    }

    const sphOENum = parseVal(oeSphere);
    const cylOENum = parseVal(oeCylinder);
    const axOENum = parseVal(oeAxis, true);

    let newSphOE = oeSphere;
    let newCylOE = oeCylinder;
    let newAxOE = oeAxis;

    if (cylOENum !== 0) {
      const transSph = sphOENum + cylOENum;
      const transCyl = -cylOENum;
      let transAx = (axOENum + 90) % 180;
      if (transAx === 0) transAx = 180;

      newSphOE = numToStr(transSph) || '0.00';
      newCylOE = numToStr(transCyl);
      newAxOE = String(transAx);
      setOeSphere(newSphOE);
      setOeCylinder(newCylOE);
      setOeAxis(newAxOE);
    }

    emitUpdate(newSphOD, newCylOD, newAxOD, undefined, newSphOE, newCylOE, newAxOE);
  };

  const suggestedAdd = patientAge ? calculateSuggestedAddition(patientAge.years) : null;

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-xs p-5 space-y-4 select-none">
      
      {/* Cabeçalho do Greens Digital */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 rounded-2xl border border-blue-100/80 shadow-xs">
            <Glasses className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-xs tracking-wide uppercase">
              REFRAÇÃO SUBJETIVA DIGITAL
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">
              Digitação rápida com sinal (+ ou -)
            </span>
          </div>
        </div>

        {/* DP e Adição em Pílulas Modernas */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-2xl shadow-inner">
            <span className="font-extrabold text-slate-500 text-[10px] uppercase">DP:</span>
            <input
              type="text"
              value={pdDistance}
              onChange={(e) => {
                setPdDistance(e.target.value);
                emitUpdate(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, e.target.value);
              }}
              placeholder="62"
              className="w-10 bg-white border border-slate-300 rounded-xl px-1 py-0.5 font-mono text-center font-black text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
            <span className="text-slate-400 font-mono text-[10px]">mm</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-2xl shadow-inner">
            <span className="font-extrabold text-indigo-900 text-[10px] uppercase">Adição:</span>
            <input
              type="text"
              value={addition}
              onChange={(e) => {
                setAddition(e.target.value);
                emitUpdate(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, e.target.value);
              }}
              placeholder="+2.00"
              className="w-14 bg-white border border-slate-300 rounded-xl px-1 py-0.5 font-mono text-center font-black text-xs text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
            />
            <span className="text-indigo-400 font-mono text-[10px]">D</span>
          </div>
        </div>
      </div>

      {/* Ferramentas de Autonomia Clínica */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl">
        <button
          type="button"
          onClick={handleTransposeCylinder}
          className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300/80 rounded-xl text-[11px] font-bold text-slate-700 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
          title="Transpõe a refração entre cilindro positivo e negativo"
        >
          <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
          <span>Transpor Cilindro (+ ↔ -)</span>
        </button>

        {suggestedAdd !== null && (
          <button
            type="button"
            onClick={handleApplyAgeAddition}
            className="px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 border border-indigo-200 rounded-xl text-[11px] font-bold text-indigo-800 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            title={`Sugerir adição de +${suggestedAdd.toFixed(2)} D para ${patientAge?.years} anos`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Sugerir Adição: <b>+{suggestedAdd.toFixed(2)} D</b> ({patientAge?.years}a)</span>
          </button>
        )}
      </div>

      {/* ================= OLHO DIREITO (OD) ================= */}
      <div className="p-4 bg-emerald-50/50 border border-emerald-200/70 rounded-3xl space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="font-black text-emerald-950 text-xs flex items-center gap-2 tracking-wide">
            <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-200 shrink-0" />
            OLHO DIREITO (OD)
          </span>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-emerald-900 font-bold uppercase tracking-wider">AV:</span>
            <div className="flex items-center bg-white border border-emerald-300 rounded-xl px-1.5 py-0.5 shadow-xs focus-within:ring-2 focus-within:ring-emerald-500">
              <span className="text-[11px] font-mono font-black text-emerald-800 select-none">20/</span>
              <input
                type="text"
                value={odVA.startsWith('20/') ? odVA.replace(/^20\//, '') : odVA}
                onChange={(e) => {
                  let val = e.target.value.trim();
                  if (val.startsWith('20/')) val = val.replace(/^20\//, '');
                  const formatted = val ? `20/${val}` : '';
                  setOdVA(formatted);
                  emitUpdate(undefined, undefined, undefined, formatted);
                }}
                placeholder="20"
                className="w-8 bg-transparent text-xs font-mono font-black text-emerald-950 text-left focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Campos de Esférico, Cilindro e Eixo OD */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Esférico OD */}
          <div className="bg-white p-2.5 rounded-2xl border border-emerald-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              <span>Esférico</span>
              <span className="text-[9px] text-slate-400 font-mono">(D)</span>
            </div>

            <div className="relative flex items-center">
              <input
                type="text"
                value={odSphere}
                onChange={(e) => {
                  setOdSphere(e.target.value);
                  emitUpdate(e.target.value);
                }}
                onWheel={(e) => handleWheelAdjust(e, odSphere, setOdSphere, 0.25, false, 1)}
                onKeyDown={(e) => handleKeyDownAdjust(e, odSphere, setOdSphere, 0.25, false, 1)}
                placeholder="+ / - 0.00"
                title="Dica: Use a roda do mouse ou setas ↑/↓ para ajustar em passos de ±0.25 D"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-1 font-mono font-black text-sm text-center focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
              />
            </div>
          </div>

          {/* Cilíndrico OD */}
          <div className="bg-white p-2.5 rounded-2xl border border-emerald-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              <span>Cilindro</span>
              <span className="text-[9px] text-slate-400 font-mono">(D)</span>
            </div>

            <div className="relative flex items-center">
              <input
                type="text"
                value={odCylinder}
                onChange={(e) => {
                  setOdCylinder(e.target.value);
                  emitUpdate(undefined, e.target.value);
                }}
                onWheel={(e) => handleWheelAdjust(e, odCylinder, setOdCylinder, 0.25, false, 2)}
                onKeyDown={(e) => handleKeyDownAdjust(e, odCylinder, setOdCylinder, 0.25, false, 2)}
                placeholder="- 0.00"
                title="Dica: Use a roda do mouse ou setas ↑/↓ para ajustar em passos de ±0.25 D"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-1 font-mono font-black text-sm text-center focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
              />
            </div>
          </div>

          {/* Eixo OD */}
          <div className="bg-white p-2.5 rounded-2xl border border-emerald-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              <span>Eixo</span>
              <span className="text-[9px] text-slate-400 font-mono">(°)</span>
            </div>

            <div className="relative flex items-center">
              <input
                type="text"
                value={odAxis}
                onChange={(e) => {
                  setOdAxis(e.target.value);
                  emitUpdate(undefined, undefined, e.target.value);
                }}
                onWheel={(e) => handleWheelAdjust(e, odAxis, setOdAxis, 5, true, 3)}
                onKeyDown={(e) => handleKeyDownAdjust(e, odAxis, setOdAxis, 1, true, 3)}
                placeholder="180"
                title="Dica: Use a roda do mouse para saltos de 5° ou setas ↑/↓ para 1°"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-1 font-mono font-black text-sm text-center focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ================= OLHO ESQUERDO (OE) ================= */}
      <div className="p-4 bg-amber-50/50 border border-amber-200/70 rounded-3xl space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="font-black text-amber-950 text-xs flex items-center gap-2 tracking-wide">
            <span className="w-3 h-3 rounded-full bg-amber-500 ring-2 ring-amber-200 shrink-0" />
            OLHO ESQUERDO (OE / OI)
          </span>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-amber-900 font-bold uppercase tracking-wider">AV:</span>
            <div className="flex items-center bg-white border border-amber-300 rounded-xl px-1.5 py-0.5 shadow-xs focus-within:ring-2 focus-within:ring-amber-500">
              <span className="text-[11px] font-mono font-black text-amber-800 select-none">20/</span>
              <input
                type="text"
                value={oeVA.startsWith('20/') ? oeVA.replace(/^20\//, '') : oeVA}
                onChange={(e) => {
                  let val = e.target.value.trim();
                  if (val.startsWith('20/')) val = val.replace(/^20\//, '');
                  const formatted = val ? `20/${val}` : '';
                  setOeVA(formatted);
                  emitUpdate(undefined, undefined, undefined, undefined, undefined, undefined, undefined, formatted);
                }}
                placeholder="20"
                className="w-8 bg-transparent text-xs font-mono font-black text-amber-950 text-left focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Campos de Esférico, Cilindro e Eixo OE */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Esférico OE */}
          <div className="bg-white p-2.5 rounded-2xl border border-amber-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              <span>Esférico</span>
              <span className="text-[9px] text-slate-400 font-mono">(D)</span>
            </div>

            <div className="relative flex items-center">
              <input
                type="text"
                value={oeSphere}
                onChange={(e) => {
                  setOeSphere(e.target.value);
                  emitUpdate(undefined, undefined, undefined, undefined, e.target.value);
                }}
                onWheel={(e) => handleWheelAdjust(e, oeSphere, setOeSphere, 0.25, false, 4)}
                onKeyDown={(e) => handleKeyDownAdjust(e, oeSphere, setOeSphere, 0.25, false, 4)}
                placeholder="+ / - 0.00"
                title="Dica: Use a roda do mouse ou setas ↑/↓ para ajustar em passos de ±0.25 D"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-1 font-mono font-black text-sm text-center focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900"
              />
            </div>
          </div>

          {/* Cilíndrico OE */}
          <div className="bg-white p-2.5 rounded-2xl border border-amber-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              <span>Cilindro</span>
              <span className="text-[9px] text-slate-400 font-mono">(D)</span>
            </div>

            <div className="relative flex items-center">
              <input
                type="text"
                value={oeCylinder}
                onChange={(e) => {
                  setOeCylinder(e.target.value);
                  emitUpdate(undefined, undefined, undefined, undefined, undefined, e.target.value);
                }}
                onWheel={(e) => handleWheelAdjust(e, oeCylinder, setOeCylinder, 0.25, false, 5)}
                onKeyDown={(e) => handleKeyDownAdjust(e, oeCylinder, setOeCylinder, 0.25, false, 5)}
                placeholder="- 0.00"
                title="Dica: Use a roda do mouse ou setas ↑/↓ para ajustar em passos de ±0.25 D"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-1 font-mono font-black text-sm text-center focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900"
              />
            </div>
          </div>

          {/* Eixo OE */}
          <div className="bg-white p-2.5 rounded-2xl border border-amber-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              <span>Eixo</span>
              <span className="text-[9px] text-slate-400 font-mono">(°)</span>
            </div>

            <div className="relative flex items-center">
              <input
                type="text"
                value={oeAxis}
                onChange={(e) => {
                  setOeAxis(e.target.value);
                  emitUpdate(undefined, undefined, undefined, undefined, undefined, undefined, e.target.value);
                }}
                onWheel={(e) => handleWheelAdjust(e, oeAxis, setOeAxis, 5, true, 6)}
                onKeyDown={(e) => handleKeyDownAdjust(e, oeAxis, setOeAxis, 1, true, 6)}
                placeholder="180"
                title="Dica: Use a roda do mouse para saltos de 5° ou setas ↑/↓ para 1°"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-1 font-mono font-black text-sm text-center focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ================= PRESCRIÇÃO DE LENTES, TRATAMENTOS E LENTES ESPECIAIS ================= */}
      <div className="p-4 bg-slate-50/90 border border-slate-200/90 rounded-3xl space-y-3.5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
          <span className="font-black text-slate-900 text-xs flex items-center gap-2 tracking-wide uppercase">
            <Layers className="w-4 h-4 text-blue-600" />
            LENTES & TRATAMENTOS RECOMENDADOS (NOVA DIOPTRIA)
          </span>
          <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-bold">
            Direto na Receita
          </span>
        </div>

        {/* Tipo de Lente e Material */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-extrabold text-slate-600 block mb-1 uppercase tracking-wider">
              Tipo de Lente Prescrita
            </label>
            <select
              value={lensType}
              onChange={(e) => {
                const val = e.target.value;
                setLensType(val);
                emitUpdate(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, val);
              }}
              className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs cursor-pointer"
            >
              <option value="multifocal">Multifocal / Progressivo Digital</option>
              <option value="monofocal_longe">Monofocal (Visão de Longe)</option>
              <option value="monofocal_perto">Monofocal (Visão de Perto / Leitura)</option>
              <option value="bifocal">Bifocal (Topo Reto / Ultex)</option>
              <option value="ocupacional">Ocupacional (Intermediário & Perto)</option>
              <option value="contato">Lentes de Contato Gelatinosas</option>
              <option value="contato_rgp">Lentes RGP / Esclerais</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-slate-600 block mb-1 uppercase tracking-wider">
              Material da Lente
            </label>
            <select
              value={material}
              onChange={(e) => {
                const val = e.target.value;
                setMaterial(val);
                emitUpdate(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, val);
              }}
              className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs cursor-pointer"
            >
              <option value="resina">Resina Orgânica CR-39 (1.50)</option>
              <option value="policarbonato">Policarbonato Resistente (1.59)</option>
              <option value="trivex">Trivex HD / Alta Nitidez (1.53)</option>
              <option value="alto_indice_167">Alto Índice 1.67 (Leve & Fina)</option>
              <option value="alto_indice_174">Ultra Alto Índice 1.74 (Super Fina)</option>
              <option value="cristal">Cristal / Mineral</option>
            </select>
          </div>
        </div>

        {/* Tratamentos Recomendados */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Tratamentos e Filtros:
            </label>
            <span className="text-[9px] text-slate-400">Clique para ativar/desativar</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              'Antirreflexo Digital',
              'Filtro Luz Azul (BlueCut)',
              'Fotossensível (Transitions)',
              'Proteção UV400',
              'Antiembaçante',
              'Solar Escuro / Polarizado',
              'Degradê Solar'
            ].map((t) => {
              const isSelected = treatments.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    const updated = isSelected 
                      ? treatments.filter(item => item !== t) 
                      : [...treatments, t];
                    setTreatments(updated);
                    emitUpdate(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, updated);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all border cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {isSelected ? '✓ ' : '+ '}{t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Campo para Lentes Especiais */}
        <div className="p-3 bg-indigo-50/50 border border-indigo-200/80 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-black text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-indigo-600" />
              LENTES ESPECIAIS & OBSERVAÇÕES ÓPTICAS:
            </label>
            <span className="text-[10px] text-indigo-700 font-medium">
              Prismas, Ceratocone, Esclerais, Filtros
            </span>
          </div>

          <input
            type="text"
            value={specialLenses}
            onChange={(e) => {
              const val = e.target.value;
              setSpecialLenses(val);
              emitUpdate(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, val);
            }}
            placeholder="Ex: Prisma de 2.0 Δ Base Inferior em OD, Lente Escleral para Ceratocone grau II, Lente Tórica com Eixo Estabilizado..."
            className="w-full bg-white border border-indigo-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
          />

          {/* Chips Rápidos de Lentes Especiais */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {[
              'Prisma Terapêutico (Base Superior/Inferior)',
              'Lente de Contato Escleral',
              'Lente RGP Corneana (Ceratocone)',
              'Lente Tórica Personalizada',
              'Filtro Terapêutico Amarelo/Âmbar (Baixa Visão)',
              'Lente Multifocal Ocupacional'
            ].map((spec) => (
              <button
                key={spec}
                type="button"
                onClick={() => {
                  const updated = specialLenses.trim() ? `${specialLenses.trim()} | ${spec}` : spec;
                  setSpecialLenses(updated);
                  emitUpdate(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, updated);
                }}
                className="px-2 py-0.5 bg-white hover:bg-indigo-100 border border-indigo-200 rounded-lg text-[10px] font-bold text-indigo-800 transition-colors cursor-pointer"
              >
                + {spec}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
