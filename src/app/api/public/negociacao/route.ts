import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

interface ConfigNegociacao {
  desconto_max_avista: number;
  desconto_max_parcelado: number;
  valor_min_parcela: number;
  entrada_minima: number;
  parcelas_faixa_0_30: number;
  parcelas_faixa_31_90: number;
  parcelas_faixa_91_180: number;
  parcelas_faixa_180_plus: number;
}

const defaultConfig: ConfigNegociacao = {
  desconto_max_avista: 30,
  desconto_max_parcelado: 15,
  valor_min_parcela: 50,
  entrada_minima: 10,
  parcelas_faixa_0_30: 3,
  parcelas_faixa_31_90: 6,
  parcelas_faixa_91_180: 9,
  parcelas_faixa_180_plus: 12,
};

function calcularDiasAtraso(dataVencimento: string): number {
  const vencimento = new Date(dataVencimento);
  const hoje = new Date();
  const diffMs = hoje.getTime() - vencimento.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function determinarFaixaAtraso(dias: number): string {
  if (dias <= 30) return "0-30";
  if (dias <= 90) return "31-90";
  if (dias <= 180) return "91-180";
  return "180+";
}

function getMaxParcelas(faixa: string, config: ConfigNegociacao): number {
  switch (faixa) {
    case "0-30": return config.parcelas_faixa_0_30;
    case "31-90": return config.parcelas_faixa_31_90;
    case "91-180": return config.parcelas_faixa_91_180;
    case "180+": return config.parcelas_faixa_180_plus;
    default: return 3;
  }
}

function calcularOpcoesAcordo(
  valorAtualizado: number,
  config: ConfigNegociacao,
  maxParcelas: number
) {
  const opcoes: Record<string, unknown> = {};

  // Opcao a vista
  const valorAvista = valorAtualizado * (1 - config.desconto_max_avista / 100);
  opcoes.avista = {
    valor_total: Math.round(valorAvista * 100) / 100,
    parcelas: 1,
    desconto_percentual: config.desconto_max_avista,
  };

  // Opcoes parceladas
  const valorTotalParcelado = valorAtualizado * (1 - config.desconto_max_parcelado / 100);
  const entrada = valorTotalParcelado * (config.entrada_minima / 100);

  for (let n = 2; n <= maxParcelas; n++) {
    const valorParcela = (valorTotalParcelado - entrada) / n;
    if (valorParcela < config.valor_min_parcela) break;

    opcoes[`${n}x`] = {
      valor_total: Math.round(valorTotalParcelado * 100) / 100,
      entrada: Math.round(entrada * 100) / 100,
      parcelas: n,
      valor_parcela: Math.round(valorParcela * 100) / 100,
      desconto_percentual: config.desconto_max_parcelado,
    };
  }

  return opcoes;
}

export async function POST(request: NextRequest) {
  try {
    const { divida_id } = await request.json();

    if (!divida_id) {
      return NextResponse.json({ error: "divida_id é obrigatório" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Buscar divida com credor e config_negociacao
    const { data: divida, error: dividaError } = await supabase
      .from("dividas")
      .select("*, credor:credores(*)")
      .eq("id", divida_id)
      .single();

    if (dividaError || !divida) {
      return NextResponse.json({ error: "Dívida não encontrada" }, { status: 404 });
    }

    // Verificar se já existe negociação ativa para esta dívida
    const { data: negociacaoExistente } = await supabase
      .from("negociacoes")
      .select("*")
      .eq("divida_id", divida_id)
      .in("status", ["ativa", "em_andamento"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (negociacaoExistente) {
      return NextResponse.json({
        negociacao_id: negociacaoExistente.id,
        opcoes_acordo: negociacaoExistente.opcoes_acordo,
        divida: {
          id: divida.id,
          valor_original: divida.valor_original,
          valor_atualizado: divida.valor_atualizado,
          data_vencimento: divida.data_vencimento,
          produto: divida.produto,
          status: divida.status,
          credor: divida.credor,
        },
      });
    }

    // Calcular campos
    const diasAtraso = calcularDiasAtraso(divida.data_vencimento);
    const faixaAtraso = determinarFaixaAtraso(diasAtraso);

    const credorConfig: ConfigNegociacao = {
      ...defaultConfig,
      ...(divida.credor?.config_negociacao || {}),
    };
    const maxParcelas = getMaxParcelas(faixaAtraso, credorConfig);
    const opcoesAcordo = calcularOpcoesAcordo(divida.valor_atualizado, credorConfig, maxParcelas);

    // Criar negociacao com campos calculados
    const { data: negociacao, error } = await supabase
      .from("negociacoes")
      .insert({
        divida_id,
        status: "ativa",
        valor_original: divida.valor_original,
        valor_atualizado: divida.valor_atualizado,
        dias_atraso: diasAtraso,
        faixa_atraso: faixaAtraso,
        opcoes_acordo: opcoesAcordo,
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar negociação:", error);
      return NextResponse.json({ error: "Erro ao criar negociação" }, { status: 500 });
    }

    return NextResponse.json({
      negociacao_id: negociacao.id,
      opcoes_acordo: opcoesAcordo,
      divida: {
        id: divida.id,
        valor_original: divida.valor_original,
        valor_atualizado: divida.valor_atualizado,
        data_vencimento: divida.data_vencimento,
        produto: divida.produto,
        status: divida.status,
        credor: divida.credor,
      },
    });
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
