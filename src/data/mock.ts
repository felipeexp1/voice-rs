import type { Agent, Campaign, Lead, ActiveCall } from "@/types";

export const agents: Agent[] = [
  {
    id: "a1", name: "Sofia", description: "Recrutadora virtual sênior, tom acolhedor e profissional",
    voiceId: "21m00Tcm4TlvDq8ikWAM", voiceName: "Rachel (PT-BR)", voiceProvider: "elevenlabs",
    personality: "Acolhedora, objetiva, empática", telephonyProvider: "twilio",
    phoneNumberFrom: "+55 11 4040-0001", model: "gpt-4o", temperature: 0.3, maxTurns: 8,
    isActive: true, avatarColor: "#F59E0B", createdAt: "2025-04-01T10:00:00Z",
    totalCalls: 1247, conversionRate: 38.4, avgDuration: 142,
  },
  {
    id: "a2", name: "Marcos", description: "Foco em agendamento de entrevistas técnicas",
    voiceId: "AZnzlk1XvdvUeBnXmlld", voiceName: "Antoni (PT-BR)", voiceProvider: "elevenlabs",
    personality: "Direto, gentil, executivo", telephonyProvider: "twilio",
    phoneNumberFrom: "+55 11 4040-0002", model: "gpt-4o", temperature: 0.25, maxTurns: 6,
    isActive: true, avatarColor: "#06B6D4", createdAt: "2025-04-12T10:00:00Z",
    totalCalls: 893, conversionRate: 41.7, avgDuration: 118,
  },
  {
    id: "a3", name: "Lara", description: "Especialista em reengajamento de candidatos",
    voiceId: "EXAVITQu4vr4xnSDxMaL", voiceName: "Bella (PT-BR)", voiceProvider: "elevenlabs",
    personality: "Calorosa, persuasiva", telephonyProvider: "vono",
    phoneNumberFrom: "+55 11 4040-0003", model: "gpt-4o-mini", temperature: 0.4, maxTurns: 7,
    isActive: true, avatarColor: "#10B981", createdAt: "2025-05-02T10:00:00Z",
    totalCalls: 612, conversionRate: 29.1, avgDuration: 96,
  },
  {
    id: "a4", name: "Davi", description: "Pesquisas de satisfação pós-onboarding",
    voiceId: "TxGEqnHWrfWFTfGW9XjX", voiceName: "Josh (PT-BR)", voiceProvider: "elevenlabs",
    personality: "Neutro, paciente", telephonyProvider: "twilio",
    phoneNumberFrom: "+55 11 4040-0004", model: "gpt-4o-mini", temperature: 0.2, maxTurns: 5,
    isActive: false, avatarColor: "#a78bfa", createdAt: "2025-03-21T10:00:00Z",
    totalCalls: 308, conversionRate: 22.0, avgDuration: 84,
  },
];

export const campaigns: Campaign[] = [
  {
    id: "c1", name: "Qualificação Tech Stack — Devs Pleno",
    description: "Triagem inicial para vagas de desenvolvedor pleno backend",
    type: "qualificacao", status: "ativa",
    agentId: "a1", agentName: "Sofia",
    promptSystem: "Você é Sofia, recrutadora virtual da Lovable Tech...",
    promptIntro: "Olá, falo com {lead_nome}? Aqui é Sofia da Lovable Tech, tudo bem?",
    maxAttempts: 3, intervalHours: 24, createdAt: "2025-05-04T08:00:00Z",
    totalLeads: 482, pendingLeads: 91, qualifiedLeads: 187, conversionRate: 38.8,
  },
  {
    id: "c2", name: "Agendamento — Analistas Jurídicos",
    description: "Agendar entrevistas para vagas no escritório SP",
    type: "agendamento", status: "ativa",
    agentId: "a2", agentName: "Marcos",
    promptSystem: "Você é Marcos, recrutador virtual do escritório...",
    promptIntro: "Olá {lead_nome}, aqui é Marcos do escritório Mendes & Cia.",
    maxAttempts: 4, intervalHours: 18, createdAt: "2025-05-08T08:00:00Z",
    totalLeads: 218, pendingLeads: 44, qualifiedLeads: 91, conversionRate: 41.7,
  },
  {
    id: "c3", name: "Reengajamento — Banco de Talentos Q1",
    description: "Reativar candidatos do banco de talentos do 1º trimestre",
    type: "reengajamento", status: "pausada",
    agentId: "a3", agentName: "Lara",
    promptSystem: "Você é Lara, mantém relacionamento com candidatos...",
    promptIntro: "Olá {lead_nome}, é a Lara — temos uma novidade pra você.",
    maxAttempts: 2, intervalHours: 48, createdAt: "2025-04-22T08:00:00Z",
    totalLeads: 1320, pendingLeads: 612, qualifiedLeads: 384, conversionRate: 29.1,
  },
  {
    id: "c4", name: "Pesquisa Satisfação — Onboarding Maio",
    description: "Pesquisa NPS de candidatos contratados em maio",
    type: "pesquisa", status: "rascunho",
    agentId: "a4", agentName: "Davi",
    promptSystem: "Você é Davi, conduz pesquisas de satisfação...",
    promptIntro: "Olá {lead_nome}, podemos falar 2 minutos sobre sua experiência?",
    maxAttempts: 2, intervalHours: 24, createdAt: "2025-05-12T08:00:00Z",
    totalLeads: 0, pendingLeads: 0, qualifiedLeads: 0, conversionRate: 0,
  },
];

