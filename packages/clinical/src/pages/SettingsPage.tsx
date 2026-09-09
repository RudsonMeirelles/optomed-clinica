import React, { useState, useEffect } from 'react';
import { AuditLogEntry, ClinicConfig, UserAccount, UserRole } from '@optotipo/shared';
import { 
  Settings, 
  ShieldCheck, 
  Download, 
  Database, 
  Lock, 
  Eye, 
  Trash2, 
  Building2, 
  User, 
  Palette, 
  Image as ImageIcon,
  Plus,
  Save,
  Check,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { offlineDb, DEFAULT_CLINICS, generateUUID } from '../services/offlineDb';
import { authService } from '../services/authService';
import { downloadJsonFile } from '../services/exportService';
import { WaitingRoomMediaManager } from '../components/WaitingRoomMediaManager';
import { TVOptotipoSettings } from '../components/TVOptotipoSettings';

interface SettingsPageProps {
  currentUser: UserAccount;
  onClinicUpdated?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ currentUser, onClinicUpdated }) => {
  const [activeTab, setActiveTab] = useState<'clinics' | 'users' | 'layout' | 'media' | 'audit' | 'tv'>('clinics');
  const [clinics, setClinics] = useState<ClinicConfig[]>([]);
  const [users, setUsers] = useState<(UserAccount & { passwordHash?: string })[]>([]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  // Edição de Consultório Selecionado
  const [selectedClinicId, setSelectedClinicId] = useState<string>(offlineDb.getActiveClinicId());
  const [clinicName, setClinicName] = useState<string>('');
  const [clinicTagline, setClinicTagline] = useState<string>('');
  const [clinicColor, setClinicColor] = useState<string>('#2563EB');
  const [clinicPhone, setClinicPhone] = useState<string>('');
  const [clinicAddress, setClinicAddress] = useState<string>('');
  const [clinicCity, setClinicCity] = useState<string>('');
  const [clinicLogoUrl, setClinicLogoUrl] = useState<string>('');

  // Novo Usuário Form
  const [newUsername, setNewUsername] = useState<string>('');
  const [newFullName, setNewFullName] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('examiner');
  const [newUserClinicId, setNewUserClinicId] = useState<string>('ivs');
  const [newUserPassword, setNewUserPassword] = useState<string>('123456');
  const [newUserRegistry, setNewUserRegistry] = useState<string>('');

  const loadData = () => {
    const list = offlineDb.getClinics();
    setClinics(list);
    setUsers(authService.getUsers());
    setLogs(offlineDb.getAuditLogs());

    const active = list.find(c => c.id === selectedClinicId) || list[0];
    if (active) {
      setClinicName(active.name);
      setClinicTagline(active.tagline || '');
      setClinicColor(active.primaryColor || '#2563EB');
      setClinicPhone(active.phone || '');
      setClinicAddress(active.address || '');
      setClinicCity(active.city || '');
      setClinicLogoUrl(active.logoUrl || '');
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedClinicId]);

  const showNotification = (msg: string) => {
    setSavedSuccess(msg);
    setTimeout(() => setSavedSuccess(null), 2500);
  };

  // Salva alterações no consultório
  const handleSaveClinic = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: ClinicConfig = {
      id: selectedClinicId,
      code: clinics.find(c => c.id === selectedClinicId)?.code || selectedClinicId.toUpperCase(),
      name: clinicName,
      tagline: clinicTagline,
      primaryColor: clinicColor,
      phone: clinicPhone,
      address: clinicAddress,
      city: clinicCity,
      logoUrl: clinicLogoUrl
    };

    offlineDb.saveClinic(updated);
    loadData();
    showNotification('Configurações do consultório salvas com sucesso!');
    if (onClinicUpdated) onClinicUpdated();
  };

  // Upload de Logo personalizado (Converte para Base64 local)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setClinicLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Criação de Novo Usuário
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    const clinic = clinics.find(c => c.id === newUserClinicId);
    const user: UserAccount & { passwordHash: string } = {
      id: generateUUID(),
      username: newUsername.toLowerCase().trim(),
      fullName: newFullName,
      role: newUserRole,
      clinicId: newUserClinicId,
      clinicName: clinic ? clinic.name : 'Consultório',
      registryNumber: newUserRegistry,
      passwordHash: newUserPassword
    };

    authService.saveUser(user);
    loadData();
    showNotification(`Usuário "${newUsername}" criado com sucesso!`);
    setNewUsername('');
    setNewFullName('');
    setNewUserRegistry('');
  };

  const handleDeleteUser = (id: string) => {
    if (confirm('Deseja realmente remover este usuário?')) {
      authService.deleteUser(id);
      loadData();
      showNotification('Usuário removido.');
    }
  };

  // Exportação de Backup do Consultório Ativo
  const handleExportData = () => {
    const active = offlineDb.getActiveClinic();
    const patients = offlineDb.getPatients();
    const encounters = offlineDb.getEncounters();
    const prescriptions = offlineDb.getPrescriptions();
    const appointments = offlineDb.getAppointments();

    const fullExport = {
      exportTimestamp: new Date().toISOString(),
      platform: 'Optotipo Meirelles Clinical v2.0 - Multi-Clinic Edition',
      clinic: active,
      patients,
      encounters,
      prescriptions,
      appointments,
      auditLogs: logs
    };

    downloadJsonFile(
      JSON.stringify(fullExport, null, 2), 
      `backup_${active.code.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.json`
    );
  };

  // Importação e Restauração de Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const success = offlineDb.restoreBackup(json);
        if (success) {
          loadData();
          showNotification('Backup restaurado com sucesso no consultório atual!');
        } else {
          alert('Erro ao restaurar backup. Estrutura do arquivo inválida.');
        }
      } catch (err) {
        alert('Falha ao processar arquivo JSON de backup.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 select-none">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              CONFIGURAÇÕES, USUÁRIOS & CONSULTÓRIOS
            </h1>
            <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
              Multi-Clínica Isolada
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestão de unidades independentes (IVS, Mega Star, Vision, Outro), logotipos, usuários e auditoria
          </p>
        </div>

        {savedSuccess && (
          <div className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg animate-bounce">
            <Check className="w-4 h-4" /> {savedSuccess}
          </div>
        )}
      </div>

      {/* Navegação por Abas */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('clinics')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors ${
            activeTab === 'clinics' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" /> Consultórios & Bancos de Dados
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors ${
            activeTab === 'users' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <User className="w-4 h-4" /> Usuários & Perfis de Acesso
        </button>

        <button
          onClick={() => setActiveTab('layout')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors ${
            activeTab === 'layout' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Palette className="w-4 h-4" /> Identidade Visual & Logo
        </button>

        <button
          onClick={() => setActiveTab('media')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors ${
            activeTab === 'media' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-300" /> Propagandas & Mídia da TV
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors ${
            activeTab === 'audit' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Backup & Auditoria LGPD
        </button>

        <button
          onClick={() => setActiveTab('tv')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors ${
            activeTab === 'tv' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Eye className="w-4 h-4" /> 📱 TV Optotipo / App
        </button>
      </div>

      {/* ================= ABA TV OPTOTIPO / QR PAREAMENTO ================= */}
      {activeTab === 'tv' && (
        <TVOptotipoSettings />
      )}

      {/* ================= ABA DE PROPAGANDAS & MÍDIA DA TV ================= */}
      {activeTab === 'media' && (
        <WaitingRoomMediaManager />
      )}

      {/* ================= ABA 1: CONSULTÓRIOS & BANCOS ISOLADOS ================= */}
      {activeTab === 'clinics' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Lista de Consultórios */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-black text-slate-900 uppercase">Consultórios Configurados:</h2>
            <div className="space-y-2">
              {clinics.map((clinic) => {
                const isSelected = clinic.id === selectedClinicId;
                return (
                  <div
                    key={clinic.id}
                    onClick={() => setSelectedClinicId(clinic.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-500 shadow-sm'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-900">{clinic.name}</span>
                      <span 
                        className="w-3 h-3 rounded-full shrink-0" 
                        style={{ backgroundColor: clinic.primaryColor || '#2563EB' }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                      <span>Cód: {clinic.code}</span>
                      <span>{clinic.city}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Edição do Consultório Selecionado */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-black text-slate-900 uppercase">
                Editar Dados do Consultório: {clinics.find(c => c.id === selectedClinicId)?.code}
              </h2>
              <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                Banco Isolado Ativo
              </span>
            </div>

            <form onSubmit={handleSaveClinic} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">NOME DO CONSULTÓRIO / CLÍNICA</label>
                <input
                  type="text"
                  required
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">SLOGAN / SUBTÍTULO NO RECEITUÁRIO</label>
                <input
                  type="text"
                  value={clinicTagline}
                  onChange={(e) => setClinicTagline(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">TELEFONE / WHATSAPP</label>
                  <input
                    type="text"
                    value={clinicPhone}
                    onChange={(e) => setClinicPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">CIDADE & ESTADO</label>
                  <input
                    type="text"
                    value={clinicCity}
                    onChange={(e) => setClinicCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">ENDEREÇO COMPLETO</label>
                <input
                  type="text"
                  value={clinicAddress}
                  onChange={(e) => setClinicAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 active:scale-95 transition-transform"
                >
                  <Save className="w-4 h-4" /> Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= ABA 2: USUÁRIOS & PERFIS ================= */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Formulário Novo Usuário */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-black text-slate-900 uppercase">Cadastrar Novo Usuário:</h2>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">LOGIN / USUÁRIO *</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Ex: dr.silva ou recepcao2"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">NOME COMPLETO *</label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Ex: Dr. Roberto Silva"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">PERFIL</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold"
                  >
                    <option value="examiner">Examinador</option>
                    <option value="reception">Recepção</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">CONSULTÓRIO</label>
                  <select
                    value={newUserClinicId}
                    onChange={(e) => setNewUserClinicId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold"
                  >
                    <option value="all">Global (Todos)</option>
                    {clinics.map(c => (
                      <option key={c.id} value={c.id}>{c.code}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">REGISTRO (CRM / CROO)</label>
                <input
                  type="text"
                  value={newUserRegistry}
                  onChange={(e) => setNewUserRegistry(e.target.value)}
                  placeholder="CRM/CROO 123456"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">SENHA *</label>
                <input
                  type="password"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-transform flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Criar Usuário
              </button>
            </form>
          </div>

          {/* Tabela de Usuários Cadastrados */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 uppercase">Usuários do Sistema & Senhas Cadastradas:</h2>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                🔒 Painel do Administrador
              </span>
            </div>
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">USUÁRIO / NOME</th>
                    <th className="p-2.5">SENHA</th>
                    <th className="p-2.5">PERFIL</th>
                    <th className="p-2.5">CONSULTÓRIO</th>
                    <th className="p-2.5 text-right">AÇÃO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="p-2.5">
                        <div className="font-bold text-slate-900">{u.fullName}</div>
                        <div className="text-[10px] font-mono text-slate-400">@{u.username}</div>
                      </td>
                      <td className="p-2.5">
                        <span className="font-mono font-bold text-xs bg-slate-100 px-2.5 py-1 rounded-md text-slate-800 border border-slate-200 select-all">
                          {u.passwordHash || '123456'}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          u.role === 'admin' || u.role === 'superadmin'
                            ? 'bg-blue-100 text-blue-800'
                            : u.role === 'examiner'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-2.5 font-bold text-slate-700">
                        {u.clinicId === 'all' ? '🌐 Todos os Consultórios' : clinics.find(c => c.id === u.clinicId)?.code || u.clinicId}
                      </td>
                      <td className="p-2.5 text-right">
                        {u.username !== 'admin' && u.username !== 'superadmin' && (
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Remover usuário"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ================= ABA 3: LOGO & IDENTIDADE VISUAL ================= */}
      {activeTab === 'layout' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900 uppercase">
              Personalização Visual do Consultório: {clinics.find(c => c.id === selectedClinicId)?.name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Defina o logotipo e a cor temática deste consultório para exibição no sistema e nos relatórios/receitas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Upload de Logotipo */}
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 text-center">
              <div 
                className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto border-2 border-dashed border-slate-300 overflow-hidden shadow-inner"
                style={{ backgroundColor: clinicColor }}
              >
                {clinicLogoUrl ? (
                  <img src={clinicLogoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <ImageIcon className="w-10 h-10 text-white/80" />
                )}
              </div>

              <div>
                <label className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer shadow-sm active:scale-95 transition-transform inline-block">
                  <span>Selecionar Imagem do Logo (PNG / JPG / SVG)</span>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
              </div>

              {clinicLogoUrl && (
                <button
                  type="button"
                  onClick={() => setClinicLogoUrl('')}
                  className="text-xs text-red-500 hover:underline block mx-auto"
                >
                  Remover Logo Atual
                </button>
              )}
            </div>

            {/* Seletor de Cores Temáticas */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">COR TEMÁTICA DA UNIDADE:</label>
                <div className="flex items-center gap-3">
                  {[
                    { color: '#2563EB', label: 'Azul Real (IVS)' },
                    { color: '#7C3AED', label: 'Roxo (Mega Star)' },
                    { color: '#059669', label: 'Verde Esmeralda (Vision)' },
                    { color: '#EA580C', label: 'Âmbar (Consultório 4)' },
                    { color: '#DC2626', label: 'Vermelho' },
                    { color: '#0F172A', label: 'Dark / Slate' }
                  ].map((preset) => (
                    <button
                      key={preset.color}
                      type="button"
                      onClick={() => setClinicColor(preset.color)}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        clinicColor === preset.color ? 'scale-125 border-slate-900 shadow-md' : 'border-transparent hover:scale-110'
                      }`}
                      style={{ backgroundColor: preset.color }}
                      title={preset.label}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">CÓDIGO HEX DA COR:</label>
                <input
                  type="text"
                  value={clinicColor}
                  onChange={(e) => setClinicColor(e.target.value)}
                  className="w-36 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-mono text-xs font-bold text-slate-900"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveClinic}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 active:scale-95 transition-transform"
              >
                <Save className="w-4 h-4" /> Aplicar Identidade Visual
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= ABA 4: BACKUP, BANCO DE DADOS & REDE/DOMÍNIO ================= */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {/* Card de Backup e Importação do Banco */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">Gerenciamento, Backup e Restauração do Banco de Dados</h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
              Exporte todos os prontuários, refrações, pacientes e prescrições deste consultório em formato estruturado JSON ou restaure um backup anterior salvo.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleExportData}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-blue-600/20 active:scale-95 transition-transform"
              >
                <Download className="w-4 h-4" /> Baixar Backup Local (JSON)
              </button>

              <label className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer border border-slate-300 transition-colors">
                <RefreshCw className="w-4 h-4 text-slate-600" />
                <span>Restaurar / Importar Backup</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  if (confirm(`Deseja remover todos os registros de demonstração/testes de ${clinics.find(c => c.id === selectedClinicId)?.name} e deixar apenas cadastros reais?`)) {
                    offlineDb.removeMockPatients(selectedClinicId);
                    loadData();
                    showNotification('Dados de teste removidos! Consultório com dados 100% reais.');
                  }
                }}
                className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                title="Limpa cadastros de demonstração do consultório atual"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Limpar Pacientes de Teste</span>
              </button>
            </div>
          </div>

          {/* Guia de Domínio Próprio e Rede Local */}
          <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-blue-400" />
              <div>
                <h2 className="text-base font-black">Como Rodar o Sistema em Rede e com Domínio Próprio</h2>
                <p className="text-xs text-slate-300">Instruções para acesso em computadores, tablets, celulares e TV Smart</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-white/10 p-4 rounded-xl space-y-2 backdrop-blur-sm border border-white/10">
                <p className="font-bold text-blue-300 flex items-center gap-1.5">
                  <span>🌐 Opção 1: Domínio na Internet / Nuvem</span>
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-200 text-[11px] leading-relaxed">
                  <li>Adquira um domínio no Registro.br ou GoDaddy (ex: <code className="text-amber-300 font-bold">meirellesvisao.com.br</code>).</li>
                  <li>Aponte o DNS (Tipo A ou CNAME) para o IP do seu servidor/VPS ou roteador da clínica.</li>
                  <li>Instale o certificado SSL (HTTPS gratuito via Let's Encrypt ou Cloudflare).</li>
                  <li>Toda a equipe acessa com login e senha de qualquer lugar em segurança.</li>
                </ol>
              </div>

              <div className="bg-white/10 p-4 rounded-xl space-y-2 backdrop-blur-sm border border-white/10">
                <p className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <span>🏢 Opção 2: Rede Local da Clínica (Wi-Fi / LAN)</span>
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-200 text-[11px] leading-relaxed">
                  <li>O computador central atua como servidor conectado ao Wi-Fi da clínica.</li>
                  <li>No roteador da clínica, reserve o IP do computador principal (ex: <code className="text-emerald-300 font-bold">192.168.1.144</code>).</li>
                  <li>Todos os dispositivos conectados ao mesmo Wi-Fi acessam instantaneamente via navegador pelo IP ou nome local da máquina.</li>
                  <li>Os atalhos automáticos criados na Área de Trabalho já estão configurados com o IP da clínica.</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-900">Trilha de Auditoria & Conformidade LGPD</h2>
              </div>
              <span className="text-xs text-slate-400 font-mono">{logs.length} eventos</span>
            </div>

            <div className="border border-slate-100 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                  <tr>
                    <th className="p-2.5">DATA / HORA</th>
                    <th className="p-2.5">USUÁRIO</th>
                    <th className="p-2.5">AÇÃO</th>
                    <th className="p-2.5">DETALHES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60">
                      <td className="p-2.5 text-slate-500">{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                      <td className="p-2.5 font-bold text-slate-800">{log.userName}</td>
                      <td className="p-2.5">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-600 font-sans">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
