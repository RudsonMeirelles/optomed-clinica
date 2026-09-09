import { UserAccount, UserRole, ClinicConfig } from '@optotipo/shared';
import { DEFAULT_CLINICS, offlineDb } from './offlineDb';

const AUTH_USER_KEY = 'optotipo_clinical_auth_user_v2';
const DB_USERS_KEY = 'optotipo_users_accounts_v2';

export const INITIAL_PRESET_USERS: (UserAccount & { passwordHash: string })[] = [
  // Super Administrador Master (Dono da Plataforma SaaS - Acesso a todas as clínicas, faturamento e gestão de licenças)
  {
    id: 'user-superadmin',
    username: 'superadmin',
    email: 'admin@optomed.app.br',
    fullName: 'Diretoria Executiva SaaS',
    role: 'superadmin',
    clinicId: 'all',
    clinicName: 'Gestão Global SaaS (Todas as Clínicas)',
    passwordHash: 'admin'
  },
  // Administrador Geral
  {
    id: 'user-admin',
    username: 'admin',
    email: 'suporte@optomed.app.br',
    fullName: 'Administrador Master',
    role: 'superadmin',
    clinicId: 'all',
    clinicName: 'Gestão Global SaaS',
    passwordHash: 'admin'
  },
  // Consultório 1: IVS
  {
    id: 'user-ivs-examinador',
    username: 'dr.meirelles',
    email: 'meirelles@ivs.med.br',
    fullName: 'Dr. Rudson Meirelles',
    role: 'examiner',
    clinicId: 'ivs',
    clinicName: 'IVS - Instituto da Visão e Saúde',
    registryNumber: 'CRM/CROO 123456',
    passwordHash: '123456'
  },
  {
    id: 'user-ivs-recepcao',
    username: 'recepcao.ivs',
    email: 'recepcao@ivs.med.br',
    fullName: 'Recepção IVS',
    role: 'reception',
    clinicId: 'ivs',
    clinicName: 'IVS - Instituto da Visão e Saúde',
    passwordHash: '123456'
  },
  // Consultório 2: Mega Star
  {
    id: 'user-megastar-examinador',
    username: 'dr.megastar',
    email: 'meirelles@megastar.med.br',
    fullName: 'Dr. Rudson Meirelles (Mega Star)',
    role: 'examiner',
    clinicId: 'megastar',
    clinicName: 'Mega Star Consultório Oftalmológico',
    registryNumber: 'CRM/CROO 123456',
    passwordHash: '123456'
  },
  {
    id: 'user-megastar-recepcao',
    username: 'recepcao.megastar',
    email: 'recepcao@megastar.med.br',
    fullName: 'Recepção Mega Star',
    role: 'reception',
    clinicId: 'megastar',
    clinicName: 'Mega Star Consultório Oftalmológico',
    passwordHash: '123456'
  },
  // Consultório 3: Vision
  {
    id: 'user-vision-examinador',
    username: 'dr.vision',
    email: 'meirelles@vision.med.br',
    fullName: 'Dr. Rudson Meirelles (Vision)',
    role: 'examiner',
    clinicId: 'vision',
    clinicName: 'Vision Clínica dos Olhos',
    registryNumber: 'CRM/CROO 123456',
    passwordHash: '123456'
  },
  {
    id: 'user-vision-recepcao',
    username: 'recepcao.vision',
    email: 'recepcao@vision.med.br',
    fullName: 'Recepção Vision',
    role: 'reception',
    clinicId: 'vision',
    clinicName: 'Vision Clínica dos Olhos',
    passwordHash: '123456'
  },
  // Consultório 4: Outro Consultório
  {
    id: 'user-outro-examinador',
    username: 'dr.outro',
    email: 'dr.outro@optomed.app.br',
    fullName: 'Dr. Rudson Meirelles (Consultório 4)',
    role: 'examiner',
    clinicId: 'outro',
    clinicName: 'Consultório Dr. Meirelles',
    registryNumber: 'CRM/CROO 123456',
    passwordHash: '123456'
  }
];

class AuthService {
  private currentUser: UserAccount | null = null;

  constructor() {
    this.loadSession();
  }

