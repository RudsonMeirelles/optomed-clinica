/**
 * OPTOTIPO MEIRELLES - PROTOCOLOS RÁPIDOS DE ATENDIMENTO
 * Especificação v2.0 - Automação e sequências clínicas
 */
import { ActiveModuleType } from '../protocols/websocketMessages';
export interface ProtocolStep {
    stepNumber: number;
    title: string;
    description: string;
    module: ActiveModuleType;
    defaultAcuityId?: string;
    defaultEye?: 'OD' | 'OE' | 'AO';
    notes?: string;
}
export interface ClinicalProtocol {
    id: string;
    name: string;
    category: 'geral' | 'pediatrico' | 'especializado';
    description: string;
    steps: ProtocolStep[];
}
export declare const DEFAULT_CLINICAL_PROTOCOLS: ClinicalProtocol[];
//# sourceMappingURL=defaultProtocols.d.ts.map