const nomes = ["João Silva","Maria Santos","Pedro Lima","Ana Costa","Carlos Pereira","Juliana Souza","Rafael Almeida","Beatriz Rocha","Felipe Nogueira","Camila Dias","Lucas Martins","Patrícia Gomes","Bruno Carvalho","Larissa Ribeiro","Eduardo Azevedo","Fernanda Lopes"];
const status: Lead["status"][] = ["pendente","ligando","qualificado","recusado","nao_atendeu","caixa_postal","necessita_especialista","agendado"];
const cargos = ["Dev Backend Pleno","Analista Jurídico Pleno","Dev Frontend Sênior","Designer UX","Gerente de Produto"];
const empresas = ["Lovable Tech","Mendes & Cia","Vertex Labs","Nimbus Co","Argos Studio"];

export const leads: Lead[] = Array.from({ length: 36 }).map((_, i) => {
  const camp = campaigns[i % 3];
  const ag = agents.find(a => a.id === camp.agentId)!;
  const st = status[i % status.length];
  const phone = `+55 11 9${String(80000000 + i * 137).slice(0,8)}`;
  return {
    id: `l${i+1}`,
    campaignId: camp.id,
    campaignName: camp.name,
    agentName: ag.name,
    nome: nomes[i % nomes.length] + (i >= nomes.length ? ` ${i}` : ""),
    telefone: phone,
    email: `${nomes[i % nomes.length].toLowerCase().replace(/\s/g,".")}@email.com`,
    cargoVaga: cargos[i % cargos.length],
    empresa: empresas[i % empresas.length],
    cnj: i % 4 === 0 ? `0001234-${String(56+i).padStart(2,"0")}.2024.8.26.0100` : undefined,
    status: st,
    attempts: (i % 4),
    nextAttemptAt: st === "pendente" ? new Date(Date.now() + (i+1) * 600_000).toISOString() : undefined,
    whatsappEnviado: st === "qualificado",
    resumoIa: st === "qualificado" ? "Candidato confirmou interesse na vaga e disponibilidade para entrevista presencial." :
              st === "necessita_especialista" ? "Candidato fez pergunta técnica complexa sobre stack — encaminhado para especialista." :
              st === "recusado" ? "Candidato indicou que está empregado e satisfeito no momento." : undefined,
    lastCallAt: st !== "pendente" ? new Date(Date.now() - (i+1) * 320_000).toISOString() : undefined,
    durationSeconds: st !== "pendente" ? 60 + (i * 7) % 220 : undefined,
    createdAt: new Date(Date.now() - i * 86400_000 / 4).toISOString(),
  };
});

export const activeCalls: ActiveCall[] = [
  {
    id: "ac1", leadName: "João Silva", leadPhone: "+55 11 99812-4530",
    campaignName: "Qualificação Tech Stack — Devs Pleno",
    agentName: "Sofia", agentColor: "#F59E0B",
    startedAt: new Date(Date.now() - 154_000).toISOString(),
    durationSeconds: 154, sentiment: 78, speaking: "agent",
    lastAgent: "O senhor já tem experiência prévia com arquitetura de microsserviços em produção?",
    lastLead: "Tenho sim, atuei nos últimos dois anos com Node e Kafka...",
  },
  {
    id: "ac2", leadName: "Maria Santos", leadPhone: "+55 11 99701-2244",
    campaignName: "Agendamento — Analistas Jurídicos",
    agentName: "Marcos", agentColor: "#06B6D4",
    startedAt: new Date(Date.now() - 88_000).toISOString(),
    durationSeconds: 88, sentiment: 62, speaking: "lead",
    lastAgent: "Conseguimos te agendar para quinta-feira às 14h, fica bom?",
    lastLead: "Hmm, quinta tá complicado pra mim, sexta de manhã eu consigo...",
  },
  {
    id: "ac3", leadName: "Pedro Lima", leadPhone: "+55 11 99544-7711",
    campaignName: "Reengajamento — Banco de Talentos Q1",
    agentName: "Lara", agentColor: "#10B981",
    startedAt: new Date(Date.now() - 211_000).toISOString(),
    durationSeconds: 211, sentiment: 41, speaking: "agent",
    lastAgent: "Entendo que está empregado, posso te enviar a vaga por WhatsApp pra você avaliar com calma?",
    lastLead: "Pode mandar, mas nem garanto que vou olhar essa semana...",
  },
];

// Series for charts
export const callsByHour = Array.from({ length: 24 }).map((_, h) => {
  const base = h >= 9 && h <= 19 ? 32 + Math.sin((h-9)/3)*18 : 4;
  return {
    hora: `${String(h).padStart(2,"0")}h`,
    ligacoes: Math.max(0, Math.round(base + (h*7 % 11))),
    qualificados: Math.max(0, Math.round((base + (h*7 % 11)) * 0.38)),
  };
});

export const funnel = [
  { etapa: "Total Leads", valor: 2420 },
  { etapa: "Tentados", valor: 2104 },
  { etapa: "Atendidos", valor: 1387 },
  { etapa: "Interessados", valor: 891 },
  { etapa: "Qualificados", valor: 662 },
  { etapa: "WhatsApp Enviado", valor: 648 },
];

export const heatmap = (() => {
  const dias = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];
  return dias.map((d, di) => ({
    dia: d,
    horas: Array.from({ length: 13 }).map((_, hi) => {
      const h = 8 + hi;
      const v = di < 5
        ? Math.max(0, Math.min(100, Math.round(45 + Math.sin((h-9)/3)*30 + (di*7+h)%9)))
        : Math.max(0, Math.round(15 + Math.sin((h-9)/4)*10));
      return { hora: h, valor: v };
    }),
  }));
})();
