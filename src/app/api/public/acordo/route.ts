import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();

    const { data: acordo, error: acordoError } = await supabase
      .from("acordos")
      .select("*")
      .eq("id", id)
      .single();

    if (acordoError || !acordo) {
      return NextResponse.json({ error: "Acordo não encontrado" }, { status: 404 });
    }

    const { data: parcelas } = await supabase
      .from("parcelas")
      .select("*")
      .eq("acordo_id", id)
      .order("numero", { ascending: true });

    return NextResponse.json({ acordo, parcelas: parcelas || [] });
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      divida_id,
      negociacao_id,
      valor_original,
      valor_acordo,
      desconto_percentual,
      numero_parcelas,
      valor_parcela,
      opcao_escolhida,
    } = body;

    if (!divida_id || !negociacao_id) {
      return NextResponse.json({ error: "divida_id e negociacao_id são obrigatórios" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 1. Criar acordo
    const { data: acordo, error: acordoError } = await supabase
      .from("acordos")
      .insert({
        divida_id,
        negociacao_id,
        valor_original,
        valor_acordo,
        desconto_percentual,
        numero_parcelas,
        valor_parcela,
        opcao_escolhida,
        status: "ativo",
      })
      .select()
      .single();

    if (acordoError || !acordo) {
      console.error("Erro ao criar acordo:", acordoError);
      return NextResponse.json({ error: "Erro ao criar acordo" }, { status: 500 });
    }

    // 2. Gerar parcelas
    const parcelas = [];
    const hoje = new Date();
    for (let i = 0; i < numero_parcelas; i++) {
      const dataVencimento = new Date(hoje);
      dataVencimento.setDate(dataVencimento.getDate() + 10 + i * 30);
      parcelas.push({
        acordo_id: acordo.id,
        numero: i + 1,
        valor: valor_parcela,
        data_vencimento: dataVencimento.toISOString().split("T")[0],
        status: "pendente",
      });
    }

    const { error: parcelasError } = await supabase.from("parcelas").insert(parcelas);
    if (parcelasError) {
      console.error("Erro ao criar parcelas:", parcelasError);
    }

    // 3. Atualizar negociação
    const { error: negError } = await supabase
      .from("negociacoes")
      .update({ status: "acordo_fechado" })
      .eq("id", negociacao_id);

    if (negError) {
      console.error("Erro ao atualizar negociação:", negError);
    }

    // 4. Atualizar status da dívida
    const { error: dividaError } = await supabase
      .from("dividas")
      .update({ status: "acordo" })
      .eq("id", divida_id);

    if (dividaError) {
      console.error("Erro ao atualizar dívida:", dividaError);
    }

    return NextResponse.json({ acordo });
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
