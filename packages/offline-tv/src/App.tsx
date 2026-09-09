import React, { useState, useEffect } from 'react';
import { 
  ActiveModuleType, 
  EyeTested, 
  OptotypeType,
  DisplayCalibrationData, 
  ClientMessage 
} from '@optotipo/shared';
import { 
  Eye, 
  BookOpen, 
  Compass, 
  ShieldCheck, 
  SunMedium, 
  Palette, 
  Grid, 
  Activity, 
  Sparkles, 
  Accessibility, 
  Workflow, 
  Settings as SettingsIcon,
  Ruler
} from 'lucide-react';

import logoClinicaMeirelles from './assets/logo-clinica-meirelles.jpg';
import menuDashboard3D from './assets/menu-dashboard-3d.jpg';
import { TopStatusBar } from './components/TopStatusBar';
import { CalibrationModal } from './components/CalibrationModal';
import { ScreenSaver } from './components/ScreenSaver';
import { PatientCallingOverlay } from './components/PatientCallingOverlay';
import { useDPad } from './components/DPadNavigation';
import { QRPairingSetup } from './components/QRPairingSetup';

// Módulos de Teste
import { VisualAcuityDistance } from './modules/VisualAcuityDistance';
import { VisualAcuityNear } from './modules/VisualAcuityNear';
import { BichromaticTest } from './modules/BichromaticTest';
import { AstigmaticClock } from './modules/AstigmaticClock';
import { JCCTarget } from './modules/JCCTarget';
import { Worth4Dot } from './modules/Worth4Dot';
import { SchoberTest } from './modules/SchoberTest';
import { CrossGridTest } from './modules/CrossGridTest';
import { ContrastSensitivity } from './modules/ContrastSensitivity';
import { ColorVisionScreening } from './modules/ColorVisionScreening';
import { AmslerGrid } from './modules/AmslerGrid';
import { OcularMotility } from './modules/OcularMotility';
import { FixationTargets } from './modules/FixationTargets';
import { LowVisionModule } from './modules/LowVisionModule';
import { PediatricModule } from './modules/PediatricModule';
import { EducationalModule } from './modules/EducationalModule';
import { QuickProtocols } from './modules/QuickProtocols';
import { SettingsModule } from './modules/SettingsModule';

import { 
  loadCalibration, 
  saveCalibration, 
  loadSettings, 
  saveSettings, 
  TVAppSettings 
} from './services/storageService';
import { lanPairingService } from './services/lanPairingService';

export interface MenuCategoryItem {
  id: ActiveModuleType | 'calibration';
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  textColor: string;
  gradientBg: string;
  glowColor: string;
}