  public getUsers(): (UserAccount & { passwordHash?: string })[] {
    try {
      const raw = localStorage.getItem(DB_USERS_KEY);
      if (!raw) {
        localStorage.setItem(DB_USERS_KEY, JSON.stringify(INITIAL_PRESET_USERS));
        return INITIAL_PRESET_USERS;
      }
      return JSON.parse(raw);
    } catch {
      return INITIAL_PRESET_USERS;
    }
  }

  public saveUsers(users: (UserAccount & { passwordHash?: string })[]): void {
    try {
      localStorage.setItem(DB_USERS_KEY, JSON.stringify(users));
    } catch {}
  }

  public saveUser(user: UserAccount & { passwordHash?: string }): void {
    const list = this.getUsers();
    const idx = list.findIndex(u => u.id === user.id || u.username.toLowerCase() === user.username.toLowerCase());
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...user };
    } else {
      list.push(user);
    }
    this.saveUsers(list);
  }

  public deleteUser(userId: string): void {
    const list = this.getUsers().filter(u => u.id !== userId);
    this.saveUsers(list);
  }

  public getUsersByClinic(clinicId: string): (UserAccount & { passwordHash?: string })[] {
    const users = this.getUsers();
    if (clinicId === 'all') return users;
    return users.filter(u => u.clinicId === clinicId || u.clinicId === 'all');
  }

  public addStaffMember(data: {
    clinicId: string;
    fullName: string;
    username: string;
    role: UserRole;
    password?: string;
    email?: string;
    phone?: string;
    registryNumber?: string;
  }): { success: boolean; error?: string; user?: UserAccount } {
    const users = this.getUsers();
    const cleanUsername = data.username.toLowerCase().trim();

    if (users.some(u => u.username.toLowerCase() === cleanUsername)) {
      return { success: false, error: 'Nome de usuário (login) já em uso. Escolha outro.' };
    }

    const clinic = offlineDb.getClinics().find(c => c.id === data.clinicId);
    if (!clinic && data.clinicId !== 'all') {
      return { success: false, error: 'Clínica não encontrada.' };
    }

    const newUser: UserAccount & { passwordHash: string } = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      username: cleanUsername,
      fullName: data.fullName.trim(),
      role: data.role,
      clinicId: data.clinicId,
      clinicName: clinic ? clinic.name : 'Gestão Global',
      email: data.email?.trim(),
      phone: data.phone?.trim(),
      registryNumber: data.registryNumber?.trim(),
      passwordHash: data.password || '123456',
      isActive: true,
      createdAt: new Date().toISOString()
    };

    this.saveUser(newUser);
    return { success: true, user: newUser };
  }

  public updateUser(userId: string, partial: Partial<UserAccount & { passwordHash?: string }>): boolean {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return false;

    users[idx] = { ...users[idx], ...partial };
    this.saveUsers(users);
    return true;
  }

  public toggleUserActive(userId: string): boolean {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return false;
    user.isActive = user.isActive === undefined ? false : !user.isActive;
    this.saveUsers(users);
    return true;
  }

  // Criação autônoma de nova clínica (Self-Service Onboarding)
  public registerNewClinic(data: {
    clinicName: string;
    ownerName: string;
    ownerEmail: string;
    username: string;
    password: string;
    phone?: string;
    city?: string;
    country?: 'Brasil' | 'Paraguai';
    plan?: 'monthly' | 'semiannual' | 'annual' | 'trial';
  }): { success: boolean; error?: string; user?: UserAccount; clinic?: ClinicConfig } {
    const users = this.getUsers();
    const usernameClean = data.username.toLowerCase().trim();
    const emailClean = data.ownerEmail.toLowerCase().trim();

    if (users.some(u => u.username.toLowerCase() === usernameClean || (u.email && u.email.toLowerCase() === emailClean))) {
      return { success: false, error: 'Este usuário ou e-mail já está cadastrado. Por favor, utilize outro.' };
    }

    const clinicId = `cli_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const clinicCode = data.clinicName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase() || 'CLINIC';

    const now = new Date();
    const expires = new Date();
    expires.setDate(expires.getDate() + 14); // 14 dias de teste grátis

    const newClinic: ClinicConfig = {
      id: clinicId,
      code: clinicCode,
      name: data.clinicName.trim(),
      tagline: 'Clínica Oftalmológica & Optometria',
      city: data.city || (data.country === 'Paraguai' ? 'Ciudad del Este' : 'Foz do Iguaçu'),
      country: data.country || 'Brasil',
      phone: data.phone || '',
      primaryColor: '#2563EB',
      ownerName: data.ownerName,
      ownerEmail: data.ownerEmail,
      createdAt: now.toISOString(),
      subscription: {
        plan: data.plan || 'trial',
        status: 'trial',
        startedAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        autoRenew: true,
        priceAmount: 0,
        hasManagementModule: (data.plan as any) !== 'basic_monthly',
        maxUsers: data.plan === 'annual' ? 99 : 5,
        maxDoctors: data.plan === 'annual' ? 99 : 2,
        licenseKey: `OPTO-${now.getFullYear()}-${(data.plan || 'trial').slice(0, 3).toUpperCase()}-${clinicCode.slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`
      }
    };

    offlineDb.saveClinic(newClinic);

    const newUser: UserAccount & { passwordHash: string } = {
      id: `usr_${Date.now()}`,
      username: usernameClean,
      fullName: data.ownerName.trim(),
      role: 'admin',
      clinicId: clinicId,
      clinicName: newClinic.name,
      email: data.ownerEmail,
      phone: data.phone,
      passwordHash: data.password,
      isActive: true,
      createdAt: now.toISOString()
    };

    this.saveUser(newUser);

    // Conecta imediatamente no novo tenant
    offlineDb.setActiveClinicId(clinicId);
    this.currentUser = newUser;
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(newUser));

    return { success: true, user: newUser, clinic: newClinic };
  }

  public login(
    emailOrUsername: string, 
    password: string, 
    selectedClinicId?: string
  ): { success: boolean; error?: string; user?: UserAccount } {
    const users = this.getUsers();
    const cleanInput = emailOrUsername.toLowerCase().trim();

    // Procura por email exato ou nome de usuário
    const found = users.find(
      u => (u.username.toLowerCase() === cleanInput || (u.email && u.email.toLowerCase() === cleanInput)) && 
           (u.passwordHash === password || !u.passwordHash)
    );

    if (!found) {
      return { success: false, error: 'E-mail, usuário ou senha incorretos.' };
    }

    let targetClinicId = found.clinicId;
    if (found.role === 'superadmin' || (found.role === 'admin' && found.clinicId === 'all')) {
      targetClinicId = selectedClinicId || offlineDb.getActiveClinicId() || 'ivs';
    }

    offlineDb.setActiveClinicId(targetClinicId);
    const clinicConfig = offlineDb.getActiveClinic();

    const user: UserAccount = {
      id: found.id,
      username: found.username,
      email: found.email,
      fullName: found.fullName,
      role: found.role,
      clinicId: targetClinicId,
      clinicName: targetClinicId === 'all' ? 'Gestão Global SaaS' : clinicConfig.name,
      registryNumber: found.registryNumber,
      customLogoUrl: found.customLogoUrl || clinicConfig.logoUrl
    };

    this.currentUser = user;
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    return { success: true, user };
  }

  public switchClinic(clinicId: string): void {
    if (this.currentUser && (this.currentUser.role === 'superadmin' || this.currentUser.role === 'admin')) {
      offlineDb.setActiveClinicId(clinicId);
      const clinicConfig = offlineDb.getActiveClinic();
      this.currentUser = {
        ...this.currentUser,
        clinicId,
        clinicName: clinicConfig.name
      };
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(this.currentUser));
    }
  }

  public logout(): void {
    this.currentUser = null;
    localStorage.removeItem(AUTH_USER_KEY);
  }

  public getCurrentUser(): UserAccount | null {
    if (!this.currentUser) {
      this.loadSession();
    }
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  }

  private loadSession(): void {
    try {
      const raw = localStorage.getItem(AUTH_USER_KEY);
      if (raw) {
        this.currentUser = JSON.parse(raw);
        if (this.currentUser?.clinicId && this.currentUser.clinicId !== 'all') {
          offlineDb.setActiveClinicId(this.currentUser.clinicId);
        }
      }
    } catch {
      this.currentUser = null;
    }
  }
}

export const authService = new AuthService();
