import React, { useState, useEffect } from 'react';
import { Appointment, ClinicConfig } from '@optotipo/shared';
import { 
  Users, 
  Clock, 
  Bell, 
  MapPin, 
  Stethoscope, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Tv,
  Maximize2,
  Minimize2,
  Video,
  Play,
  Type,
  ImageIcon,
  Radio,
  ExternalLink,
  Info
} from 'lucide-react';
import { offlineDb } from '../services/offlineDb';
import { lanController } from '../services/lanController';
import { 
  WaitingRoomMediaService, 
  WaitingRoomSettings, 
  WaitingRoomMediaItem 
} from '../services/waitingRoomMediaService';

interface WaitingRoomPageProps {
  activeClinic: ClinicConfig;
  isStandalone?: boolean;
}

export const WaitingRoomPage: React.FC<WaitingRoomPageProps> = ({ activeClinic, isStandalone = false }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeCall, setActiveCall] = useState<any | null>(null);
  const [callHistory, setCallHistory] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [mediaSettings, setMediaSettings] = useState<WaitingRoomSettings>(WaitingRoomMediaService.getSettings());
  const [currentMediaIndex, setCurrentMediaIndex] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const loadAppointments = () => {
    const today = new Date().toISOString().split('T')[0];
    const all = offlineDb.getAppointments();
    const todayList = all.filter(a => a.date === today);
    setAppointments(todayList);
  };

  // Carrega e atualiza relógio, dados e eventos
  useEffect(() => {
    loadAppointments();
    setMediaSettings(WaitingRoomMediaService.getSettings());

    const clockInterval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);

    const refreshInterval = setInterval(() => {
      loadAppointments();
    }, 3000);

    // Escuta novas chamadas de paciente emitidas pelo examinador
    const handlePatientCall = (e: any) => {
      const ticket = e.detail;
      if (ticket) {
        setActiveCall(ticket);
        setCallHistory(prev => [ticket, ...prev.filter(t => t.ticketNumber !== ticket.ticketNumber)].slice(0, 6));
        loadAppointments();
      }
    };

    // Escuta atualizações nas configurações de mídia/propaganda
    const handleMediaUpdated = (e: any) => {
      if (e.detail) {
        setMediaSettings(e.detail);
      }
    };

    window.addEventListener('optomed_patient_called', handlePatientCall);
    window.addEventListener('optomed_media_settings_updated', handleMediaUpdated);

    return () => {
      clearInterval(clockInterval);
      clearInterval(refreshInterval);
      window.removeEventListener('optomed_patient_called', handlePatientCall);
      window.removeEventListener('optomed_media_settings_updated', handleMediaUpdated);
    };
  }, []);

  // Carrossel de Mídia da TV (rotaciona os itens ativos baseado no tempo configurado)
  useEffect(() => {
    const activeItems = mediaSettings.items.filter(i => i.active);
    if (activeItems.length <= 1) return;

    const currentItem = activeItems[currentMediaIndex % activeItems.length];
    const duration = (currentItem?.durationSeconds || 15) * 1000;

    const timer = setTimeout(() => {
      setCurrentMediaIndex(prev => (prev + 1) % activeItems.length);
    }, duration);

    return () => clearTimeout(timer);
  }, [currentMediaIndex, mediaSettings]);

  const activeMediaItems = mediaSettings.items.filter(i => i.active);
  const currentItem = activeMediaItems.length > 0 ? activeMediaItems[currentMediaIndex % activeMediaItems.length] : null;

  const waitingPatients = appointments.filter(a => a.status === 'waiting');

  const triggerTestCall = (apt: Appointment) => {
    const ticketNum = apt.ticketNumber || `P-${String(appointments.indexOf(apt) + 1).padStart(2, '0')}`;
    lanController.callPatient({
      ticketNumber: ticketNum,
      patientName: apt.patientName,
      roomName: apt.room || 'Consultório 1',
      examinerName: apt.examinerName || 'Dr. Rudson Meirelles',
      priority: apt.isPriority
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Converte URLs do YouTube para Embed Iframe seguro
  const getEmbedYouTubeUrl = (url: string) => {
    if (!url) return '';
    try {
      let videoId = '';
      if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
      } else if (url.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(new URL(url).search);
        videoId = urlParams.get('v') || '';
      } else if (url.includes('youtube.com/embed/')) {
        return url;
      }
      if (videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1`;
      }
    } catch {
      return url;
    }
    return url;
  };

  return (
    <div className={`w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between select-none overflow-x-hidden ${isStandalone ? 'p-4 sm:p-6' : 'p-4 sm:p-8'}`}>
      
      {/* 1. TOPO: Identificação da Clínica, Fila & Relógio Digital */}
      <header className="bg-slate-900/90 backdrop-blur-md px-6 py-4 rounded-3xl border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-black text-2xl shadow-inner shrink-0">
            <Tv className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {activeClinic.name}
              </h1>
              <span className="px-3 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                Painel da Sala de Espera (TV)
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Chamador Oficial de Pacientes & Central Multimídia da Recepção
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          {/* Relógio Digital Gigante */}
          <div className="bg-slate-950 border border-slate-800 px-5 py-2.5 rounded-2xl font-mono text-2xl sm:text-3xl font-black text-amber-400 shadow-inner flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-amber-500" />
            <span>{currentTime || '00:00:00'}</span>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl border border-slate-700 transition-colors cursor-pointer shadow-md"
            title={isFullscreen ? 'Sair da Tela Cheia' : 'Abrir Tela Cheia no Telão da TV'}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* 2. CORPO PRINCIPAL: GRID SPLIT-SCREEN (CHAMADA DE PACIENTES + TELA DE APOIO/PROPAGANDA) */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 flex-1 items-stretch">
        
        {/* COLUNA ESQUERDA (7 colunas): CARTÃO PRINCIPAL DA SENHA CHAMADA + HISTÓRICO */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          
          {/* Card Gigante da Senha Ativa */}
          <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-blue-500/70 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between text-center relative overflow-hidden flex-1 min-h-[360px]">
            <div className="absolute -top-24 w-full h-48 bg-blue-500/20 blur-3xl rounded-full pointer-events-none" />

            {activeCall ? (
              <div className="space-y-6 animate-scaleUp my-auto">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-widest shadow-md">
                  <Bell className="w-4 h-4 text-amber-400 animate-bounce" />
                  <span>ÚLTIMA SENHA CHAMADA PELO EXAMINADOR</span>
                </div>

                {/* Senha Grande */}
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    {activeCall.priority ? 'SENHA PREFERENCIAL' : 'SENHA DE ATENDIMENTO'}
                  </span>
                  <div className="text-6xl sm:text-8xl md:text-9xl font-black font-mono tracking-widest bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_10px_25px_rgba(245,158,11,0.4)]">
                    {activeCall.ticketNumber}
                  </div>
                </div>

                {/* Nome do Paciente */}
                <div className="bg-slate-800/90 border border-slate-700/80 p-5 rounded-3xl shadow-inner max-w-2xl mx-auto">
                  <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest block mb-1">
                    PACIENTE
                  </span>
                  <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white capitalize tracking-tight line-clamp-2">
                    {activeCall.patientName}
                  </h2>
                </div>

                {/* Local & Examinador */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
                  <div className="bg-blue-600/20 border border-blue-500/40 p-4 rounded-2xl flex items-center gap-3.5 shadow-md">
                    <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-blue-300 block">DIRIGIR-SE AO</span>
                      <span className="text-lg sm:text-xl font-black text-white block">{activeCall.roomName}</span>
                    </div>
                  </div>

                  <div className="bg-indigo-600/20 border border-indigo-500/40 p-4 rounded-2xl flex items-center gap-3.5 shadow-md">
                    <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-md">
                      <Stethoscope className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-indigo-300 block">EXAMINADOR</span>
                      <span className="text-lg sm:text-xl font-black text-white block truncate max-w-[180px]">{activeCall.examinerName}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="my-auto py-12 space-y-4 text-slate-500">
                <Users className="w-16 h-16 mx-auto text-slate-700 animate-pulse" />
                <p className="text-xl font-bold text-slate-300">Aguardando chamada de paciente pelo examinador...</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Ao clicar em <strong>"Atender Paciente"</strong> ou <strong>"Chamar na TV"</strong> no consultório, a senha surge com anúncio visual e sonoro imediato.
                </p>
              </div>
            )}

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span>Sincronização em Tempo Real via Rede LAN</span>
              <span>{activeClinic.code}</span>
            </div>
          </div>

          {/* Fila de Espera dos Próximos Pacientes */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-amber-400">
                <Clock className="w-4 h-4" />
                <span>AGUARDANDO ATENDIMENTO ({waitingPatients.length})</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full">
                Fila do Dia
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-40 overflow-y-auto">
              {waitingPatients.length === 0 ? (
                <div className="col-span-full py-4 text-center text-slate-600 text-xs font-medium">
                  Nenhum paciente aguardando no momento.
                </div>
              ) : (
                waitingPatients.slice(0, 6).map((apt, idx) => (
                  <div 
                    key={apt.id} 
                    className="p-2.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-2 hover:border-amber-400/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono font-black text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md shrink-0">
                        {apt.ticketNumber || `P-${String(idx + 1).padStart(2, '0')}`}
                      </span>
                      <span className="font-bold text-xs text-white truncate">
                        {apt.patientName}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA (5 colunas): TELA DE APOIO / PROPAGANDAS / VÍDEOS / BANNERS */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
          
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex-1 flex flex-col justify-between relative overflow-hidden min-h-[380px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                  Espaço da Clínica & Informes
                </h3>
              </div>
              {activeMediaItems.length > 1 && (
                <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                  {((currentMediaIndex % activeMediaItems.length) + 1)} / {activeMediaItems.length}
                </span>
              )}
            </div>

            {/* Conteúdo Dinâmico da Propaganda / Vídeo / Dica */}
            <div className="flex-1 flex flex-col justify-center items-center text-center">
              {currentItem ? (
                <div className="w-full h-full flex flex-col justify-center items-center space-y-4 animate-fadeIn">
                  
                  {/* VÍDEO DO YOUTUBE / MP4 */}
                  {currentItem.type === 'video' && currentItem.url && (
                    <div className="w-full h-64 sm:h-72 md:h-80 rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-inner relative">
                      {currentItem.url.includes('youtube') || currentItem.url.includes('youtu.be') ? (
                        <iframe
                          src={getEmbedYouTubeUrl(currentItem.url)}
                          title={currentItem.title}
                          className="w-full h-full border-0 pointer-events-none"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <video
                          src={currentItem.url}
                          autoPlay
                          muted
                          loop
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  )}

                  {/* IMAGEM / BANNER PROMOCIONAL */}
                  {currentItem.type === 'image' && currentItem.url && (
                    <div className="w-full h-64 sm:h-72 md:h-80 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner flex items-center justify-center">
                      <img 
                        src={currentItem.url} 
                        alt={currentItem.title} 
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}

                  {/* TEXTO / DICA DE SAÚDE / INFORME INSTITUCIONAL */}
                  {currentItem.type === 'text' && (
                    <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-blue-500/30 p-8 rounded-3xl shadow-xl max-w-md w-full space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/30">
                        <Type className="w-6 h-6" />
                      </div>
                      <h4 className="text-xl font-black text-white">
                        {currentItem.title}
                      </h4>
                      <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium">
                        {currentItem.textContent}
                      </p>
                    </div>
                  )}

                  <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                    <span>{currentItem.title}</span>
                  </div>
                </div>
              ) : (
                <div className="py-16 text-slate-600 space-y-2">
                  <Tv className="w-12 h-12 mx-auto text-slate-800" />
                  <p className="text-xs font-bold text-slate-500">Tela de Apoio Ativa</p>
                  <p className="text-[11px] text-slate-600">
                    Cadastre propagandas, vídeos institucionais ou dicas no menu <em>Configurações &gt; Propagandas & Mídia</em>.
                  </p>
                </div>
              )}
            </div>

            {/* Histórico das Últimas Chamadas Realizadas */}
            {callHistory.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-500 block">
                  Últimas Chamadas
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {callHistory.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-[11px] flex items-center gap-2 shrink-0">
                      <span className="font-mono font-bold text-amber-400">{item.ticketNumber}</span>
                      <span className="text-slate-300 font-medium truncate max-w-[100px]">{item.patientName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 3. RODAPÉ: LETREIRO DIGITAL CORRENTE (MARQUEE) */}
      <footer className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 shadow-xl flex items-center gap-3 overflow-hidden shrink-0">
        <div className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 shadow-md">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Informativo</span>
        </div>

        <div className="overflow-hidden whitespace-nowrap flex-1">
          <div className="inline-block animate-marquee text-xs font-bold text-slate-300 tracking-wide">
            {mediaSettings.marqueeText || '🌟 Bem-vindo! Cuide da saúde dos seus olhos. Atendimento oftalmológico de excelência.'}
          </div>
        </div>
      </footer>
    </div>
  );
};
export default WaitingRoomPage;