// Grade exata de 18 Módulos = 3 Linhas de 6 Colunas com Cores Ultra-Vibrantes, Alta Fidelidade e Efeitos Tecnológicos
export const MENU_CATEGORIES: MenuCategoryItem[] = [
  // Linha 1 (Índices 0 a 5)
  { 
    id: 'av_distance', 
    title: 'AV LONGE', 
    subtitle: 'Snellen, Sloan, Números, E', 
    icon: <Eye className="w-6 h-6 text-blue-500 drop-shadow" />, 
    iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white', 
    textColor: 'text-blue-400',
    gradientBg: 'from-blue-600 via-indigo-600 to-blue-700',
    glowColor: 'shadow-blue-500/60'
  },
  { 
    id: 'av_near', 
    title: 'AV PERTO', 
    subtitle: 'Jaeger, logMAR perto, Leitura', 
    icon: <BookOpen className="w-6 h-6 text-indigo-400 drop-shadow" />, 
    iconBg: 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white', 
    textColor: 'text-indigo-400',
    gradientBg: 'from-indigo-600 via-purple-600 to-indigo-700',
    glowColor: 'shadow-indigo-500/60'
  },
  { 
    id: 'bichromatic', 
    title: 'BICROMÁTICO', 
    subtitle: 'Foco Vermelho / Verde', 
    icon: <Compass className="w-6 h-6 text-rose-400 drop-shadow" />, 
    iconBg: 'bg-gradient-to-br from-red-500 to-emerald-500 text-white', 
    textColor: 'text-rose-400',
    gradientBg: 'from-rose-600 via-red-600 to-emerald-600',
    glowColor: 'shadow-rose-500/60'
  },
  { 
    id: 'astigmatic_clock', 
    title: 'RELÓGIO ASTIGMÁTICO', 
    subtitle: 'Radial Green 12 meridianos', 
    icon: <Compass className="w-6 h-6 text-amber-400 drop-shadow" />, 
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white', 
    textColor: 'text-amber-400',
    gradientBg: 'from-amber-500 via-orange-500 to-amber-600',
    glowColor: 'shadow-amber-500/60'
  },
  { 
    id: 'jcc', 
    title: 'CILINDRO CRUZADO', 
    subtitle: 'Refinamento Jackson e eixo', 
    icon: <Compass className="w-6 h-6 text-cyan-400 drop-shadow" />, 
    iconBg: 'bg-gradient-to-br from-cyan-500 to-teal-600 text-white', 
    textColor: 'text-cyan-400',
    gradientBg: 'from-cyan-500 via-teal-500 to-blue-600',
    glowColor: 'shadow-cyan-500/60'
  },
  { 
    id: 'worth4dot', 
    title: 'WORTH 4 DOT', 
    subtitle: 'Fusão, diplopia e supressão', 
    icon: <ShieldCheck className="w-6 h-6 text-emerald-400 drop-shadow" />, 
    iconBg: 'bg-gradient-to-br from-emerald-500 to-green-600 text-white', 
    textColor: 'text-emerald-400',
    gradientBg: 'from-emerald-500 via-teal-600 to-emerald-700',
    glowColor: 'shadow-emerald-500/60'
  },

  // Linha 2 (Índices 6 a 11)
  { 
    id: 'schober', 
    title: 'SCHOBER TEST', 
    subtitle: 'Heteroforias (Cruz e anéis)', 
    icon: <ShieldCheck className="w-6 h-6 text-teal-400 drop-shadow" />, 
    iconBg: 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white', 
    textColor: 'text-teal-400',
    gradientBg: 'from-teal-500 via-cyan-600 to-teal-700',
    glowColor: 'shadow-teal-500/60'
  },
  { 
    id: 'cross_grid', 
    title: 'GRADE CRUZADA', 
    subtitle: 'Cross Grid de alto contraste', 
    icon: <Grid className="w-6 h-6 text-violet-400 drop-shadow" />, 
    iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600 text-white', 
    textColor: 'text-violet-400',
    gradientBg: 'from-violet-600 via-purple-700 to-slate-900',
    glowColor: 'shadow-violet-500/60'
  },
  { 
    id: 'contrast', 
    title: 'CONTRASTE', 
    subtitle: 'Sensibilidade e escala logCS', 
    icon: <SunMedium className="w-6 h-6 text-yellow-400 drop-shadow" />, 
    iconBg: 'bg-gradient-to-br from-yellow-400 to-amber-500 text-slate-950', 
    textColor: 'text-yellow-400',
    gradientBg: 'from-yellow-500 via-amber-500 to-orange-600',
    glowColor: 'shadow-yellow-500/60'
  },
  { 
    id: 'color_vision', 
    title: 'VISÃO CROMÁTICA', 
    subtitle: 'Triagem Cromática Digital', 
    icon: <Palette className="w-6 h-6 text-pink-400 drop-shadow" />, 
    iconBg: 'bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 text-white', 
    textColor: 'text-pink-400',
    gradientBg: 'from-pink-500 via-rose-600 to-purple-700',
    glowColor: 'shadow-pink-500/60'
  },
  { 
    id: 'amsler', 
    title: 'RETINA / AMSLER', 
    subtitle: 'Grade padrão e macular', 
    icon: <Grid className="w-6 h-6 text-red-400 drop-shadow" />, 
    iconBg: 'bg-gradient-to-br from-red-500 to-rose-600 text-white', 
    textColor: 'text-red-400',
    gradientBg: 'from-red-600 via-rose-700 to-red-900',
    glowColor: 'shadow-red-500/60'
  },
  { 
    id: 'motility', 
    title: 'MOTILIDADE OCULAR', 
    subtitle: 'Padrão H, sacádicos e pursuit', 
    icon: <Activity className="w-6 h-6 text-lime-400 drop-shadow" />, 
    iconBg: 'bg-gradient-to-br from-lime-500 to-emerald-600 text-slate-950', 
    textColor: 'text-lime-400',
    gradientBg: 'from-lime-500 via-emerald-600 to-green-700',
    glowColor: 'shadow-lime-500/60'
  },

  // Linha 3 (Índices 12 a 17)
  { 
    id: 'fixation', 
    title: 'ALVOS FIXAÇÃO', 
    subtitle: 'Alvos luminosos e animados', 
    icon: <Sparkles className="w-6 h-6 text-amber-300 drop-shadow" />, 
    iconBg: 'bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950', 
    textColor: 'text-amber-400',
    gradientBg: 'from-amber-400 via-yellow-500 to-amber-600',
    glowColor: 'shadow-amber-400/60'
  },
  { 
    id: 'pediatric', 
    title: 'PEDIÁTRICO', 
    subtitle: 'Figuras e ambiente lúdico', 
    icon: <Sparkles className="w-6 h-6 text-sky-300 drop-shadow" />, 
    iconBg: 'bg-gradient-to-br from-sky-400 to-blue-500 text-white', 
    textColor: 'text-sky-400',
    gradientBg: 'from-sky-400 via-blue-500 to-indigo-600',
    glowColor: 'shadow-sky-400/60'
  },
  { 
    id: 'low_vision', 
    title: 'BAIXA VISÃO', 
    subtitle: 'Optotipos ampliados, CF, HM', 
    icon: <Accessibility className="w-6 h-6 text-fuchsia-400 drop-shadow" />, 
    iconBg: 'bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white', 
    textColor: 'text-fuchsia-400',
    gradientBg: 'from-fuchsia-600 via-purple-700 to-pink-800',
    glowColor: 'shadow-fuchsia-500/60'
  },
  { 
    id: 'quick_protocols', 
    title: 'PROTOCOLOS', 
    subtitle: 'Exame Geral, Infantil, Refração', 
    icon: <Workflow className="w-6 h-6 text-blue-300 drop-shadow" />, 
    iconBg: 'bg-gradient-to-br from-blue-600 to-indigo-800 text-white', 
    textColor: 'text-blue-300',
    gradientBg: 'from-blue-600 via-indigo-700 to-slate-900',
    glowColor: 'shadow-blue-500/60'
  },
  { 
    id: 'calibration', 
    title: 'CALIBRAÇÃO', 
    subtitle: 'Régua de 100mm e tela', 
    icon: <Ruler className="w-6 h-6 text-cyan-300 drop-shadow" />, 
    iconBg: 'bg-gradient-to-br from-cyan-500 to-emerald-600 text-white', 
    textColor: 'text-cyan-400',
    gradientBg: 'from-cyan-500 via-emerald-600 to-teal-700',
    glowColor: 'shadow-cyan-500/60'
  },
  { 
    id: 'settings', 
    title: 'CONFIGURAÇÕES', 
    subtitle: 'Distância (3,5m), Som, LAN', 
    icon: <SettingsIcon className="w-6 h-6 text-slate-300 drop-shadow" />, 
    iconBg: 'bg-gradient-to-br from-slate-700 to-slate-900 text-white', 
    textColor: 'text-slate-300',
    gradientBg: 'from-slate-700 via-slate-800 to-slate-950',
    glowColor: 'shadow-slate-500/60'
  }
];

