import React, { useRef, useState, useEffect } from 'react';
import { 
  Eye, 
  PenTool, 
  Eraser, 
  RotateCcw, 
  Save, 
  Download, 
  Sparkles,
  Layers,
  Circle,
  HelpCircle
} from 'lucide-react';
import { EyeDrawingData } from '@optotipo/shared';

interface EyeDrawingCanvasProps {
  initialData?: EyeDrawingData;
  onSave: (data: EyeDrawingData) => void;
  patientName: string;
}

type TemplateType = 'anterior_od' | 'anterior_oe' | 'retina_od' | 'retina_oe';

export const EyeDrawingCanvas: React.FC<EyeDrawingCanvasProps> = ({
  initialData,
  onSave,
  patientName
}) => {
  const [activeTemplate, setActiveTemplate] = useState<TemplateType>('anterior_od');
  const [drawingTool, setDrawingTool] = useState<'pen' | 'eraser'>('pen');
  const [penColor, setPenColor] = useState<string>('#EF4444'); // Vermelho padrão clínico
  const [penSize, setPenSize] = useState<number>(3);
  const [notes, setNotes] = useState<string>(initialData?.notes || '');
  const [savedDrawings, setSavedDrawings] = useState<Record<TemplateType, string>>({
    anterior_od: initialData?.anteriorSegmentOD || '',
    anterior_oe: initialData?.anteriorSegmentOE || '',
    retina_od: initialData?.retinaOD || '',
    retina_oe: initialData?.retinaOE || '',
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef<boolean>(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // Desenha os moldes anatômicos oftalmológicos no fundo
  const drawBaseTemplate = (ctx: CanvasRenderingContext2D, width: number, height: number, type: TemplateType) => {
    ctx.clearRect(0, 0, width, height);

    // Fundo Clínico
    ctx.fillStyle = '#0B1329';
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;

    if (type === 'anterior_od' || type === 'anterior_oe') {
      const isOD = type === 'anterior_od';

      // Esclera
      ctx.beginPath();
      ctx.ellipse(cx, cy, width * 0.42, height * 0.38, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#F8FAFC';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#E2E8F0';
      ctx.stroke();

      // Vasinhos esclerais de referência
      ctx.strokeStyle = '#FCA5A5';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx - width * 0.35, cy - 20);
      ctx.quadraticCurveTo(cx - width * 0.22, cy - 15, cx - width * 0.15, cy - 25);
      ctx.moveTo(cx + width * 0.35, cy + 20);
      ctx.quadraticCurveTo(cx + width * 0.22, cy + 15, cx + width * 0.15, cy + 25);
      ctx.stroke();

      // Limbo Esclerocorneano
      ctx.beginPath();
      ctx.arc(cx, cy, width * 0.22, 0, Math.PI * 2);
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Íris
      ctx.beginPath();
      ctx.arc(cx, cy, width * 0.20, 0, Math.PI * 2);
      ctx.fillStyle = '#0284C7';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#0369A1';
      ctx.stroke();

      // Pupila Central
      ctx.beginPath();
      ctx.arc(cx, cy, width * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = '#090D16';
      ctx.fill();

      // Reflexo Corneano (Brilho)
      ctx.beginPath();
      ctx.arc(cx - width * 0.03, cy - width * 0.03, width * 0.015, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();

      // Marcações Horárias (12h, 3h, 6h, 9h)
      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('12h (Sup)', cx, cy - width * 0.25);
      ctx.fillText('6h (Inf)', cx, cy + width * 0.27);
      ctx.fillText(isOD ? '9h (Temporal)' : '9h (Nasal)', cx - width * 0.30, cy + 4);
      ctx.fillText(isOD ? '3h (Nasal)' : '3h (Temporal)', cx + width * 0.30, cy + 4);

    } else {
      // Retinografia / Fundo de Olho
      const isOD = type === 'retina_od';

      // Globo Retiniano
      ctx.beginPath();
      ctx.arc(cx, cy, width * 0.38, 0, Math.PI * 2);
      ctx.fillStyle = '#B45309';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#EA580C';
      ctx.stroke();

      // Posição da Papila (Nasal) e Mácula (Temporal)
      const opticDiscX = isOD ? cx - width * 0.16 : cx + width * 0.16;
      const maculaX = isOD ? cx + width * 0.12 : cx - width * 0.12;

      // Papila / Nervo Óptico
      ctx.beginPath();
      ctx.arc(opticDiscX, cy, width * 0.07, 0, Math.PI * 2);
      ctx.fillStyle = '#FDE68A';
      ctx.fill();
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Escavação Fisiológica
      ctx.beginPath();
      ctx.arc(opticDiscX, cy, width * 0.028, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFBEB';
      ctx.fill();

      // Arcadas Vasculares Retinianas
      ctx.strokeStyle = '#991B1B';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      // Arcada Superior
      ctx.moveTo(opticDiscX, cy);
      ctx.quadraticCurveTo(cx, cy - height * 0.28, maculaX + (isOD ? 40 : -40), cy - height * 0.22);
      // Arcada Inferior
      ctx.moveTo(opticDiscX, cy);
      ctx.quadraticCurveTo(cx, cy + height * 0.28, maculaX + (isOD ? 40 : -40), cy + height * 0.22);
      ctx.stroke();

      // Mácula & Fóvea
      ctx.beginPath();
      ctx.arc(maculaX, cy, width * 0.05, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(120, 53, 15, 0.45)';
      ctx.fill();

      // Fóvea Central
      ctx.beginPath();
      ctx.arc(maculaX, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#451A03';
      ctx.fill();

      // Identificação
      ctx.fillStyle = '#FEF08A';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Papila Óptica', opticDiscX, cy + width * 0.11);
      ctx.fillText('Mácula', maculaX, cy + width * 0.09);
    }
  };

  // Carrega ou redesenha o canvas quando o template muda
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Se tiver desenho salvo para este template, carrega a imagem salva
    const saved = savedDrawings[activeTemplate];
    if (saved) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
      };
      img.src = saved;
    } else {
      drawBaseTemplate(ctx, width, height, activeTemplate);
    }
  }, [activeTemplate]);

  // Captura de Coordenadas com precisão para Mouse e Toque (Touchscreen)
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDrawing.current = true;
    const coords = getCanvasCoords(e);
    lastPoint.current = coords;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.arc(coords.x, coords.y, penSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = drawingTool === 'eraser' ? '#0B1329' : penColor;
    ctx.fill();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current || !lastPoint.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCanvasCoords(e);

    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.strokeStyle = drawingTool === 'eraser' ? '#0B1329' : penColor;
    ctx.lineWidth = drawingTool === 'eraser' ? penSize * 3 : penSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastPoint.current = coords;
  };

  const stopDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPoint.current = null;

    // Atualiza o estado salvo deste molde
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setSavedDrawings(prev => ({
      ...prev,
      [activeTemplate]: dataUrl
    }));
  };

  const handleResetCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawBaseTemplate(ctx, canvas.width, canvas.height, activeTemplate);
    setSavedDrawings(prev => ({
      ...prev,
      [activeTemplate]: ''
    }));
  };

  const handleSaveAll = () => {
    const canvas = canvasRef.current;
    const currentData = canvas ? canvas.toDataURL('image/png') : savedDrawings[activeTemplate];

    const finalDrawings: EyeDrawingData = {
      anteriorSegmentOD: activeTemplate === 'anterior_od' ? currentData : savedDrawings.anterior_od,
      anteriorSegmentOE: activeTemplate === 'anterior_oe' ? currentData : savedDrawings.anterior_oe,
      retinaOD: activeTemplate === 'retina_od' ? currentData : savedDrawings.retina_od,
      retinaOE: activeTemplate === 'retina_oe' ? currentData : savedDrawings.retina_oe,
      notes,
      updatedAt: new Date().toISOString()
    };

    onSave(finalDrawings);
  };

  const CLINICAL_COLORS = [
    { label: 'Pterígio / Sangue / Neovasos', color: '#EF4444' },
    { label: 'Exsudato / Lípido / Secreção', color: '#FACC15' },
    { label: 'Córnea / Fluoresceína / Ceratite', color: '#10B981' },
    { label: 'Afinamento / Edema / Lesão Azul', color: '#38BDF8' },
    { label: 'Pigmento / Nevus / Melanose', color: '#78350F' },
    { label: 'Opacidade / Cicatriz / Leucoma', color: '#FFFFFF' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
      {/* Header com Seletor do Molde Anatômico */}
      <div className="bg-slate-900 text-white p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-600/30 text-blue-400 rounded-xl border border-blue-500/40">
            <PenTool className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-tight">Desenho Anatômico Ocular Interativo</h3>
            <p className="text-[11px] text-slate-400">Paciente: <strong className="text-white">{patientName}</strong></p>
          </div>
        </div>

        {/* Seletor do Segmento & Olho */}
        <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
          <button
            type="button"
            onClick={() => setActiveTemplate('anterior_od')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTemplate === 'anterior_od' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Segmento Anterior (OD)
          </button>
          <button
            type="button"
            onClick={() => setActiveTemplate('anterior_oe')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTemplate === 'anterior_oe' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Segmento Anterior (OE)
          </button>
          <button
            type="button"
            onClick={() => setActiveTemplate('retina_od')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTemplate === 'retina_od' 
                ? 'bg-amber-600 text-white shadow-sm' 
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Fundo / Retina (OD)
          </button>
          <button
            type="button"
            onClick={() => setActiveTemplate('retina_oe')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTemplate === 'retina_oe' 
                ? 'bg-amber-600 text-white shadow-sm' 
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Fundo / Retina (OE)
          </button>
        </div>
      </div>

      {/* Barra de Ferramentas de Desenho e Cores Clínicas */}
      <div className="bg-slate-100 p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          {/* Alternador Caneta / Borracha */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-300 shadow-2xs">
            <button
              type="button"
              onClick={() => setDrawingTool('pen')}
              className={`p-1.5 rounded-lg flex items-center gap-1 font-bold ${
                drawingTool === 'pen' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Caneta de Desenho"
            >
              <PenTool className="w-4 h-4" />
              <span>Caneta</span>
            </button>
            <button
              type="button"
              onClick={() => setDrawingTool('eraser')}
              className={`p-1.5 rounded-lg flex items-center gap-1 font-bold ${
                drawingTool === 'eraser' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Borracha"
            >
              <Eraser className="w-4 h-4" />
              <span>Borracha</span>
            </button>
          </div>

          {/* Espessura do Traço */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-300 text-slate-700">
            <span className="font-bold text-[10px] text-slate-500 uppercase">Traço:</span>
            {[2, 4, 8].map(sz => (
              <button
                key={sz}
                type="button"
                onClick={() => setPenSize(sz)}
                className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs ${
                  penSize === sz ? 'bg-slate-800 text-white' : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                {sz}px
              </button>
            ))}
          </div>

          {/* Paleta de Cores Oftalmológicas com Legenda */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-300 shadow-2xs">
            {CLINICAL_COLORS.map(c => (
              <button
                key={c.color}
                type="button"
                onClick={() => {
                  setPenColor(c.color);
                  setDrawingTool('pen');
                }}
                className={`w-6 h-6 rounded-lg transition-transform ${
                  penColor === c.color && drawingTool === 'pen' 
                    ? 'ring-2 ring-blue-500 scale-110 shadow-sm' 
                    : 'opacity-85 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.color }}
                title={c.label}
              />
            ))}
          </div>
        </div>

        {/* Botão de Limpar e Salvar */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetCanvas}
            className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 hover:border-rose-300 border border-slate-300 font-bold rounded-xl flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpar Molde</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Salvar no Prontuário</span>
          </button>
        </div>
      </div>

      {/* Área Central de Desenho com Toque */}
      <div className="p-4 bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={600}
          height={380}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="rounded-2xl border-2 border-slate-700 shadow-2xl cursor-crosshair touch-none max-w-full h-auto bg-[#0B1329]"
        />
        <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-3">
          <span>✍️ Desenhe usando o mouse, caneta stylus ou o dedo no tablet/celular</span>
          <span>•</span>
          <span className="text-amber-400 font-semibold">Legenda: Vermelho = Vasos/Pterígio | Amarelo = Exsudato | Verde = Fluoresceína</span>
        </div>
      </div>

      {/* Campo de Laudo e Notas Descritivas da Biomicroscopia / Fundo de Olho */}
      <div className="p-4 bg-slate-50 border-t border-slate-200">
        <label className="block text-xs font-bold text-slate-700 mb-1">
          LAUDO DESCRITIVO / OBSERVAÇÕES DA BIOMICROSCOPIA & FUNDOSCOPIA:
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Ex: Córnea transparente sem infiltrados. Pterígio nasal OD grau I sem invasão pupilar. Escavação papilar OD 0.4 fisiológica, OE 0.3..."
          className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs resize-none"
        />
      </div>
    </div>
  );
};
