import { Appointment, Patient } from '@optotipo/shared';

export interface SeedScheduleItem {
  time: string;
  name: string;
  phone?: string;
  nationality: 'BR' | 'PY';
  notes?: string;
  ticketNumber: string;
  isPending?: boolean;
}

export const RAW_SCHEDULE_12_09_2026: SeedScheduleItem[] = [
  { time: '08:00', name: 'Kamila Rios', phone: '(67) 99181-6055', nationality: 'BR', ticketNumber: 'P-01' },
  { time: '08:03', name: 'Rafael', phone: '(67) 99969-487', nationality: 'BR', ticketNumber: 'P-02' },
  { time: '08:06', name: 'José', phone: '+595 85456543', nationality: 'PY', ticketNumber: 'P-03' },
  { time: '08:09', name: 'Ademir Merey', phone: '(67) 99858-6390', nationality: 'BR', ticketNumber: 'P-04' },
  { time: '08:17', name: 'Eduardo', phone: '(67) 99194-7436', nationality: 'BR', ticketNumber: 'P-05' },
  { time: '08:22', name: 'Ana Luiza', phone: '(14) 99733-2075', nationality: 'BR', ticketNumber: 'P-06' },
  { time: '08:55', name: 'Francineia Asis', phone: '(67) 99238-8782', nationality: 'BR', ticketNumber: 'P-07' },
  { time: '08:58', name: 'Luana', phone: '(67) 99238-8782', nationality: 'BR', ticketNumber: 'P-08' },
  { time: '09:00', name: 'Marcela Geovana', phone: '(65) 99673-9868', nationality: 'BR', ticketNumber: 'P-09' },
  { time: '09:03', name: 'Helin', phone: '(67) 99885-9224', nationality: 'BR', ticketNumber: 'P-10' },
  { time: '09:15', name: 'Vitória Mariana', phone: '(15) 99176-5439', nationality: 'BR', ticketNumber: 'P-11' },
  { time: '09:18', name: 'Iara', phone: '+595 971 802 271', nationality: 'PY', notes: 'Filha do Eliezer', ticketNumber: 'P-12' },
  { time: '09:21', name: 'Eliane', phone: '+595 971 802 271', nationality: 'PY', ticketNumber: 'P-13' },
  { time: '09:30', name: 'Venino Ricardo', phone: '(67) 99316-2127', nationality: 'BR', ticketNumber: 'P-14' },
  { time: '10:00', name: 'Carlos', phone: '+595 971 826231', nationality: 'PY', notes: 'Esposo da Perla', ticketNumber: 'P-15' },
  { time: '10:03', name: 'Perla', phone: '+595 971 826231', nationality: 'PY', ticketNumber: 'P-16' },
  { time: '10:06', name: 'Silvio Lopes', phone: '(67) 99261-5135', nationality: 'BR', ticketNumber: 'P-17' },
  { time: '10:09', name: 'Maria Salvadora', phone: '(67) 9618-4136', nationality: 'BR', ticketNumber: 'P-18' },
  { time: '10:12', name: 'Carlos Alberto', phone: '(11) 9824-0975', nationality: 'BR', ticketNumber: 'P-19' },
  { time: '10:15', name: 'Paula', phone: '+595 971 171695', nationality: 'PY', ticketNumber: 'P-20' },
  { time: '10:27', name: 'Cristian Veron', phone: '+595 971 171695', nationality: 'PY', ticketNumber: 'P-21' },
  { time: '10:30', name: 'Mildel', phone: '', nationality: 'BR', notes: 'Filha do Kaique', ticketNumber: 'P-22' },
  { time: '13:00', name: 'Kaique', phone: '', nationality: 'BR', ticketNumber: 'P-23' },
  { time: '13:03', name: 'Carlito Romero', phone: '(67) 99619-8455', nationality: 'BR', ticketNumber: 'P-24' },
  { time: '13:30', name: 'Alex Alves da Cunha', phone: '(67) 99944-1618', nationality: 'BR', ticketNumber: 'P-25' },
  { time: '14:00', name: 'Loira Ribeiro', phone: '(67) 99249-3738', nationality: 'BR', ticketNumber: 'P-26' },
  { time: '14:03', name: 'Neiva Ribeiro', phone: '(67) 99249-3738', nationality: 'BR', ticketNumber: 'P-27' },
  { time: '14:06', name: 'Julia Mendonça', phone: '(67) 99607-1177', nationality: 'BR', ticketNumber: 'P-28' },
  { time: '14:09', name: 'Neri', phone: '(67) 99885-9224', nationality: 'BR', ticketNumber: 'P-29' },
  { time: '15:00', name: 'Samuel Torres', phone: '(67) 99307-0322', nationality: 'BR', notes: 'Filho da Juliana', ticketNumber: 'P-30' },
  { time: '15:03', name: 'July Ivonete Camargo', phone: '(67) 9975-5373', nationality: 'BR', ticketNumber: 'P-31' },
  { time: '15:06', name: 'Carol Walnier', phone: '(67) 99254-5141', nationality: 'BR', ticketNumber: 'P-32' },
  { time: '15:10', name: 'Juliana', phone: '(67) 99307-0322', nationality: 'BR', notes: 'Mãe do Samuel', ticketNumber: 'P-33' },
  { time: '16:00', name: 'Flávia', phone: '(67) 99801-5859', nationality: 'BR', ticketNumber: 'P-34' },
  { time: '16:30', name: 'Marcela Veron', phone: '(67) 99233-9776', nationality: 'BR', notes: 'PENDÊNCIA DE HORÁRIO / REAGENDAMENTO', ticketNumber: 'P-35', isPending: true },
  { time: '17:00', name: 'Manu Priscila', phone: '(67) 99806-4729', nationality: 'BR', ticketNumber: 'P-36' },
  { time: '17:03', name: 'Nicole', phone: '(67) 99806-4729', nationality: 'BR', notes: 'Filha da Manu Priscila', ticketNumber: 'P-37' }
];