const GRID_COLS = 6;

export function App() {
  const [calibration, setCalibration] = useState<DisplayCalibrationData>(loadCalibration());
  const [settings, setSettings] = useState<TVAppSettings>(loadSettings());
  const [activeModule, setActiveModule] = useState<ActiveModuleType | 'menu'>('menu');
  const [isCalibrationOpen, setIsCalibrationOpen] = useState<boolean>(false);
  const [isScreenSaverActive, setIsScreenSaverActive] = useState<boolean>(false);
  const [focusedMenuIndex, setFocusedMenuIndex] = useState<number>(0);
  const [currentEye, setCurrentEye] = useState<EyeTested>('AO');
  const [isLanConnected, setIsLanConnected] = useState<boolean>(false);
  const [currentOptotypeType, setCurrentOptotypeType] = useState<OptotypeType>('sloan');
  const [activePatientCall, setActivePatientCall] = useState<any | null>(null);
  const [showQRPairing, setShowQRPairing] = useState<boolean>(false);

  // Inicializa serviço de pareamento LAN
  useEffect(() => {
    lanPairingService.connect();

    const interval = setInterval(() => {
      setIsLanConnected(lanPairingService.getIsConnected());
    }, 1500);

    const unsubscribe = lanPairingService.onMessage((msg: ClientMessage) => {
      if (msg.type === 'CALL_PATIENT') {
        setActivePatientCall(msg.ticket);
        setIsScreenSaverActive(false);
      } else if (msg.type === 'CLEAR_PATIENT_CALL') {
        setActivePatientCall(null);
      } else if (msg.type === 'SET_MODULE') {
        setActiveModule(msg.module);
        setIsScreenSaverActive(false);
      } else if (msg.type === 'RETURN_TO_MENU') {
        setActiveModule('menu');
        setIsScreenSaverActive(false);
      } else if (msg.type === 'SET_OPTOTYPE_TYPE') {
        setCurrentOptotypeType(msg.optotypeType);
        setActiveModule('av_distance');
        setIsScreenSaverActive(false);
      } else if (msg.type === 'SET_EYE') {
        setCurrentEye(msg.eye);
      } else if (msg.type === 'SET_DISTANCE') {
        setSettings(prev => ({ ...prev, defaultDistanceMeters: msg.distanceMeters }));
      } else if (msg.type === 'TRIGGER_SCREENSAVER') {
        setIsScreenSaverActive(true);
      } else if (msg.type === 'WAKE_SCREEN') {
        setIsScreenSaverActive(false);
      }
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  // Timer de inatividade para descanso de tela (30 minutos)
  useEffect(() => {
    let timeoutId: number;

    const resetInactivityTimer = () => {
      if (isScreenSaverActive) {
        setIsScreenSaverActive(false);
      }
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setIsScreenSaverActive(true);
      }, 30 * 60 * 1000);
    };

    window.addEventListener('keydown', resetInactivityTimer);
    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('touchstart', resetInactivityTimer);

    resetInactivityTimer();

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('keydown', resetInactivityTimer);
      window.removeEventListener('mousemove', resetInactivityTimer);
      window.removeEventListener('touchstart', resetInactivityTimer);
    };
  }, [isScreenSaverActive]);

  const selectFocusedItem = () => {
    const item = MENU_CATEGORIES[focusedMenuIndex];
    if (!item) return;

    if (item.id === 'calibration') {
      setIsCalibrationOpen(true);
    } else {
      setActiveModule(item.id as ActiveModuleType);
    }
  };

  // Navegação estrita 2D no Menu (6 colunas fixas)
  useDPad({
    onUp: () => {
      if (activeModule === 'menu') {
        setFocusedMenuIndex(prev => {
          const next = prev - GRID_COLS;
          return next >= 0 ? next : prev;
        });
      }
    },
    onDown: () => {
      if (activeModule === 'menu') {
        setFocusedMenuIndex(prev => {
          const next = prev + GRID_COLS;
          return next < MENU_CATEGORIES.length ? next : prev;
        });
      }
    },
    onLeft: () => {
      if (activeModule === 'menu') {
        setFocusedMenuIndex(prev => Math.max(0, prev - 1));
      }
    },
    onRight: () => {
      if (activeModule === 'menu') {
        setFocusedMenuIndex(prev => Math.min(MENU_CATEGORIES.length - 1, prev + 1));
      }
    },
    onSelect: () => {
      if (activeModule === 'menu') {
        selectFocusedItem();
      }
    },
    onBack: () => {
      if (isCalibrationOpen) {
        setIsCalibrationOpen(false);
      } else if (activeModule !== 'menu') {
        setActiveModule('menu');
      }
    },
    onAnyKey: () => {
      if (isScreenSaverActive) {
        setIsScreenSaverActive(false);
      }
    }
  });

  return (
    <div className="w-screen h-screen bg-slate-50 text-slate-900 flex flex-col overflow-hidden relative font-sans select-none">
      {/* Barra de Status Superior */}
      <TopStatusBar
        isCalibrated={calibration.isCalibrated}
        distanceMeters={settings.defaultDistanceMeters}
        currentEye={currentEye}
        isLanConnected={isLanConnected}
        roomName={settings.roomName}
        isDisplayMode={activeModule !== 'menu' && activeModule !== 'settings'}
      />

      {/* Exibição do Módulo Ativo ou do Menu Principal */}
      <main className="flex-1 w-full h-full relative overflow-hidden bg-slate-50">
        {activeModule === 'menu' && (
          <div className="w-full h-full p-4 sm:p-5 flex flex-col justify-between overflow-hidden relative bg-[#FAF9F6]">
            {/* PLANO DE FUNDO SUTIL COM LOGO MARCA D'ÁGUA */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] z-0 overflow-hidden select-none">
              <img
                src={logoClinicaMeirelles}
                alt="Marca d'Água Clínica Meirelles"
                className="w-[80vw] max-w-4xl h-auto object-contain filter grayscale"
              />
            </div>

            {/* Cabeçalho Luxo Oftalmológico */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center py-1">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1E293B]">
                CLÍNICA <span className="text-[#2563EB]">MEIRELLES</span>
              </h1>
              <p className="text-[11px] sm:text-xs font-bold text-[#64748B] uppercase tracking-[0.2em] mt-0.5">
                Clínica Médica e Ocular • Painel de Exames Clínicos
              </p>
            </div>

            {/* Grade Exata de 6 Colunas x 3 Linhas Preenchendo a Tela com Visual 3D Skeuomórfico Luxo */}
            <div 
              className="relative z-10 gap-3 sm:gap-4 w-full flex-1 grid items-stretch content-stretch py-2 h-full"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
                gridTemplateRows: 'repeat(3, minmax(0, 1fr))'
              }}
            >
              {MENU_CATEGORIES.map((cat, idx) => {
                const isFocused = focusedMenuIndex === idx;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    tabIndex={0}
                    onClick={() => {
                      setFocusedMenuIndex(idx);
                      if (cat.id === 'calibration') {
                        setIsCalibrationOpen(true);
                      } else {
                        setActiveModule(cat.id as ActiveModuleType);
                      }
                    }}
                    onMouseEnter={() => setFocusedMenuIndex(idx)}
                    className={`p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl transition-all duration-300 flex flex-col justify-between w-full h-full cursor-pointer text-left outline-none relative z-20 select-none ${
                      isFocused
                        ? `bg-gradient-to-br ${cat.gradientBg} text-white border-2 border-white shadow-2xl ${cat.glowColor} scale-[1.05] ring-4 ring-white/60 z-30`
                        : 'bg-white/95 backdrop-blur-md text-slate-900 border-2 border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.06)] hover:border-blue-400 hover:shadow-[0_16px_36px_rgba(37,99,235,0.18)] hover:scale-[1.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className={`p-2.5 rounded-2xl transition-all shadow-md ${
                        isFocused 
                          ? 'bg-white/25 text-white scale-110 ring-2 ring-white/40' 
                          : `${cat.iconBg} ring-2 ring-white/80`
                      }`}>
                        {React.cloneElement(cat.icon as React.ReactElement, { 
                          className: 'w-6 h-6 sm:w-7 sm:h-7 text-white' 
                        })}
                      </div>
                      {isFocused ? (
                        <span className="text-[10px] sm:text-xs bg-white text-slate-950 font-black px-3 py-1 rounded-full uppercase shadow-lg tracking-wider animate-pulse">
                          ABRIR
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono font-black bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-200/80 shadow-xs">
                          {(idx + 1).toString().padStart(2, '0')}
                        </span>
                      )}
                    </div>

                    <div className="mt-2.5 w-full overflow-hidden text-left">
                      <h3 className={`font-black text-xs sm:text-sm md:text-base tracking-tight truncate ${
                        isFocused ? 'text-white' : 'text-slate-900'
                      }`}>
                        {cat.title}
                      </h3>
                      <p className={`text-[10px] sm:text-[11px] font-bold truncate mt-0.5 ${
                        isFocused ? 'text-white/90' : 'text-slate-500'
                      }`}>
                        {cat.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Rodapé Limpo de Ações e Calibração */}
            <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 border-t border-slate-200/80 pt-2 shrink-0">
              <div className="flex items-center gap-4 font-semibold text-slate-600">
                <span>[▲ ▼ ◄ ►] Navegar</span>
                <span>[OK] Abrir Exame</span>
                <span>[VOLTAR] Menu</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCalibrationOpen(true)}
                className="flex items-center gap-1.5 bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-600 text-slate-700 px-3.5 py-1.5 rounded-xl font-bold transition-all shadow-sm cursor-pointer relative z-20"
              >
                <Ruler className="w-4 h-4 text-blue-600" />
                <span>Calibração da Tela (100mm)</span>
              </button>
            </div>
          </div>
        )}

        {/* 1. Módulo de Acuidade Visual de Longe */}
        {activeModule === 'av_distance' && (
          <VisualAcuityDistance
            distanceMeters={settings.defaultDistanceMeters}
            pixelsPerMm={calibration.pixelsPerMm}
            initialType={currentOptotypeType}
            initialEye={currentEye}
            onBackToMenu={() => setActiveModule('menu')}
          />
        )}

        {/* 2. Módulo de Acuidade Visual de Perto */}
        {activeModule === 'av_near' && (
          <VisualAcuityNear
            pixelsPerMm={calibration.pixelsPerMm}
          />
        )}

        {/* 3. Teste Bicromático */}
        {activeModule === 'bichromatic' && (
          <BichromaticTest
            distanceMeters={settings.defaultDistanceMeters}
            pixelsPerMm={calibration.pixelsPerMm}
            onBackToMenu={() => setActiveModule('menu')}
          />
        )}

        {/* 4. Relógio Astigmático */}
        {activeModule === 'astigmatic_clock' && (
          <AstigmaticClock
            pixelsPerMm={calibration.pixelsPerMm}
          />
        )}

        {/* 5. Cilindro Cruzado de Jackson (JCC) */}
        {activeModule === 'jcc' && (
          <JCCTarget
            pixelsPerMm={calibration.pixelsPerMm}
          />
        )}

        {/* 6. Teste de Worth 4 Dot */}
        {activeModule === 'worth4dot' && (
          <Worth4Dot
            pixelsPerMm={calibration.pixelsPerMm}
          />
        )}

        {/* 7. Teste de Schober */}
        {activeModule === 'schober' && (
          <SchoberTest
            pixelsPerMm={calibration.pixelsPerMm}
          />
        )}

        {/* 8. Grade Cruzada (Cross Grid) */}
        {activeModule === 'cross_grid' && (
          <CrossGridTest
            pixelsPerMm={calibration.pixelsPerMm}
          />
        )}

        {/* 9. Sensibilidade ao Contraste */}
        {activeModule === 'contrast' && (
          <ContrastSensitivity
            distanceMeters={settings.defaultDistanceMeters}
            pixelsPerMm={calibration.pixelsPerMm}
          />
        )}

        {/* 10. Triagem de Visão Cromática */}
        {activeModule === 'color_vision' && (
          <ColorVisionScreening />
        )}

        {/* 11. Grade de Amsler */}
        {activeModule === 'amsler' && (
          <AmslerGrid
            pixelsPerMm={calibration.pixelsPerMm}
          />
        )}

        {/* 12. Motilidade Ocular */}
        {activeModule === 'motility' && (
          <OcularMotility />
        )}

        {/* 13. Alvos de Fixação */}
        {activeModule === 'fixation' && (
          <FixationTargets />
        )}

        {/* 14. Avaliação Pediátrica */}
        {activeModule === 'pediatric' && (
          <PediatricModule
            distanceMeters={settings.defaultDistanceMeters}
            pixelsPerMm={calibration.pixelsPerMm}
            onBackToMenu={() => setActiveModule('menu')}
          />
        )}

        {/* 15. Baixa Visão */}
        {activeModule === 'low_vision' && (
          <LowVisionModule
            distanceMeters={settings.defaultDistanceMeters}
            pixelsPerMm={calibration.pixelsPerMm}
          />
        )}

        {/* 16. Protocolos Rápidos */}
        {activeModule === 'quick_protocols' && (
          <QuickProtocols
            onSelectModule={(mod: any) => setActiveModule(mod)}
          />
        )}

        {/* 17. Configurações do Sistema */}
        {activeModule === 'settings' && (
          <SettingsModule
            settings={settings}
            calibration={calibration}
            onOpenCalibration={() => setIsCalibrationOpen(true)}
            onUpdateSettings={(newSettings: TVAppSettings) => {
              setSettings(newSettings);
              saveSettings(newSettings);
            }}
            onUpdateDistance={(dist: number) => {
              setSettings(prev => ({ ...prev, defaultDistanceMeters: dist }));
            }}
            onBackToMenu={() => setActiveModule('menu')}
          />
        )}
      </main>

      {/* Modal de Calibração Física (Régua 100mm) */}
      <CalibrationModal
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        onSave={(newCalib: DisplayCalibrationData) => {
          setCalibration(newCalib);
          saveCalibration(newCalib);
          setIsCalibrationOpen(false);
        }}
        calibration={calibration}
      />

      {/* Descanso de Tela com Logo Clínica Meirelles */}
      <ScreenSaver
        isActive={isScreenSaverActive}
        onWake={() => setIsScreenSaverActive(false)}
      />

      {/* Painel Flutuante / Telão de Chamada de Paciente por Senha */}
      <PatientCallingOverlay
        currentCall={activePatientCall}
        onDismiss={() => setActivePatientCall(null)}
      />

      {/* Botão flutuante de pareamento — visível quando desconectado no menu */}
      {activeModule === 'menu' && !isLanConnected && !showQRPairing && (
        <button
          onClick={() => setShowQRPairing(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl shadow-2xl shadow-blue-900/60 text-sm font-semibold transition-all animate-pulse"
        >
          📡 Parear com sistema clínico
        </button>
      )}

      {/* Modal QR Code / Pareamento */}
      {showQRPairing && (
        <QRPairingSetup
          onClose={() => setShowQRPairing(false)}
          onPaired={(url) => {
            setShowQRPairing(false);
            setIsLanConnected(true);
          }}
        />
      )}
    </div>
  );
}

export default App;

