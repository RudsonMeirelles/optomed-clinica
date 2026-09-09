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
        {/* Barra Lateral de Navegação Premium */}
        <aside className="w-68 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col justify-between border-r border-slate-800/80 shrink-0 no-print shadow-2xl z-20">
          <div className="overflow-y-auto">
            
            {/* NOVO LOGOTIPO OFICIAL OPTOMED (Olho Geométrico + Cruz Médica + Escudo Protetor) */}
            <div className="p-4 border-b border-slate-800/70">
              <div className="p-2.5 bg-slate-900/80 rounded-2xl border border-slate-800/80 shadow-inner">
                <OptomedBrandLogo size="md" showText={true} />
              </div>
            </div>

            {/* Troca Rápida de Consultório (Exclusivo para Super Administrador e Admin) */}
            {(isSuperAdmin || currentUser.role === 'admin') ? (
              <div className="px-4 pt-3">
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">
                  Unidade Selecionada:
                </label>
                <div className="relative">
                  <select
                    value={activeClinic.id}
                    onChange={(e) => handleClinicChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 focus:outline-none focus:border-blue-500 appearance-none shadow-sm cursor-pointer"
                  >
                    {clinicsList.map(c => (
                      <option key={c.id} value={c.id}>
                        🏥 {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            ) : (
              /* Perfil Ativo Badge */
              <div className="px-4 pt-3">
                <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between shadow-sm ${
                  currentUser.role === 'examiner'
                    ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                    : 'bg-purple-950/40 border-purple-800/60 text-purple-300'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${currentUser.role === 'examiner' ? 'bg-emerald-900/60 text-emerald-200' : 'bg-purple-900/60 text-purple-200'}`}>
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-bold truncate text-[11px] text-white">{currentUser.fullName}</div>
                      <div className="text-[9px] uppercase tracking-wider opacity-80">
                        {currentUser.role === 'reception' ? 'Recepção' : 'Examinador'} • {activeClinic.code}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Itens do Menu com Conjunto Completo de Ícones Modernos */}
            <nav className="p-3 space-y-1.5 mt-2">
              
              {/* Botão Master SaaS para Super Admin */}
              {isSuperAdmin && (
                <button
                  onClick={() => setCurrentPage('master_admin')}
                  className={`w-full px-3.5 py-3 rounded-xl font-bold text-xs flex items-center gap-3 transition-all cursor-pointer ${
                    currentPage === 'master_admin'
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-600/30'
                      : 'text-amber-400 hover:text-white hover:bg-slate-800/60 border border-amber-500/20'
                  }`}
                >
                  <Crown className="w-4 h-4 text-amber-300" />
                  <span>Gestão Master SaaS</span>
                </button>
              )}

              {/* Painel do Examinador (Exclusivo para Examinadores e Admins) */}
              {currentUser.role !== 'reception' && (
                <button
                  onClick={() => setCurrentPage('doctor_workspace')}
                  className={`w-full px-3.5 py-3 rounded-xl font-bold text-xs flex items-center gap-3 transition-all cursor-pointer ${
                    currentPage === 'doctor_workspace'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
                      : 'text-emerald-400 hover:text-white hover:bg-slate-800/60 border border-emerald-500/20'
                  }`}
                >
                  <div className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-black text-[10px] shrink-0 border border-emerald-500/40">
                    🩺
                  </div>
                  <div className="text-left">
                    <div className="leading-tight">Painel do Examinador</div>
                    <div className="text-[9px] text-emerald-300 font-normal">Fila & Métricas do Dia</div>
                  </div>
                </button>
              )}

              <button
                onClick={() => setCurrentPage('schedule')}
                className={`w-full px-3.5 py-3 rounded-xl font-bold text-xs flex items-center gap-3 transition-all cursor-pointer ${
                  currentPage === 'schedule'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <IconAgendaCalendar className="w-5 h-5 shrink-0" />
                <span>Agenda do Consultório</span>
              </button>

              {/* TV 1: Sala de Espera da Recepção (Chamador de Senhas + Propaganda) */}
              <button
                onClick={() => setCurrentPage('waiting_room')}
                className={`w-full px-3.5 py-3 rounded-xl font-bold text-xs flex items-center gap-3 transition-all cursor-pointer ${
                  currentPage === 'waiting_room'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="w-5 h-5 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-black text-[10px] shrink-0 border border-cyan-500/40">
                  📢
                </div>
                <div className="text-left">
                  <div className="leading-tight text-white">TV Sala de Espera</div>
                  <div className="text-[9px] text-cyan-300 font-normal">Painel de Senhas & Mídia</div>
                </div>
              </button>

              {/* TV 2: TV Optotipo do Consultório (17 Módulos de Testes Visuais na Porta 5173) */}
              <a
                href="http://optomed.app.br:5173"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-3.5 py-3 rounded-xl font-bold text-xs flex items-center gap-3 transition-all cursor-pointer text-indigo-300 hover:text-white hover:bg-indigo-950/50 border border-indigo-500/20 group"
                title="Abrir a TV Optotipo de Acuidade Visual e Exames (Porta 5173)"
              >
                <div className="w-5 h-5 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-black text-[10px] shrink-0 border border-indigo-500/40 group-hover:scale-110 transition-transform">
                  👁️
                </div>
                <div className="text-left flex-1">
                  <div className="leading-tight text-white flex items-center justify-between">
                    <span>TV Optotipo</span>
                    <span className="text-[8px] bg-indigo-500/30 text-indigo-200 px-1.5 py-0.5 rounded font-mono">:5173</span>
                  </div>
                  <div className="text-[9px] text-indigo-300 font-normal">Exames Clínicos (17 Módulos)</div>
                </div>
              </a>

              <button
                onClick={() => setCurrentPage('patients')}
                className={`w-full px-3.5 py-3 rounded-xl font-bold text-xs flex items-center gap-3 transition-all cursor-pointer ${
                  currentPage === 'patients'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <IconPatientProfile className="w-5 h-5 shrink-0" />
                <span>Recepção & Pacientes (BR/PY)</span>
              </button>

              <button
                onClick={() => setCurrentPage('finance')}
                className={`w-full px-3.5 py-3 rounded-xl font-bold text-xs flex items-center gap-3 transition-all cursor-pointer ${
                  currentPage === 'finance'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <IconClinicPOS className="w-5 h-5 shrink-0" />
                <span>Gestão da Clínica & PDV</span>
              </button>

              <button
                onClick={() => setCurrentPage('reports')}
                className={`w-full px-3.5 py-3 rounded-xl font-bold text-xs flex items-center gap-3 transition-all cursor-pointer ${
                  currentPage === 'reports'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <IconReportsAnalytics className="w-5 h-5 shrink-0" />
                <span>Relatórios & Estatísticas</span>
              </button>

              {currentUser.role !== 'reception' && (
                <button
                  onClick={() => setCurrentPage('pairing')}
                  className={`w-full px-3.5 py-3 rounded-xl font-bold text-xs flex items-center gap-3 transition-all cursor-pointer ${
                    currentPage === 'pairing'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <IconMonitorTV className="w-5 h-5 shrink-0" />
                  <span>Pareamento TV (LAN)</span>
                </button>
              )}

              <button
                onClick={() => setCurrentPage('settings')}
                className={`w-full px-3.5 py-3 rounded-xl font-bold text-xs flex items-center gap-3 transition-all cursor-pointer ${
                  currentPage === 'settings'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <IconSettingsLicense className="w-5 h-5 shrink-0" />
                <span>Configurações & Licença</span>
              </button>
            </nav>
          </div>

          {/* Rodapé com Card do Usuário e Logout */}
          <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 space-y-2 shrink-0">
            <button
              onClick={handleLogout}
              className="w-full py-2.5 bg-slate-900 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-slate-800 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <IconDoorLogout className="w-4 h-4" />
              <span>Trocar Usuário / Sair</span>
            </button>
          </div>
        </aside>

        {/* Conteúdo Principal com Fundo Clean e Moderno */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/90">
          
          {/* Top Header com Identificação do Consultório e SyncStatus */}
          {currentPage !== 'examination' && (
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 py-3 flex items-center justify-between shadow-xs no-print sticky top-0 z-10">
              <div className="flex items-center gap-3 text-xs font-bold text-slate-700">
                <div 
                  className="w-3 h-3 rounded-full shadow-sm ring-2 ring-white" 
                  style={{ backgroundColor: isSuperAdmin ? '#D97706' : (activeClinic.primaryColor || '#2563EB') }}
                />
                <span className="text-slate-900 font-extrabold tracking-tight">
                  {isSuperAdmin ? 'Painel de Administração Master SaaS' : activeClinic.name}
                </span>
                <span className="text-slate-300">&bull;</span>
                <span className="text-slate-500 font-mono text-[11px]">
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
