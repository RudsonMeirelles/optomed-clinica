import React from 'react';
import { 
  TumblingEOrientation, 
  LandoltCOrientation, 
  SloanLetter, 
  NumberOptotype, 
  PediatricSymbol 
} from '@optotipo/shared';

interface OptotypeRendererProps {
  type: 'tumbling_e' | 'landolt_c' | 'sloan' | 'numbers' | 'pediatric';
  value: string | number;
  sizePx: number;
  orientation?: number;
  color?: string;
  crowding?: boolean;
}

export const OptotypeRenderer: React.FC<OptotypeRendererProps> = ({
  type,
  value,
  sizePx,
  orientation = 0,
  color = '#000000',
  crowding = false
}) => {
  const roundedSize = Math.max(14, Math.round(sizePx) || 48);
  const stroke = roundedSize / 5;

  const svgStyle: React.CSSProperties = {
    width: `${roundedSize}px`,
    height: `${roundedSize}px`,
    minWidth: `${roundedSize}px`,
    minHeight: `${roundedSize}px`,
    maxWidth: `${roundedSize}px`,
    maxHeight: `${roundedSize}px`,
    display: 'block',
    flexShrink: 0
  };

  // Renderizador do Tumbling E (Padrão Internacional Grade 5x5 estrita)
  const renderTumblingE = (rot: number) => (
    <svg
      viewBox="0 0 100 100"
      style={svgStyle}
      className="select-none flex-shrink-0"
      shapeRendering="geometricPrecision"
    >
      <g transform={`rotate(${rot} 50 50)`}>
        <rect x="0" y="0" width="20" height="100" fill={color} />
        <rect x="20" y="0" width="80" height="20" fill={color} />
        <rect x="20" y="40" width="80" height="20" fill={color} />
        <rect x="20" y="80" width="80" height="20" fill={color} />
      </g>
    </svg>
  );

  // Renderizador do Landolt C (Anel 5x5 ISO 8596 com abertura de 1/5 e centro 50,50 exato)
  const renderLandoltC = (rot: number) => (
    <svg
      viewBox="0 0 100 100"
      style={svgStyle}
      className="select-none flex-shrink-0"
      shapeRendering="geometricPrecision"
    >
      <g transform={`rotate(${rot} 50 50)`}>
        <path
          d="M 98.99 40 A 50 50 0 1 0 98.99 60 L 78.28 60 A 30 30 0 1 1 78.28 40 Z"
          fill={color}
        />
      </g>
    </svg>
  );

  // Renderizador de Letras Sloan Padronizadas (Grade 5x5 ETDRS / NAS-NRC)
  const renderSloanLetter = (letter: SloanLetter | string) => {
    switch (letter) {
      case 'C':
        return (
          <svg viewBox="0 0 100 100" style={svgStyle} className="select-none flex-shrink-0" shapeRendering="geometricPrecision">
            <path
              d="M 85 20 C 75 8 64 0 50 0 C 22.4 0 0 22.4 0 50 C 0 77.6 22.4 100 50 100 C 64 100 75 92 85 80 L 70 65 C 64 74 58 80 50 80 C 33.4 80 20 66.6 20 50 C 20 33.4 33.4 20 50 20 C 58 20 64 26 70 35 Z"
              fill={color}
            />
          </svg>
        );
      case 'D':
        return (
          <svg viewBox="0 0 100 100" style={svgStyle} className="select-none flex-shrink-0" shapeRendering="geometricPrecision">
            <path
              d="M 0 0 H 55 C 80 0 100 20 100 50 C 100 80 80 100 55 100 H 0 Z M 20 20 V 80 H 50 C 68 80 80 68 80 50 C 80 32 68 20 50 20 Z"
              fill={color}
            />
          </svg>
        );
      case 'E':
        return renderTumblingE(0);
      case 'F':
        return (
          <svg viewBox="0 0 100 100" style={svgStyle} className="select-none flex-shrink-0" shapeRendering="geometricPrecision">
            <path d="M 0 0 H 100 V 20 H 20 V 40 H 80 V 60 H 20 V 100 H 0 Z" fill={color} />
          </svg>
        );
      case 'H':
        return (
          <svg viewBox="0 0 100 100" style={svgStyle} className="select-none flex-shrink-0" shapeRendering="geometricPrecision">
            <path d="M 0 0 H 20 V 40 H 80 V 0 H 100 V 100 H 80 V 60 H 20 V 100 H 0 Z" fill={color} />
          </svg>
        );
      case 'K':
        return (
          <svg viewBox="0 0 100 100" style={svgStyle} className="select-none flex-shrink-0" shapeRendering="geometricPrecision">
            <path d="M 0 0 H 20 V 40 L 72 0 H 100 L 46 50 L 100 100 H 72 L 20 56 V 100 H 0 Z" fill={color} />
          </svg>
        );
      case 'L':
        return (
          <svg viewBox="0 0 100 100" style={svgStyle} className="select-none flex-shrink-0" shapeRendering="geometricPrecision">
            <path d="M 0 0 H 20 V 80 H 100 V 100 H 0 Z" fill={color} />
          </svg>
        );
      case 'N':
        return (
          <svg viewBox="0 0 100 100" style={svgStyle} className="select-none flex-shrink-0" shapeRendering="geometricPrecision">
            <path d="M 0 0 H 20 L 80 75 V 0 H 100 V 100 H 80 L 20 25 V 100 H 0 Z" fill={color} />
          </svg>
        );
      case 'O':
        return (
          <svg viewBox="0 0 100 100" style={svgStyle} className="select-none flex-shrink-0" shapeRendering="geometricPrecision">
            <path
              d="M 50 0 C 22.4 0 0 22.4 0 50 C 0 77.6 22.4 100 50 100 C 77.6 100 100 77.6 100 50 C 100 22.4 77.6 0 50 0 Z M 50 20 C 66.6 20 80 33.4 80 50 C 80 66.6 66.6 80 50 80 C 33.4 80 20 66.6 20 50 C 20 33.4 33.4 20 50 20 Z"
              fill={color}
            />
          </svg>
        );
      case 'P':
        return (
          <svg viewBox="0 0 100 100" style={svgStyle} className="select-none flex-shrink-0" shapeRendering="geometricPrecision">
            <path
              d="M 0 0 H 60 C 82 0 100 14 100 32 C 100 50 82 64 60 64 H 20 V 100 H 0 Z M 20 20 V 44 H 55 C 68 44 78 38 78 32 C 78 26 68 20 55 20 Z"
              fill={color}
            />
          </svg>
        );
      case 'R':
        return (
          <svg viewBox="0 0 100 100" style={svgStyle} className="select-none flex-shrink-0" shapeRendering="geometricPrecision">
            <path
              d="M 0 0 H 60 C 82 0 100 14 100 32 C 100 48 84 60 65 62 L 100 100 H 75 L 45 64 H 20 V 100 H 0 Z M 20 20 V 44 H 55 C 68 44 78 38 78 32 C 78 26 68 20 55 20 Z"
              fill={color}
            />
          </svg>
        );
      case 'V':
        return (
          <svg viewBox="0 0 100 100" style={svgStyle} className="select-none flex-shrink-0" shapeRendering="geometricPrecision">
            <path d="M 0 0 H 22 L 50 80 L 78 0 H 100 L 62 100 H 38 Z" fill={color} />
          </svg>
        );
      case 'Z':
        return (
          <svg viewBox="0 0 100 100" style={svgStyle} className="select-none flex-shrink-0" shapeRendering="geometricPrecision">
            <path d="M 0 0 H 100 V 20 L 26 80 H 100 V 100 H 0 V 80 L 74 20 H 0 Z" fill={color} />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 100 100" style={svgStyle} className="select-none flex-shrink-0" shapeRendering="geometricPrecision">
            <text 
              x="50" 
              y="78" 
              fontSize="88" 
              fontWeight="900" 
              textAnchor="middle" 
              fill={color} 
              fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Arial Black', 'Arial Bold', 'Helvetica Neue', Arial, sans-serif"
            >
              {letter}
            </text>
          </svg>
        );
    }
  };

  // Renderizador de Números Clínicos em Sans-Serif Negrito Nítido
  const renderNumber = (num: string | number) => {
    const s = String(num);
    return (
      <svg
        viewBox="0 0 100 100"
        style={svgStyle}
        className="select-none flex-shrink-0"
        shapeRendering="geometricPrecision"
        textRendering="geometricPrecision"
      >
        <text
          x="50"
          y="78"
          fontSize="92"
          fontWeight="900"
          textAnchor="middle"
          fill={color}
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Arial Black', 'Arial Bold', 'Helvetica Neue', Arial, sans-serif"
          letterSpacing="-1px"
        >
          {s}
        </text>
      </svg>
    );
  };

  // Renderizador Pediátrico em Vetor Ultra Realista, Colorido e Nítido
  const renderPediatricSymbol = (sym: string) => {
    switch (sym) {
      case 'house':
        return (
          <svg viewBox="0 0 100 100" style={svgStyle} className="select-none flex-shrink-0" shapeRendering="geometricPrecision">
            {/* Chaminé */}
            <rect x="70" y="16" width="12" height="24" fill="#991B1B" rx="1" />
            <rect x="68" y="14" width="16" height="4" fill="#7F1D1D" rx="1" />
            {/* Telhado Colonial */}
            <polygon points="50,6 98,42 86,42 86,44 14,44 14,42 2,42" fill="#DC2626" />
            <polygon points="50,11 90,40 10,40" fill="#EF4444" />
            {/* Paredes da Casa */}
            <rect x="14" y="42" width="72" height="54" fill="#FDE047" stroke="#CA8A04" strokeWidth="2" rx="2" />
            {/* Porta de Madeira */}
            <rect x="40" y="58" width="20" height="38" fill="#B45309" stroke="#78350F" strokeWidth="1.5" rx="3" />
            <circle cx="56" cy="78" r="2.5" fill="#FEF08A" />
            {/* Janela Esquerda */}
            <rect x="22" y="52" width="14" height="16" fill="#38BDF8" stroke="#0284C7" strokeWidth="1.5" rx="2" />
            <line x1="29" y1="52" x2="29" y2="68" stroke="#0284C7" strokeWidth="1" />
            <line x1="22" y1="60" x2="36" y2="60" stroke="#0284C7" strokeWidth="1" />
            {/* Janela Direita */}
            <rect x="64" y="52" width="14" height="16" fill="#38BDF8" stroke="#0284C7" strokeWidth="1.5" rx="2" />
            <line x1="71" y1="52" x2="71" y2="68" stroke="#0284C7" strokeWidth="1" />
            <line x1="64" y1="60" x2="78" y2="60" stroke="#0284C7" strokeWidth="1" />
          </svg>
        );
      case 'apple':
        return (
          <svg viewBox="0 0 100 100" style={svgStyle} className="select-none flex-shrink-0" shapeRendering="geometricPrecision">
            {/* Folha Verde */}
            <path d="M 52 18 C 58 6 74 6 76 16 C 68 22 56 22 52 18 Z" fill="#22C55E" stroke="#15803D" strokeWidth="1.5" />
            {/* Caule de Madeira */}
            <path d="M 50 24 Q 54 8 62 6" stroke="#78350F" strokeWidth="4.5" fill="none" strokeLinecap="round" />
            {/* Maçã Vermelha com Brilho Tridimensional */}
            <path
              d="M 50 28 C 36 14 6 22 6 52 C 6 80 32 96 50 96 C 68 96 94 80 94 52 C 94 22 64 14 50 28 Z"
              fill="#E11D48"
              stroke="#BE123C"
              strokeWidth="2"
            />
            {/* Brilho Reflexo de Luz */}
            <path
              d="M 24 38 C 18 46 18 62 26 72 C 24 64 24 48 30 42 C 34 38 40 36 44 36 C 36 34 28 34 24 38 Z"
              fill="#FDA4AF"
              opacity="0.85"
            />
          </svg>
        );
      case 'circle':
        return (
          <svg viewBox="0 0 100 100" style={svgStyle} className="select-none flex-shrink-0" shapeRendering="geometricPrecision">
            <circle cx="50" cy="50" r="46" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="3" />
            <circle cx="50" cy="50" r="32" fill="#60A5FA" />
            <circle cx="50" cy="50" r="20" fill="#DBEAFE" stroke="#2563EB" strokeWidth="2" />
            <circle cx="50" cy="50" r="8" fill="#1E40AF" />
          </svg>
        );
      case 'square':
        return (
          <svg viewBox="0 0 100 100" style={svgStyle} className="select-none flex-shrink-0" shapeRendering="geometricPrecision">
            <rect x="6" y="6" width="88" height="88" rx="14" fill="#10B981" stroke="#047857" strokeWidth="3" />
            <rect x="22" y="22" width="56" height="56" rx="8" fill="#6EE7B7" stroke="#059669" strokeWidth="2" />
            <rect x="36" y="36" width="28" height="28" rx="4" fill="#ECFDF5" />
          </svg>
        );
      case 'star':
        return (
          <svg viewBox="0 0 100 100" style={svgStyle} className="select-none flex-shrink-0" shapeRendering="geometricPrecision">
            <polygon 
              points="50,4 64,36 98,36 71,57 82,92 50,70 18,92 29,57 2,36 36,36" 
              fill="#F59E0B" 
              stroke="#D97706" 
              strokeWidth="2.5"
            />
            {/* Miolo Brilhante */}
            <polygon 
              points="50,16 60,38 84,38 65,52 72,76 50,60 28,76 35,52 16,38 40,38" 
              fill="#FDE047" 
            />
            <circle cx="50" cy="46" r="6" fill="#FFFFFF" opacity="0.9" />
          </svg>
        );
      case 'fish':
        return (
          <svg viewBox="0 0 100 100" style={svgStyle} className="select-none flex-shrink-0" shapeRendering="geometricPrecision">
            {/* Barbatana Traseira (Cauda) */}
            <polygon points="76,50 96,20 88,50 96,80" fill="#F97316" stroke="#C2410C" strokeWidth="1.5" />
            {/* Corpo do Peixinho */}
            <path
              d="M 10 50 C 26 16 68 22 80 50 C 68 78 26 84 10 50 Z"
              fill="#FB923C"
              stroke="#EA580C"
              strokeWidth="2.5"
            />
            {/* Listras do Peixe-Palhaço */}
            <path d="M 38 28 C 44 40 44 60 38 72 C 44 70 48 54 44 29 Z" fill="#FFFFFF" stroke="#EA580C" strokeWidth="1" />
            <path d="M 58 32 C 62 42 62 58 58 68 C 63 66 66 54 63 33 Z" fill="#FFFFFF" stroke="#EA580C" strokeWidth="1" />
            {/* Olho Vivo com Pupila */}
            <circle cx="24" cy="42" r="7" fill="#FFFFFF" stroke="#9A3412" strokeWidth="1" />
            <circle cx="22" cy="42" r="3.5" fill="#0F172A" />
            <circle cx="21" cy="40" r="1.2" fill="#FFFFFF" />
            {/* Boca Sorridente */}
            <path d="M 12 52 Q 18 56 22 52" stroke="#9A3412" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
        );
      case 'car':
        return (
          <svg viewBox="0 0 100 100" style={svgStyle} className="select-none flex-shrink-0" shapeRendering="geometricPrecision">
            {/* Cabine / Vidros */}
            <path d="M 24 48 L 36 28 H 66 L 78 48 Z" fill="#38BDF8" stroke="#0284C7" strokeWidth="2" />
            {/* Chassi do Carro */}
            <rect x="8" y="46" width="84" height="26" rx="6" fill="#EF4444" stroke="#B91C1C" strokeWidth="2" />
            {/* Rodas */}
            <circle cx="28" cy="72" r="12" fill="#1E293B" stroke="#0F172A" strokeWidth="2" />
            <circle cx="28" cy="72" r="5" fill="#94A3B8" />
            <circle cx="72" cy="72" r="12" fill="#1E293B" stroke="#0F172A" strokeWidth="2" />
            <circle cx="72" cy="72" r="5" fill="#94A3B8" />
            {/* Farol Dianteiro */}
            <rect x="84" y="52" width="6" height="8" rx="2" fill="#FDE047" />
          </svg>
        );
      case 'boat':
        return (
          <svg viewBox="0 0 100 100" style={svgStyle} className="select-none flex-shrink-0" shapeRendering="geometricPrecision">
            {/* Mastro */}
            <rect x="48" y="12" width="4" height="56" fill="#78350F" />
            {/* Vela Principal */}
            <polygon points="54,16 54,62 86,62" fill="#38BDF8" stroke="#0284C7" strokeWidth="1.5" />
            {/* Vela Secundária */}
            <polygon points="46,24 46,62 20,62" fill="#F43F5E" stroke="#BE123C" strokeWidth="1.5" />
            {/* Casco do Barco */}
            <polygon points="12,68 88,68 76,88 24,88" fill="#F59E0B" stroke="#B45309" strokeWidth="2.5" />
            <line x1="20" y1="76" x2="80" y2="76" stroke="#FEF3C7" strokeWidth="2" />
          </svg>
        );
      default:
        return renderSloanLetter('C');
    }
  };

  const renderContent = () => {
    switch (type) {
      case 'tumbling_e':
        return renderTumblingE(Number(orientation || value || 0));
      case 'landolt_c':
        return renderLandoltC(Number(orientation || value || 0));
      case 'sloan':
        return renderSloanLetter(String(value));
      case 'numbers':
        return renderNumber(value);
      case 'pediatric':
        return renderPediatricSymbol(String(value));
      default:
        return renderTumblingE(0);
    }
  };

  if (crowding) {
    const barThickness = stroke;
    return (
      <div 
        className="relative flex items-center justify-center flex-shrink-0"
        style={{
          border: `${barThickness}px solid ${color}`,
          padding: `${roundedSize * 0.35}px`,
          width: `${roundedSize * 1.7}px`,
          height: `${roundedSize * 1.7}px`,
          minWidth: `${roundedSize * 1.7}px`,
          minHeight: `${roundedSize * 1.7}px`,
          boxSizing: 'border-box'
        }}
      >
        {renderContent()}
      </div>
    );
  }

  return (
    <div 
      className="flex items-center justify-center select-none flex-shrink-0"
      style={{
        width: `${roundedSize}px`,
        height: `${roundedSize}px`,
        minWidth: `${roundedSize}px`,
        minHeight: `${roundedSize}px`,
        boxSizing: 'border-box'
      }}
    >
      {renderContent()}
    </div>
  );
};
