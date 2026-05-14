export type CampaignType = "qualificacao" | "agendamento" | "reengajamento" | "pesquisa";
export type CampaignStatus = "rascunho" | "ativa" | "pausada" | "concluida";
export type LeadStatus =
  | "pendente" | "ligando" | "qualificado" | "recusado"
  | "nao_atendeu" | "caixa_postal" | "necessita_especialista"
  | "agendado" | "pessoa_errada" | "erro";
export type TelephonyProvider = "twilio" | "vono";
export type Sentiment = "positivo" | "neutro" | "negativo";

export interface Agent {
  id: string;
  name: string;
  description?: string;
  voiceId: string;
  voiceName: string;
  voiceProvider: string;
  personality: string;
  telephonyProvider: TelephonyProvider;
  phoneNumberFrom: string;
  model: string;
  temperature: number;
  maxTurns: number;
  isActive: boolean;
  avatarColor: string;
  createdAt: string;
  totalCalls?: number;
  conversionRate?: number;
  avgDuration?: number;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  type: CampaignType;
  status: CampaignStatus;
  agentId: string;
  agentName?: string;
  promptSystem: string;
  promptIntro: string;
  maxAttempts: number;
  intervalHours: number;
  createdAt: string;
  totalLeads: number;
  pendingLeads: number;
  qualifiedLeads: number;
  conversionRate: number;
}

export interface Lead {
  id: string;
  campaignId: string;
  campaignName?: string;
  agentName?: string;
  nome: string;
  telefone: string;
  email?: string;
  cnj?: string;
  poloAtivo?: string;
  valorCausa?: string;
  classeProcesso?: string;
  cargoVaga?: string;
  empresa?: string;
  status: LeadStatus;
  attempts: number;
  nextAttemptAt?: string;
  whatsappEnviado: boolean;
  resumoIa?: string;
  observacao?: string;
  lastCallAt?: string;
  durationSeconds?: number;
  createdAt: string;
}

export interface ActiveCall {
  id: string;
  leadName: string;
  leadPhone: string;
  campaignName: string;
  agentName: string;
  agentColor: string;
  startedAt: string;
  durationSeconds: number;
  sentiment: number; // 0..100
  speaking: "agent" | "lead";
  lastAgent: string;
  lastLead: string;
}
