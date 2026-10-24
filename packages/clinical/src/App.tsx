import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Patient, ClinicalEncounter, UserAccount, ClinicConfig } from '@optotipo/shared';
import { lanController } from './services/lanController';
import { authService } from './services/authService';
import { offlineDb } from './services/offlineDb';
import { licensingService } from './services/licensingService';
import { 
  Glasses, 
  Users, 
  Settings, 
  Tv, 
  LayoutDashboard, 
  LogOut, 
  UserCheck, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Crown,
  ExternalLink,
  Loader2,
  UserPlus,
  QrCode
} from 'lucide-react';
import { RemoteControlQRCodeModal } from './components/RemoteControlQRCodeModal';
import { 
  SyncStatusBadge,
  OptomedBrandLogo,
  IconAgendaCalendar,
  IconPatientProfile,
  IconClinicPOS,
  IconReportsAnalytics,
  IconMonitorTV,
  IconSettingsLicense,
  IconDoorLogout
} from './components/SyncStatusBadge';
import { DoctorNotificationToast } from './components/DoctorNotificationToast';
import { ConnectivityIndicator } from './components/ConnectivityIndicator';
import { LoginPage } from './pages/LoginPage';
import { SubscriptionBannerModal } from './components/SubscriptionBannerModal';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';

// Code Splitting & Lazy Loading (Carregamento Dinâmico sob Demanda)
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const SchedulePage = lazy(() => import('./pages/SchedulePage').then(m => ({ default: m.SchedulePage })));
const PatientsList = lazy(() => import('./pages/PatientsList').then(m => ({ default: m.PatientsList })));
const ExaminationWorkspace = lazy(() => import('./pages/ExaminationWorkspace').then(m => ({ default: m.ExaminationWorkspace })));
const DevicePairingPage = lazy(() => import('./pages/DevicePairingPage').then(m => ({ default: m.DevicePairingPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const MasterAdminPage = lazy(() => import('./pages/MasterAdminPage').then(m => ({ default: m.MasterAdminPage })));
const FinancialManagementPage = lazy(() => import('./pages/FinancialManagementPage').then(m => ({ default: m.FinancialManagementPage })));
const WaitingRoomPage = lazy(() => import('./pages/WaitingRoomPage').then(m => ({ default: m.WaitingRoomPage })));
const DoctorWorkspacePage = lazy(() => import('./pages/DoctorWorkspacePage').then(m => ({ default: m.DoctorWorkspacePage })));
const OptotipoTVApp = lazy(() => import('./optotipo-tv/App').then(m => ({ default: m.App })));
const RemoteControlPanel = lazy(() => import('./components/RemoteControlPanel').then(m => ({ default: m.RemoteControlPanel })));

// Fallback ultra-leve de carregamento
const PageSuspenseFallback = () => (
  <div className="w-full h-full min-h-[300px] flex items-center justify-center p-8 text-slate-400">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <span className="text-xs font-bold text-slate-500">Carregando módulo clínico...</span>
    </div>
  </div>
);

export function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(authService.getCurrentUser());
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'schedule' | 'doctor_workspace' | 'waiting_room' | 'optotipo_tv' | 'patients' | 'finance' | 'reports' | 'examination' | 'pairing' | 'settings' | 'master_admin'>('schedule');
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [activeEncounter, setActiveEncounter] = useState<ClinicalEncounter | undefined>(undefined);
  const [activeClinic, setActiveClinic] = useState<ClinicConfig>(offlineDb.getActiveClinic());
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const mainContentRef = useRef<HTMLElement | null>(null);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('optomed_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('optomed_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Helper para mapear título contextual da página atual
  const getPageContextTitle = (page: typeof currentPage) => {
    switch (page) {
      case 'dashboard':
        return { title: 'Visão Geral', subtitle: 'Painel Central da Clínica' };
      case 'schedule':
        return { title: 'Agenda Médica', subtitle: 'Grade de Horários & Consultas' };
      case 'doctor_workspace':
        return { title: 'Painel do Examinador', subtitle: 'Fila de Atendimento & Consultório' };
      case 'patients':
        return { title: 'Recepção & Triagem', subtitle: 'Fila de Pacientes & Cadastros' };
      case 'waiting_room':
        return { title: 'TV Sala de Espera', subtitle: 'Chamador & Painel de Espera' };
      case 'optotipo_tv':
        return { title: 'TV Optotipo', subtitle: '17 Módulos de Testes de Acuidade' };
      case 'pairing':
        return { title: 'Pareamento TV', subtitle: 'Conexão LAN WebSocket' };
      case 'finance':
        return { title: 'Financeiro & PDV', subtitle: 'Fluxo de Caixa, Vendas & Repasses' };
      case 'reports':
        return { title: 'Relatórios & BI', subtitle: 'Métricas, Desempenho & Auditoria' };
      case 'settings':
        return { title: 'Configurações', subtitle: 'Parâmetros da Unidade & Licenças' };
      case 'master_admin':
        return { title: 'Gestão Master SaaS', subtitle: 'Superadmin Multi-unidades' };
      case 'examination':
        return { title: 'Prontuário & Exame', subtitle: 'Atendimento Clínico Ativo' };
      default:
        return { title: 'Clínica', subtitle: 'Sistema de Atendimento' };
    }
  };

  const pageMeta = getPageContextTitle(currentPage);

  // Scroll to top automático imediato sempre que o usuário navegar entre telas
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [currentPage]);


  // Verifica se a URL foi aberta diretamente para o Painel da TV da Recepção (?tv=1), TV Optotipo (?optotype=1) ou Controle Remoto (?controle=1)
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isTvOnlyMode = urlParams?.get('tv') === '1' || urlParams?.get('tela') === 'espera';
  const isOptotypeOnlyMode = urlParams?.get('optotype') === '1' || urlParams?.get('tela') === 'optotipo' || urlParams?.get('direct') === '1';
  const isRemoteOnlyMode = urlParams?.get('controle') === '1' || urlParams?.get('remote') === '1' || urlParams?.get('tela') === 'controle' || (typeof window !== 'undefined' && window.location.pathname.startsWith('/controle'));

  // Pareamento por QR Code direto com token e sala
  useEffect(() => {
    if (!urlParams) return;
    const authParam = urlParams.get('auth');
    const roomParam = urlParams.get('room');
    const clinicParam = urlParams.get('clinic');

    if (roomParam) {
      lanController.setPairedRoom(roomParam);
    }
    if (clinicParam && clinicParam !== 'all') {
      offlineDb.setActiveClinicId(clinicParam);
      setActiveClinic(offlineDb.getActiveClinic());
    }

    if (authParam) {
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(authParam))));
        if (decoded && decoded.token && decoded.user) {
          authService.loginWithToken(decoded.token, decoded.user);
          setCurrentUser(decoded.user);
          lanController.reconnect(decoded.user.clinicId || 'ivs', decoded.token);
        }
      } catch (e) {
        console.warn('[QR Auth] Falha ao processar login automático via QR Code:', e);
      }
    }
  }, []);

  // Função auxiliar para determinar a primeira tela conforme o princípio "O que preciso fazer agora?"
  const getDefaultPageForRole = (role?: string): 'schedule' | 'doctor_workspace' | 'master_admin' | 'finance' => {
    if (role === 'superadmin') return 'master_admin';
    if (role === 'examiner') return 'doctor_workspace';
    if (role === 'finance') return 'finance';
    return 'schedule'; // Recepção, Admin, etc.
  };

  useEffect(() => {
    lanController.connect();
    if (currentUser?.clinicId && currentUser.clinicId !== 'all') {
      offlineDb.setActiveClinicId(currentUser.clinicId);
    }
    setActiveClinic(offlineDb.getActiveClinic());
    if (isTvOnlyMode) {
      setCurrentPage('waiting_room');
    } else if (currentUser) {
      setCurrentPage(getDefaultPageForRole(currentUser.role));
    }
  }, []);

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    const targetClinicId = (user.clinicId && user.clinicId !== 'all') ? user.clinicId : 'ivs';
    offlineDb.setActiveClinicId(targetClinicId);
    setActiveClinic(offlineDb.getActiveClinic());
    
    // Reconecta e registra o WebSocket com a clínica e token de sessão do usuário recém-autenticado
    const token = typeof localStorage !== 'undefined' ? (localStorage.getItem('optotipo_clinical_auth_token_v2') || undefined) : undefined;
    lanController.reconnect(targetClinicId, token);

    setCurrentPage(getDefaultPageForRole(user.role));
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    lanController.reconnect('ivs', undefined);
  };

  const handleStartEncounter = (patient: Patient, encounter?: ClinicalEncounter) => {
    setActivePatient(patient);
    setActiveEncounter(encounter);
    setCurrentPage('examination');
  };

  const handleSelectPatientFromList = (patient: Patient) => {
    setActivePatient(patient);
    setActiveEncounter(undefined);
    setCurrentPage('examination');
  };

  const handleClinicChange = (clinicId: string) => {
    authService.switchClinic(clinicId);
    setCurrentUser(authService.getCurrentUser());
    setActiveClinic(offlineDb.getActiveClinic());
    
    // Sincroniza e reconecta o WebSocket para a nova clínica selecionada
    const token = typeof localStorage !== 'undefined' ? (localStorage.getItem('optotipo_clinical_auth_token_v2') || undefined) : undefined;
    lanController.reconnect(clinicId, token);

    setRefreshTrigger(prev => prev + 1);
  };

  if (isRemoteOnlyMode) {
    return (
      <Suspense fallback={<PageSuspenseFallback />}>
        <div className="w-screen h-screen bg-slate-950 text-slate-100 overflow-y-auto font-sans">
          <RemoteControlPanel isStandalone={true} />
        </div>
      </Suspense>
    );
  }

  if (isTvOnlyMode) {
    return (
      <Suspense fallback={<PageSuspenseFallback />}>
        <div className="w-screen h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
          <WaitingRoomPage activeClinic={activeClinic} isStandalone={true} />
        </div>
      </Suspense>
    );
  }

  if (isOptotypeOnlyMode) {
    return (
      <Suspense fallback={<PageSuspenseFallback />}>
        <div className="w-screen h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
          <OptotipoTVApp isStandalone={true} />
        </div>
      </Suspense>
    );
  }

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const clinicsList = offlineDb.getClinics();
  const isSuperAdmin = currentUser.role === 'superadmin';
  const accessStatus = licensingService.checkAccessStatus(activeClinic.id);
  const isBlocked = !isSuperAdmin && !accessStatus.hasAccess;

  return (
    <div className="w-screen h-screen flex bg-slate-900 text-slate-900 overflow-hidden font-sans antialiased selection:bg-blue-600 selection:text-white flex-col">
      
      {/* Banner Superior de Status de Licença / Assinatura */}
      {!isSuperAdmin && (
        <SubscriptionBannerModal 
          clinicId={activeClinic.id} 
          clinicName={activeClinic.name}
          isBlocked={isBlocked}
          onRefresh={() => {
            setActiveClinic(offlineDb.getActiveClinic());
            setRefreshTrigger(prev => prev + 1);
          }}
        />
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Backdrop escuro no celular/tablet quando o menu lateral estiver aberto */}
        {isMobileMenuOpen && (
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-xs transition-opacity"
          />
        )}


        {/* Barra Lateral de Navegação Executiva Clean (Paleta Original OPTOMED, Modos Expandido e Compacto) */}
        <aside className={`
          fixed lg:static top-0 bottom-0 left-0 z-40 
          ${isSidebarCollapsed ? 'w-72 lg:w-20' : 'w-72 lg:w-68'} 
          bg-white/95 backdrop-blur-md text-slate-700 
          flex flex-col justify-between border-r border-slate-200/80 shrink-0 no-print shadow-lg lg:shadow-xs 
          transition-all duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            
            {/* LOGOTIPO OFICIAL OPTOMED COM BOTÃO DE TOGGLE EXPANDIR/COLAPSAR */}
            <div className={`p-3.5 border-b border-slate-100 flex items-center bg-slate-50/60 ${isSidebarCollapsed ? 'justify-center lg:px-2' : 'justify-between'}`}>
              <div className={`p-1.5 bg-white rounded-2xl border border-slate-200/60 shadow-xs flex items-center ${isSidebarCollapsed ? 'justify-center' : 'flex-1 mr-2'}`}>
                <OptomedBrandLogo size="md" showText={!isSidebarCollapsed} darkText={true} />
              </div>
              
              {/* Botão de colapsar / expandir no desktop */}
              <button
                type="button"
                onClick={toggleSidebarCollapse}
                className="hidden lg:flex p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all cursor-pointer shadow-2xs"
                title={isSidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
                aria-label={isSidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
              >
                {isSidebarCollapsed ? <PanelLeft className="w-4 h-4 text-blue-600" /> : <PanelLeftClose className="w-4 h-4 text-slate-500 hover:text-blue-600" />}
              </button>

              {/* Botão fechar gaveta no mobile */}
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="lg:hidden p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
                title="Fechar Menu"
              >
                ✕
              </button>
            </div>

            {/* Seletor Executivo de Consultório / Unidade */}
            {(isSuperAdmin || currentUser.role === 'admin') ? (
              <div className={`px-3 pt-3.5 pb-2 ${isSidebarCollapsed ? 'lg:px-2' : ''}`}>
                {!isSidebarCollapsed ? (
                  <>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Unidade Ativa
                      </span>
                      <span className="text-[10px] font-semibold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded-md border border-sky-100">
                        {activeClinic.code}
                      </span>
                    </div>
                    <div className="relative">
                      <select
                        value={activeClinic.id}
                        onChange={(e) => handleClinicChange(e.target.value)}
                        className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 appearance-none shadow-xs cursor-pointer transition-all pr-8"
                      >
                        {clinicsList.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </>
                ) : (
                  <div className="flex justify-center" title={`Unidade Ativa: ${activeClinic.name} (${activeClinic.code})`}>
                    <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center font-bold text-xs shadow-2xs">
                      {activeClinic.code?.slice(0, 3) || 'CLI'}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Perfil Ativo Badge Clean Pastel */
              <div className={`px-3 pt-3 pb-1 ${isSidebarCollapsed ? 'lg:px-2' : ''}`}>
                <div className={`p-2 rounded-xl border text-xs flex items-center shadow-xs ${
                  isSidebarCollapsed ? 'justify-center' : 'justify-between'
                } ${
                  currentUser.role === 'examiner'
                    ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
                    : 'bg-indigo-50/70 border-indigo-200/80 text-indigo-900'
                }`} title={`${currentUser.fullName} • ${currentUser.role === 'reception' ? 'Recepção' : 'Examinador'}`}>
                  <div className={`flex items-center gap-2 overflow-hidden ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                    <div className={`p-1.5 rounded-lg shrink-0 ${currentUser.role === 'examiner' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      <UserCheck className="w-4 h-4" />
                    </div>
                    {!isSidebarCollapsed && (
                      <div className="overflow-hidden">
                        <div className="font-bold truncate text-[12px]">{currentUser.fullName}</div>
                        <div className="text-[10px] font-medium opacity-75">
                          {currentUser.role === 'reception' ? 'Recepção' : 'Examinador'} • {activeClinic.code}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Itens de Navegação em Blocos Executivos com Tons Suaves Institucionais */}
            <nav 
              className={`py-2 space-y-4 ${isSidebarCollapsed ? 'px-2' : 'px-3'}`}
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setIsMobileMenuOpen(false);
                }
              }}
            >
              
              {/* Bloco Super Admin: Gestão Master SaaS */}
              {isSuperAdmin && (
                <div>
                  {!isSidebarCollapsed && (
                    <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-amber-600/90 flex items-center gap-1.5">
                      <Crown className="w-3 h-3 text-amber-500" />
                      <span>Administração Geral</span>
                    </div>
                  )}
                  <button
                    onClick={() => setCurrentPage('master_admin')}
                    title="Gestão Master SaaS (Clínicas, Licenças & Faturas)"
                    className={`w-full rounded-xl font-bold text-xs flex items-center transition-all cursor-pointer ${
                      isSidebarCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5 gap-2.5'
                    } ${
                      currentPage === 'master_admin'
                        ? 'bg-amber-100/90 text-amber-900 border-l-4 border-amber-500 shadow-xs'
                        : 'text-slate-600 hover:text-amber-900 hover:bg-amber-50/70 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <Crown className="w-4 h-4" />
                    </div>
                    {!isSidebarCollapsed && (
                      <div className="text-left flex-1">
                        <div className="leading-tight font-bold">Gestão Master SaaS</div>
                        <div className="text-[10px] text-amber-700 font-normal">Clínicas, Licenças & Faturas</div>
                      </div>
                    )}
                  </button>
                </div>
              )}

              {/* SEÇÃO 1: CLÍNICA & ATENDIMENTO */}
              <div>
                {!isSidebarCollapsed && (
                  <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Atendimento Clínico
                  </div>
                )}
                <div className="space-y-1">
                  {/* Painel do Examinador */}
                  {currentUser.role !== 'reception' && (
                    <button
                      onClick={() => setCurrentPage('doctor_workspace')}
                      title="Painel do Examinador (Fila & Consultório)"
                      className={`w-full rounded-xl font-semibold text-xs flex items-center transition-all cursor-pointer ${
                        isSidebarCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5 gap-2.5'
                      } ${
                        currentPage === 'doctor_workspace'
                          ? 'bg-emerald-50 text-emerald-800 border-l-4 border-emerald-500 font-bold shadow-xs'
                          : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50/50 border-l-4 border-transparent'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        currentPage === 'doctor_workspace' ? 'bg-emerald-200/80 text-emerald-800' : 'bg-emerald-100/60 text-emerald-700'
                      }`}>
                        🩺
                      </div>
                      {!isSidebarCollapsed && (
                        <div className="text-left flex-1">
                          <div className="leading-tight">Painel do Examinador</div>
                          <div className="text-[10px] text-slate-400 font-normal">Fila & Consultório</div>
                        </div>
                      )}
                    </button>
                  )}

                  {/* Agenda do Consultório */}
                  <button
                    onClick={() => setCurrentPage('schedule')}
                    title="Agenda Médica (Horários e Agendamentos)"
                    className={`w-full rounded-xl font-semibold text-xs flex items-center transition-all cursor-pointer ${
                      isSidebarCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5 gap-2.5'
                    } ${
                      currentPage === 'schedule'
                        ? 'bg-sky-50 text-sky-800 border-l-4 border-blue-600 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-sky-800 hover:bg-sky-50/50 border-l-4 border-transparent'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      currentPage === 'schedule' ? 'bg-sky-200/80 text-sky-800' : 'bg-sky-100/60 text-sky-700'
                    }`}>
                      <IconAgendaCalendar className="w-4 h-4" />
                    </div>
                    {!isSidebarCollapsed && (
                      <div className="text-left flex-1">
                        <div className="leading-tight">Agenda Médica</div>
                        <div className="text-[10px] text-slate-400 font-normal">Horários e Agendamentos</div>
                      </div>
                    )}
                  </button>

                  {/* Recepção, Triagem & Pacientes */}
                  <button
                    onClick={() => setCurrentPage('patients')}
                    title="Recepção & Triagem (Pacientes, Cadastros & Fila)"
                    className={`w-full rounded-xl font-semibold text-xs flex items-center transition-all cursor-pointer ${
                      isSidebarCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5 gap-2.5'
                    } ${
                      currentPage === 'patients'
                        ? 'bg-blue-50 text-blue-800 border-l-4 border-blue-600 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-blue-800 hover:bg-blue-50/50 border-l-4 border-transparent'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      currentPage === 'patients' ? 'bg-blue-200/80 text-blue-800' : 'bg-blue-100/60 text-blue-700'
                    }`}>
                      <IconPatientProfile className="w-4 h-4" />
                    </div>
                    {!isSidebarCollapsed && (
                      <div className="text-left flex-1">
                        <div className="leading-tight">Recepção & Triagem</div>
                        <div className="text-[10px] text-slate-400 font-normal">Pacientes, Cadastros & Fila</div>
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* SEÇÃO 2: TELAS & DISPOSITIVOS */}
              <div>
                {!isSidebarCollapsed && (
                  <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Telas & Equipamentos
                  </div>
                )}
                <div className="space-y-1">
                  {/* TV Sala de Espera */}
                  <div className="relative group">
                    <button
                      onClick={() => setCurrentPage('waiting_room')}
                      title="TV Sala de Espera (Chamador & Espera)"
                      className={`w-full rounded-xl font-semibold text-xs flex items-center transition-all cursor-pointer ${
                        isSidebarCollapsed ? 'justify-center p-2.5' : 'px-3 py-2 gap-2.5'
                      } ${
                        currentPage === 'waiting_room'
                          ? 'bg-cyan-50 text-cyan-800 border-l-4 border-cyan-500 font-bold shadow-xs'
                          : 'text-slate-600 hover:text-cyan-800 hover:bg-cyan-50/50 border-l-4 border-transparent'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-cyan-100/70 text-cyan-700 flex items-center justify-center shrink-0">
                        📢
                      </div>
                      {!isSidebarCollapsed && (
                        <div className="text-left flex-1">
                          <div className="leading-tight flex items-center justify-between">
                            <span>TV Recepção</span>
                            <span className="text-[9px] bg-cyan-100 text-cyan-800 px-1.5 py-0.2 rounded font-mono font-bold">TV</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-normal">Chamador & Espera</div>
                        </div>
                      )}
                    </button>
                    {!isSidebarCollapsed && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(window.location.origin + '/?tv=1', '_blank');
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-white/90 hover:bg-cyan-100 text-slate-500 hover:text-cyan-800 border border-slate-200 shadow-xs transition-all cursor-pointer"
                        title="Abrir TV Sala de Espera em Nova Aba / Telão da TV"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* TV Optotipo Exames (Integrado 100% na Nuvem) */}
                  <div className="relative group">
                    <button
                      onClick={() => setCurrentPage('optotipo_tv')}
                      title="TV Optotipo (17 Módulos de Testes de Acuidade Visual)"
                      className={`w-full rounded-xl font-semibold text-xs flex items-center transition-all cursor-pointer ${
                        isSidebarCollapsed ? 'justify-center p-2.5' : 'px-3 py-2 gap-2.5'
                      } ${
                        currentPage === 'optotipo_tv'
                          ? 'bg-purple-50 text-purple-900 border-l-4 border-purple-500 font-bold shadow-xs'
                          : 'text-slate-600 hover:text-purple-900 hover:bg-purple-50/60 border-l-4 border-transparent'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-100/70 text-purple-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        👁️
                      </div>
                      {!isSidebarCollapsed && (
                        <div className="text-left flex-1">
                          <div className="leading-tight flex items-center justify-between">
                            <span>TV Optotipo</span>
                            <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded font-mono font-bold">ONLINE</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-normal">17 Módulos de Testes</div>
                        </div>
                      )}
                    </button>
                    {!isSidebarCollapsed && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(window.location.origin + '/?optotype=1', '_blank');
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-white/90 hover:bg-purple-100 text-slate-500 hover:text-purple-800 border border-slate-200 shadow-xs transition-all cursor-pointer"
                        title="Abrir TV Optotipo em Nova Aba / TV do Consultório"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Pareamento TV LAN */}
                  {currentUser.role !== 'reception' && (
                    <button
                      onClick={() => setCurrentPage('pairing')}
                      title="Pareamento TV (Sincronização LAN WebSocket)"
                      className={`w-full rounded-xl font-semibold text-xs flex items-center transition-all cursor-pointer ${
                        isSidebarCollapsed ? 'justify-center p-2.5' : 'px-3 py-2 gap-2.5'
                      } ${
                        currentPage === 'pairing'
                          ? 'bg-slate-100 text-slate-900 border-l-4 border-slate-500 font-bold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border-l-4 border-transparent'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                        <IconMonitorTV className="w-4 h-4" />
                      </div>
                      {!isSidebarCollapsed && (
                        <div className="text-left flex-1">
                          <div className="leading-tight">Pareamento TV</div>
                          <div className="text-[10px] text-slate-400 font-normal">Sincronização LAN</div>
                        </div>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* SEÇÃO 3: GESTÃO & RESULTADOS */}
              <div>
                {!isSidebarCollapsed && (
                  <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Gestão & Unidade
                  </div>
                )}
                <div className="space-y-1">
                  {/* Gestão Clínica & PDV */}
                  <button
                    onClick={() => setCurrentPage('finance')}
                    title="Financeiro & PDV (Caixa, Vendas, Repasses e Ordens)"
                    className={`w-full rounded-xl font-semibold text-xs flex items-center transition-all cursor-pointer ${
                      isSidebarCollapsed ? 'justify-center p-2.5' : 'px-3 py-2 gap-2.5'
                    } ${
                      currentPage === 'finance'
                        ? 'bg-teal-50 text-teal-900 border-l-4 border-teal-600 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-teal-900 hover:bg-teal-50/50 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-teal-100/70 text-teal-700 flex items-center justify-center shrink-0">
                      <IconClinicPOS className="w-4 h-4" />
                    </div>
                    {!isSidebarCollapsed && (
                      <div className="text-left flex-1">
                        <div className="leading-tight">Financeiro & PDV</div>
                        <div className="text-[10px] text-slate-400 font-normal">Caixa, Vendas e Ordens</div>
                      </div>
                    )}
                  </button>

                  {/* Relatórios */}
                  <button
                    onClick={() => setCurrentPage('reports')}
                    title="Relatórios & Estatísticas (Desempenho e Auditoria)"
                    className={`w-full rounded-xl font-semibold text-xs flex items-center transition-all cursor-pointer ${
                      isSidebarCollapsed ? 'justify-center p-2.5' : 'px-3 py-2 gap-2.5'
                    } ${
                      currentPage === 'reports'
                        ? 'bg-slate-100 text-slate-900 border-l-4 border-slate-500 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                      <IconReportsAnalytics className="w-4 h-4" />
                    </div>
                    {!isSidebarCollapsed && (
                      <div className="text-left flex-1">
                        <div className="leading-tight">Relatórios</div>
                        <div className="text-[10px] text-slate-400 font-normal">Estatísticas & Exportação</div>
                      </div>
                    )}
                  </button>

                  {/* Configurações & Licença */}
                  <button
                    onClick={() => setCurrentPage('settings')}
                    title="Configurações (Dados da Clínica & Licenças)"
                    className={`w-full rounded-xl font-semibold text-xs flex items-center transition-all cursor-pointer ${
                      isSidebarCollapsed ? 'justify-center p-2.5' : 'px-3 py-2 gap-2.5'
                    } ${
                      currentPage === 'settings'
                        ? 'bg-slate-100 text-slate-900 border-l-4 border-slate-500 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                      <IconSettingsLicense className="w-4 h-4" />
                    </div>
                    {!isSidebarCollapsed && (
                      <div className="text-left flex-1">
                        <div className="leading-tight">Configurações</div>
                        <div className="text-[10px] text-slate-400 font-normal">Dados & Licença</div>
                      </div>
                    )}
                  </button>
                </div>
              </div>

            </nav>
          </div>

          {/* Rodapé Executivo Clean com Card de Usuário e Logout */}
          <div className={`p-3 border-t border-slate-100 bg-slate-50/60 space-y-2 shrink-0 ${isSidebarCollapsed ? 'px-2' : ''}`}>
            <button
              onClick={handleLogout}
              title="Trocar Usuário / Sair do Sistema"
              className={`w-full py-2 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 rounded-xl text-xs font-semibold flex items-center justify-center border border-slate-200 transition-all cursor-pointer shadow-2xs active:scale-98 ${
                isSidebarCollapsed ? 'p-2' : 'gap-2'
              }`}
            >
              <IconDoorLogout className="w-3.5 h-3.5 text-slate-500" />
              {!isSidebarCollapsed && <span>Trocar Usuário / Sair</span>}
            </button>
            {!isSidebarCollapsed && (
              <div className="text-center text-[10px] font-mono text-slate-400 font-semibold">
                OptoMed Clínica v2.5.0 • Build 19/09
              </div>
            )}
          </div>
        </aside>

        {/* Conteúdo Principal com Fundo Clean e Moderno */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/90">
          
          {/* Top Header com Identificação do Consultório, Breadcrumb Contextual e SyncStatus */}
          {currentPage !== 'examination' && (
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shadow-xs no-print sticky top-0 z-10">
              <div className="flex items-center gap-3">
                {/* Botão Hamburger para Celular e Tablet */}
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="lg:hidden p-2 -ml-1 text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  title="Abrir Menu"
                >
                  <span className="text-lg leading-none font-bold">☰</span>
                </button>

                {/* Título Contextual da Página com Breadcrumb Elegante */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2.5 h-2.5 rounded-full shadow-2xs ring-2 ring-white shrink-0" 
                      style={{ backgroundColor: isSuperAdmin ? '#D97706' : (activeClinic.primaryColor || '#2563EB') }}
                    />
                    <h1 className="text-slate-900 font-extrabold text-sm sm:text-base tracking-tight leading-none">
                      {pageMeta.title}
                    </h1>
                    <span className="hidden md:inline text-slate-300 font-light">•</span>
                    <span className="hidden md:inline text-xs font-semibold text-slate-500">
                      {isSuperAdmin ? 'Painel Master SaaS' : activeClinic.name}
                    </span>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-slate-400 font-normal">
                      {pageMeta.subtitle}
                    </span>
                    <span className="text-slate-300 text-[10px]">&bull;</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      SALA: <strong className="text-slate-800">{lanController.getPairedRoom()}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                {/* Botão QR Code para Parear Controle Remoto no Celular */}
                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all cursor-pointer"
                  title="Parear Controle Remoto no Celular via QR Code"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Controle Celular</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (currentPage !== 'patients') {
                      setCurrentPage('patients');
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('optomed_open_new_patient_modal'));
                      }, 100);
                    } else {
                      window.dispatchEvent(new CustomEvent('optomed_open_new_patient_modal'));
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all cursor-pointer"
                  title="Cadastrar Novo Paciente na Recepção"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Novo Paciente</span>
                </button>
                <ConnectivityIndicator />
                <SyncStatusBadge />
              </div>
            </header>
          )}

          {/* Renderizador de Páginas com Scroll Top Controlado */}
          <main ref={mainContentRef} className="flex-1 overflow-y-auto">
            {/* Toast de Notificação Instantânea para o Examinador quando um paciente é cadastrado */}
            <DoctorNotificationToast
              onStartEncounter={handleStartEncounter}
              onOpenPatientView={handleSelectPatientFromList}
              clinicId={currentUser.clinicId !== 'all' ? currentUser.clinicId : activeClinic.id}
            />

            <Suspense fallback={<PageSuspenseFallback />}>
              {currentPage === 'master_admin' && (
                <MasterAdminPage currentUser={currentUser} />
              )}

              {currentPage === 'doctor_workspace' && (
                <DoctorWorkspacePage
                  currentUser={currentUser}
                  activeClinic={activeClinic}
                  onStartEncounter={handleStartEncounter}
                  onSelectPatient={handleSelectPatientFromList}
                />
              )}

              {currentPage === 'schedule' && (
                <SchedulePage
                  onStartEncounter={(patient, encounter) => handleStartEncounter(patient, encounter)}
                  currentUser={currentUser}
                />
              )}

              {currentPage === 'waiting_room' && (
                <WaitingRoomPage activeClinic={activeClinic} onBack={() => setCurrentPage('schedule')} isStandalone={false} />
              )}

              {currentPage === 'optotipo_tv' && (
                <div className="flex-1 w-full h-full overflow-hidden bg-slate-50 flex flex-col">
                  <OptotipoTVApp onBack={() => setCurrentPage('schedule')} isStandalone={false} />
                </div>
              )}

              {currentPage === 'dashboard' && (
                <Dashboard
                  onStartEncounter={handleStartEncounter}
                  onNavigate={(page) => setCurrentPage(page as any)}
                  clinicId={currentUser.clinicId !== 'all' ? currentUser.clinicId : activeClinic.id}
                />
              )}

              {currentPage === 'patients' && (
                <PatientsList
                  onSelectPatient={handleSelectPatientFromList}
                  onStartEncounter={handleStartEncounter}
                  userRole={currentUser.role}
                  clinicId={currentUser.clinicId !== 'all' ? currentUser.clinicId : activeClinic.id}
                />
              )}

              {currentPage === 'finance' && (
                <FinancialManagementPage
                  currentUser={currentUser}
                  activeClinic={activeClinic}
                  clinicId={currentUser.clinicId !== 'all' ? currentUser.clinicId : activeClinic.id}
                  onUpgradePlan={() => setCurrentPage('settings')}
                />
              )}

              {currentPage === 'reports' && (
                <ReportsPage onNavigate={(page) => setCurrentPage(page as any)} />
              )}

              {currentPage === 'examination' && activePatient && (
                <ExaminationWorkspace
                  patient={activePatient}
                  encounter={activeEncounter}
                  isReadOnly={currentUser?.role === 'reception'}
                  userRole={currentUser?.role}
                  onBack={() => setCurrentPage('schedule')}
                  onPatientUpdated={(updated) => setActivePatient(updated)}
                />
              )}

              {currentPage === 'pairing' && (
                <DevicePairingPage onBack={() => setCurrentPage('schedule')} />
              )}

              {currentPage === 'settings' && (
                <SettingsPage 
                  currentUser={currentUser} 
                  onClinicUpdated={() => {
                    setActiveClinic(offlineDb.getActiveClinic());
                    setRefreshTrigger(prev => prev + 1);
                  }}
                />
              )}
            </Suspense>
          </main>
        </div>
      </div>

      {/* Modal de Pareamento por QR Code para Celular */}
      <RemoteControlQRCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        clinicId={currentUser.clinicId !== 'all' ? currentUser.clinicId : activeClinic.id}
        roomName={lanController.getPairedRoom()}
      />
    </div>
  );
}

export default App;
