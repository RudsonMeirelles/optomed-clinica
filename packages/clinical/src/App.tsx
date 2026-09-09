import React, { useState, useEffect } from 'react';
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
  Crown
} from 'lucide-react';
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
import { Dashboard } from './pages/Dashboard';
import { SchedulePage } from './pages/SchedulePage';
import { PatientsList } from './pages/PatientsList';
import { ExaminationWorkspace } from './pages/ExaminationWorkspace';
import { DevicePairingPage } from './pages/DevicePairingPage';
import { SettingsPage } from './pages/SettingsPage';
import { ReportsPage } from './pages/ReportsPage';
import { MasterAdminPage } from './pages/MasterAdminPage';
import { FinancialManagementPage } from './pages/FinancialManagementPage';
import { WaitingRoomPage } from './pages/WaitingRoomPage';
import { DoctorWorkspacePage } from './pages/DoctorWorkspacePage';
import { DoctorNotificationToast } from './components/DoctorNotificationToast';
import { LoginPage } from './pages/LoginPage';
import { SubscriptionBannerModal } from './components/SubscriptionBannerModal';

export function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(authService.getCurrentUser());
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'schedule' | 'doctor_workspace' | 'waiting_room' | 'patients' | 'finance' | 'reports' | 'examination' | 'pairing' | 'settings' | 'master_admin'>('schedule');
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [activeEncounter, setActiveEncounter] = useState<ClinicalEncounter | undefined>(undefined);
  const [activeClinic, setActiveClinic] = useState<ClinicConfig>(offlineDb.getActiveClinic());
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);


  // Verifica se a URL foi aberta diretamente para o Painel da TV da Recepção (?tv=1 ou ?tela=espera)
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isTvOnlyMode = urlParams?.get('tv') === '1' || urlParams?.get('tela') === 'espera';

  useEffect(() => {
    lanController.connect();
    setActiveClinic(offlineDb.getActiveClinic());
    if (isTvOnlyMode) {
      setCurrentPage('waiting_room');
    } else if (currentUser?.role === 'superadmin') {
      setCurrentPage('master_admin');
    }
  }, []);

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    setActiveClinic(offlineDb.getActiveClinic());
    if (user.role === 'superadmin') {
      setCurrentPage('master_admin');
    } else {
      setCurrentPage('schedule');
    }
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  const handleStartEncounter = (patient: Patient, encounter?: ClinicalEncounter) => {
    setActivePatient(patient);
    setActiveEncounter(encounter);
    setCurrentPage('examination');
  };

  const handleSelectPatientFromList = (patient: Patient) => {
    setActivePatient(patient);
    setActiveEncounter(undefined);
    if (currentUser?.role === 'reception') {
      return;
    }
    setCurrentPage('examination');
  };

  const handleClinicChange = (clinicId: string) => {
    authService.switchClinic(clinicId);
    setCurrentUser(authService.getCurrentUser());
    setActiveClinic(offlineDb.getActiveClinic());
    setRefreshTrigger(prev => prev + 1);
  };

  if (isTvOnlyMode) {
    return (
      <div className="w-screen h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
        <WaitingRoomPage activeClinic={activeClinic} isStandalone={true} />
      </div>
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


        {/* Barra Lateral de Navegação Executiva Clean (Paleta em Cores Pastel, Tons Suaves e Organização Intuitiva) */}
        <aside className={`
          fixed lg:static top-0 bottom-0 left-0 z-40 w-72 lg:w-68 
          bg-white/95 backdrop-blur-md text-slate-700 
          flex flex-col justify-between border-r border-slate-200/80 shrink-0 no-print shadow-lg lg:shadow-xs 
          transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            
            {/* LOGOTIPO OFICIAL OPTOMED (Modo Clean Pastel) */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="p-2 bg-white rounded-2xl border border-slate-200/60 shadow-xs flex-1">
                <OptomedBrandLogo size="md" showText={true} darkText={true} />
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="lg:hidden ml-2 p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
                title="Fechar Menu"
              >
                ✕
              </button>
            </div>

            {/* Seletor Executivo de Consultório / Unidade */}
            {(isSuperAdmin || currentUser.role === 'admin') ? (
              <div className="px-4 pt-3.5 pb-2">
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
              </div>
            ) : (
              /* Perfil Ativo Badge Clean Pastel */
              <div className="px-4 pt-3 pb-1">
                <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between shadow-xs ${
                  currentUser.role === 'examiner'
                    ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
                    : 'bg-indigo-50/70 border-indigo-200/80 text-indigo-900'
                }`}>
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className={`p-1.5 rounded-lg ${currentUser.role === 'examiner' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-bold truncate text-[12px]">{currentUser.fullName}</div>
                      <div className="text-[10px] font-medium opacity-75">
                        {currentUser.role === 'reception' ? 'Recepção' : 'Examinador'} • {activeClinic.code}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Itens de Navegação em Blocos Executivos com Tons Pastel */}
            <nav 
              className="px-3 py-2 space-y-4"
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setIsMobileMenuOpen(false);
                }
              }}
            >
              
              {/* Bloco Super Admin: Gestão Master SaaS */}
              {isSuperAdmin && (
                <div>
                  <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-amber-600/90 flex items-center gap-1.5">
                    <Crown className="w-3 h-3 text-amber-500" />
                    <span>Administração Geral</span>
                  </div>
                  <button
                    onClick={() => setCurrentPage('master_admin')}
                    className={`w-full px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                      currentPage === 'master_admin'
                        ? 'bg-amber-100/90 text-amber-900 border border-amber-300/80 shadow-xs'
                        : 'text-slate-600 hover:text-amber-900 hover:bg-amber-50/70'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <Crown className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="leading-tight font-bold">Gestão Master SaaS</div>
                      <div className="text-[10px] text-amber-700 font-normal">Clínicas, Licenças & Faturas</div>
                    </div>
                  </button>
                </div>
              )}

              {/* SEÇÃO 1: CLÍNICA & ATENDIMENTO */}
              <div>
                <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Atendimento Clínico
                </div>
                <div className="space-y-1">
                  {/* Painel do Examinador */}
                  {currentUser.role !== 'reception' && (
                    <button
                      onClick={() => setCurrentPage('doctor_workspace')}
                      className={`w-full px-3 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                        currentPage === 'doctor_workspace'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold shadow-xs'
                          : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50/50'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        currentPage === 'doctor_workspace' ? 'bg-emerald-200/80 text-emerald-800' : 'bg-emerald-100/60 text-emerald-700'
                      }`}>
                        🩺
                      </div>
                      <div className="text-left flex-1">
                        <div className="leading-tight">Painel do Examinador</div>
                        <div className="text-[10px] text-slate-400 font-normal">Fila & Consultório</div>
                      </div>
                    </button>
                  )}

                  {/* Agenda do Consultório */}
                  <button
                    onClick={() => setCurrentPage('schedule')}
                    className={`w-full px-3 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                      currentPage === 'schedule'
                        ? 'bg-sky-50 text-sky-800 border border-sky-200 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-sky-800 hover:bg-sky-50/50'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      currentPage === 'schedule' ? 'bg-sky-200/80 text-sky-800' : 'bg-sky-100/60 text-sky-700'
                    }`}>
                      <IconAgendaCalendar className="w-4 h-4" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="leading-tight">Agenda Médica</div>
                      <div className="text-[10px] text-slate-400 font-normal">Horários e Agendamentos</div>
                    </div>
                  </button>

                  {/* Recepção & Pacientes */}
                  <button
                    onClick={() => setCurrentPage('patients')}
                    className={`w-full px-3 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                      currentPage === 'patients'
                        ? 'bg-blue-50 text-blue-800 border border-blue-200 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-blue-800 hover:bg-blue-50/50'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      currentPage === 'patients' ? 'bg-blue-200/80 text-blue-800' : 'bg-blue-100/60 text-blue-700'
                    }`}>
                      <IconPatientProfile className="w-4 h-4" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="leading-tight">Pacientes & Triagem</div>
                      <div className="text-[10px] text-slate-400 font-normal">Cadastros e Prontuários</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* SEÇÃO 2: TELAS & DISPOSITIVOS */}
              <div>
                <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Telas & Equipamentos
                </div>
                <div className="space-y-1">
                  {/* TV Sala de Espera */}
                  <button
                    onClick={() => setCurrentPage('waiting_room')}
                    className={`w-full px-3 py-2 rounded-xl font-semibold text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                      currentPage === 'waiting_room'
                        ? 'bg-cyan-50 text-cyan-800 border border-cyan-200 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-cyan-800 hover:bg-cyan-50/50'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-cyan-100/70 text-cyan-700 flex items-center justify-center shrink-0">
                      📢
                    </div>
                    <div className="text-left flex-1">
                      <div className="leading-tight">TV Sala de Espera</div>
                      <div className="text-[10px] text-slate-400 font-normal">Chamador & Mídia</div>
                    </div>
                  </button>

                  {/* TV Optotipo Exames (:5173) */}
                  <a
                    href="http://optomed.app.br:5173"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full px-3 py-2 rounded-xl font-semibold text-xs flex items-center gap-2.5 transition-all cursor-pointer text-slate-600 hover:text-purple-900 hover:bg-purple-50/60 border border-slate-100 group"
                    title="Abrir a TV Optotipo de Acuidade Visual (Porta 5173)"
                  >
                    <div className="w-7 h-7 rounded-lg bg-purple-100/70 text-purple-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      👁️
                    </div>
                    <div className="text-left flex-1">
                      <div className="leading-tight flex items-center justify-between">
                        <span>TV Optotipo</span>
                        <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded font-mono font-bold">:5173</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">17 Módulos de Testes</div>
                    </div>
                  </a>

                  {/* Pareamento TV LAN */}
                  {currentUser.role !== 'reception' && (
                    <button
                      onClick={() => setCurrentPage('pairing')}
                      className={`w-full px-3 py-2 rounded-xl font-semibold text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                        currentPage === 'pairing'
                          ? 'bg-slate-100 text-slate-900 border border-slate-300 font-bold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                        <IconMonitorTV className="w-4 h-4" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="leading-tight">Pareamento TV</div>
                        <div className="text-[10px] text-slate-400 font-normal">Sincronização LAN</div>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* SEÇÃO 3: GESTÃO & RESULTADOS */}
              <div>
                <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Gestão & Unidade
                </div>
                <div className="space-y-1">
                  {/* Gestão Clínica & PDV */}
                  <button
                    onClick={() => setCurrentPage('finance')}
                    className={`w-full px-3 py-2 rounded-xl font-semibold text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                      currentPage === 'finance'
                        ? 'bg-teal-50 text-teal-900 border border-teal-200 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-teal-900 hover:bg-teal-50/50'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-teal-100/70 text-teal-700 flex items-center justify-center shrink-0">
                      <IconClinicPOS className="w-4 h-4" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="leading-tight">Financeiro & PDV</div>
                      <div className="text-[10px] text-slate-400 font-normal">Caixa, Vendas e Ordens</div>
                    </div>
                  </button>

                  {/* Relatórios */}
                  <button
                    onClick={() => setCurrentPage('reports')}
                    className={`w-full px-3 py-2 rounded-xl font-semibold text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                      currentPage === 'reports'
                        ? 'bg-slate-100 text-slate-900 border border-slate-300 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                      <IconReportsAnalytics className="w-4 h-4" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="leading-tight">Relatórios</div>
                      <div className="text-[10px] text-slate-400 font-normal">Estatísticas & Exportação</div>
                    </div>
                  </button>

                  {/* Configurações & Licença */}
                  <button
                    onClick={() => setCurrentPage('settings')}
                    className={`w-full px-3 py-2 rounded-xl font-semibold text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                      currentPage === 'settings'
                        ? 'bg-slate-100 text-slate-900 border border-slate-300 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                      <IconSettingsLicense className="w-4 h-4" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="leading-tight">Configurações</div>
                      <div className="text-[10px] text-slate-400 font-normal">Dados & Licença</div>
                    </div>
                  </button>
                </div>
              </div>

            </nav>
          </div>

          {/* Rodapé Executivo Clean com Card de Usuário e Logout */}
          <div className="p-3 border-t border-slate-100 bg-slate-50/60 space-y-2 shrink-0">
            <button
              onClick={handleLogout}
              className="w-full py-2 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-slate-200 transition-all cursor-pointer shadow-2xs active:scale-98"
            >
              <IconDoorLogout className="w-3.5 h-3.5 text-slate-500" />
              <span>Trocar Usuário / Sair</span>
            </button>
          </div>
        </aside>

        {/* Conteúdo Principal com Fundo Clean e Moderno */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/90">
          
          {/* Top Header com Identificação do Consultório e SyncStatus */}
          {currentPage !== 'examination' && (
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shadow-xs no-print sticky top-0 z-10">
              <div className="flex items-center gap-2 sm:gap-3 text-xs font-bold text-slate-700">
                {/* Botão Hamburger para Celular e Tablet */}
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="lg:hidden p-2 -ml-1 text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  title="Abrir Menu"
                >
                  <span className="text-lg leading-none font-bold">☰</span>
                </button>

                <div 
                  className="w-3 h-3 rounded-full shadow-sm ring-2 ring-white shrink-0" 
                  style={{ backgroundColor: isSuperAdmin ? '#D97706' : (activeClinic.primaryColor || '#2563EB') }}
                />
                <span className="text-slate-900 font-extrabold tracking-tight truncate max-w-[140px] sm:max-w-none">
                  {isSuperAdmin ? 'Painel Master SaaS' : activeClinic.name}
                </span>
                <span className="hidden sm:inline text-slate-300">&bull;</span>
                <span className="hidden sm:inline text-slate-500 font-mono text-[11px]">
                  SALA: <strong className="text-slate-900">{lanController.getPairedRoom()}</strong>
                </span>
              </div>

              <div className="flex items-center gap-3">
                <SyncStatusBadge />
              </div>
            </header>
          )}

          {/* Renderizador de Páginas */}
          <main className="flex-1 overflow-y-auto">
            {/* Toast de Notificação Instantânea para o Examinador quando um paciente é cadastrado */}
            {currentUser.role !== 'reception' && (
              <DoctorNotificationToast
                onStartEncounter={handleStartEncounter}
                onOpenPatientView={handleSelectPatientFromList}
              />
            )}

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
                onStartEncounter={(patient) => handleStartEncounter(patient)}
                currentUser={currentUser}
              />
            )}

            {currentPage === 'waiting_room' && (
              <WaitingRoomPage activeClinic={activeClinic} />
            )}

            {currentPage === 'dashboard' && (
              <Dashboard
                onStartEncounter={handleStartEncounter}
                onNavigate={(page) => setCurrentPage(page as any)}
              />
            )}

            {currentPage === 'patients' && (
              <PatientsList
                onSelectPatient={handleSelectPatientFromList}
                userRole={currentUser.role}
              />
            )}

            {currentPage === 'finance' && (
              <FinancialManagementPage
                currentUser={currentUser}
                activeClinic={activeClinic}
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
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
