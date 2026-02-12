import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const N8N_WEBHOOK_URL = "https://n8n.murilosilverio.ia.br/webhook/chat-agent";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

async function salvarMensagem(
  negociacao_id: string,
  role: "user" | "assistant",
  content: string,
  metadata?: Record<string, unknown>
) {
  try {
    const supabase = createServiceClient();

    // Verificar duplicata: mesma negociacao, role e conteúdo nos últimos 5 segundos
    const { data: existente } = await supabase
      .from("negociacoes_mensagens")
      .select("id")
      .eq("negociacao_id", negociacao_id)
      .eq("role", role)
      .eq("content", content)
      .gte("created_at", new Date(Date.now() - 5000).toISOString())
      .limit(1);

    if (existente && existente.length > 0) {
      console.log("[chat] Mensagem duplicada ignorada:", role, content.substring(0, 50));
      return;
    }

    await supabase.from("negociacoes_mensagens").insert({
      negociacao_id,
      role,
      content,
      metadata: metadata || null,
    });
  } catch (err) {
    console.error("[chat] Erro ao salvar mensagem:", err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mensagem, negociacao_id } = body;

    if (!mensagem || !negociacao_id) {
      return NextResponse.json(
        { error: "mensagem e negociacao_id são obrigatórios" },
        { status: 400 }
      );
    }

    // Salvar mensagem do usuário
    await salvarMensagem(negociacao_id, "user", mensagem);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagem, negociacao_id }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const rawText = await response.text();
      console.log("[chat] n8n status:", response.status, "| body:", rawText);

      if (!response.ok) {
        console.error("[chat] n8n retornou status não-ok:", response.status);
        return NextResponse.json(
          { resposta: "Desculpe, estou com dificuldades técnicas. Tente novamente em instantes." },
          { status: 200 }
        );
      }

      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        console.error("[chat] Resposta do n8n não é JSON válido:", rawText);
        return NextResponse.json({ resposta: rawText || "Erro ao processar resposta." });
      }

      console.log("[chat] parsed data:", JSON.stringify(data));

      // Suportar multiplos formatos de resposta do n8n
      const resposta = data.output || data.resposta || data.message || data.text ||
        (typeof data === "string" ? data : "") ||
        (Array.isArray(data) && data[0]?.output) || "";

      const acao = data.acao || null;
      const acordo = data.acordo || null;

      // Salvar resposta do assistente
      const metadata: Record<string, unknown> = {};
      if (acao) metadata.acao = acao;
      if (acordo) metadata.acordo = acordo;
      await salvarMensagem(
        negociacao_id,
        "assistant",
        resposta,
        Object.keys(metadata).length > 0 ? metadata : undefined
      );

      return NextResponse.json({ resposta, acao, acordo });
    } catch (err) {
      clearTimeout(timeout);
      const isAbort = err instanceof DOMException && err.name === "AbortError";
      console.error(isAbort ? "[chat] Timeout ao chamar webhook n8n" : "[chat] Erro ao chamar webhook n8n:", err);
      return NextResponse.json(
        { resposta: "Desculpe, estou com dificuldades técnicas. Tente novamente em instantes." },
        { status: 200 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido" },
      { status: 400 }
    );
  }
}
