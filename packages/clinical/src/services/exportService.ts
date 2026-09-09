import { Patient, ClinicalEncounter, Prescription } from '@optotipo/shared';
import { offlineDb } from './offlineDb';

export function exportPatientData(patient: Patient, encounters: ClinicalEncounter[], prescriptions: Prescription[]): string {
  const payload = {
    exportDate: new Date().toISOString(),
    lgpdCompliance: 'Direito de Acesso e Portabilidade dos Dados do Titular (Art. 18 LGPD)',
    patient,
    encounters,
    prescriptions
  };
  return JSON.stringify(payload, null, 2);
}

export function downloadJsonFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
