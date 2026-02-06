import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Devedor {
  id: string;
  cpf: string;
  nome: string;
  email: string;
  telefone: string;
}

export interface Credor {
  id: string;
  nome: string;
  cnpj: string;
  email: string;
}

export interface Divida {
  id: string;
  credor_id: string;
  devedor_id: string;
  valor_original: number;
  valor_atualizado: number;
  data_vencimento: string;
  produto: string;
  status: string;
  credor?: Credor;
}

export interface Mensagem {
  id: string;
  remetente: "usuario" | "bot";
  conteudo: string;
  timestamp: Date;
}

export interface Negociacao {
  id: string;
  divida_id: string;
  status: "em_andamento" | "acordo_fechado" | "cancelada";
  mensagens: Mensagem[];
  opcao_escolhida?: string;
  valor_acordo?: number;
  created_at: string;
  updated_at: string;
}

export interface Acordo {
  id: string;
  divida_id: string;
  negociacao_id: string;
  valor_original: number;
  valor_acordo: number;
  desconto_percentual: number;
  numero_parcelas: number;
  valor_parcela: number;
  opcao_escolhida: string;
  status: "ativo" | "pago" | "cancelado";
  created_at: string;
}

export interface Parcela {
  id: string;
  acordo_id: string;
  numero: number;
  valor: number;
  data_vencimento: string;
  status: "pendente" | "paga" | "vencida";
  created_at: string;
}
