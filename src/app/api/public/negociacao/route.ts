import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function POST(request: NextRequest) {
  try {
    const { divida_id } = await request.json();

    if (!divida_id) {
      return NextResponse.json({ error: "divida_id é obrigatório" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Verificar se a dívida existe
    const { data: divida, error: dividaError } = await supabase
      .from("dividas")
      .select("id, status")
      .eq("id", divida_id)
      .single();

    if (dividaError || !divida) {
      return NextResponse.json({ error: "Dívida não encontrada" }, { status: 404 });
    }

    // Criar negociação
    const { data: negociacao, error } = await supabase
      .from("negociacoes")
      .insert({ divida_id, status: "em_andamento" })
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar negociação:", error);
      return NextResponse.json({ error: "Erro ao criar negociação" }, { status: 500 });
    }

    return NextResponse.json({ negociacao });
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
