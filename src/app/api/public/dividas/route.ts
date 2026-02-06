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
  const cpf = request.nextUrl.searchParams.get("cpf");

  if (!cpf) {
    return NextResponse.json({ error: "CPF é obrigatório" }, { status: 400 });
  }

  const cpfDigits = cpf.replace(/\D/g, "");

  if (cpfDigits.length !== 11) {
    return NextResponse.json({ error: "CPF inválido" }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();

    // Buscar por CPF normalizado (só dígitos) e também com formatação
    const cpfFormatted = cpfDigits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    const { data: devedores, error: devedorError } = await supabase
      .from("devedores")
      .select("id")
      .or(`cpf.eq.${cpfDigits},cpf.eq.${cpfFormatted}`);

    if (devedorError) {
      console.error("Erro ao buscar devedores:", devedorError);
      return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }

    if (!devedores || devedores.length === 0) {
      return NextResponse.json({ dividas: [], count: 0 });
    }

    const devedorIds = devedores.map((d) => d.id);

    const { data: dividas, error: dividasError } = await supabase
      .from("dividas")
      .select(`
        *,
        credor:credores(id, nome, cnpj, email)
      `)
      .in("devedor_id", devedorIds)
      .eq("status", "pendente");

    if (dividasError) {
      console.error("Erro ao buscar dívidas:", dividasError);
      return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }

    return NextResponse.json({ dividas: dividas || [], count: (dividas || []).length });
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