export const SCHEDULE_DATE_12_09_2026 = '2026-09-12';

export const SEED_PATIENTS_12_09_2026: Patient[] = RAW_SCHEDULE_12_09_2026.map((item, idx) => {
  const patientId = 'pat-12092026-' + String(idx + 1).padStart(2, '0');
  return {
    id: patientId,
    fullName: item.name,
    birthDate: '',
    sex: 'uninformed',
    nationality: item.nationality,
    documentType: item.nationality === 'PY' ? 'CI_PY' : 'CPF',
    documentNumber: undefined,
    phoneCountryCode: item.nationality === 'PY' ? '+595' : '+55',
    phone: item.phone || undefined,
    city: item.nationality === 'PY' ? 'Ciudad del Este' : 'Foz do Iguaçu',
    country: item.nationality === 'PY' ? 'Paraguai' : 'Brasil',
    notes: item.notes || 'Agendamento para 12/09/2026',
    guardianName: item.notes && item.notes.toLowerCase().includes('filh') ? item.notes : undefined,
    lgpdConsent: true,
    createdAt: SCHEDULE_DATE_12_09_2026 + 'T' + item.time + ':00.000Z',
    updatedAt: SCHEDULE_DATE_12_09_2026 + 'T' + item.time + ':00.000Z'
  };
});

export const SEED_APPOINTMENTS_12_09_2026: Appointment[] = RAW_SCHEDULE_12_09_2026.map((item, idx) => {
  const patient = SEED_PATIENTS_12_09_2026[idx];
  const aptId = 'apt-12092026-' + String(idx + 1).padStart(2, '0');
  return {
    id: aptId,
    patientId: patient.id,
    patientName: item.name,
    patientNationality: item.nationality,
    patientPhone: item.phone,
    examinerId: 'user-examinador',
    examinerName: 'Dr. Rudson Meirelles',
    date: SCHEDULE_DATE_12_09_2026,
    time: item.time,
    durationMinutes: 3,
    type: 'refrativo',
    status: item.isPending ? 'scheduled' : 'scheduled',
    ticketNumber: item.ticketNumber,
    notes: item.notes ? (item.isPending ? '[PENDÊNCIA DE HORÁRIO] ' + item.notes : item.notes) : 'Consulta agendada',
    room: 'Consultório 1',
    createdAt: SCHEDULE_DATE_12_09_2026 + 'T' + item.time + ':00.000Z',
    updatedAt: SCHEDULE_DATE_12_09_2026 + 'T' + item.time + ':00.000Z'
  };
});
