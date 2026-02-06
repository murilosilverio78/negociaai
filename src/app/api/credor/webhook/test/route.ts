import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url, token } = await request.json();

  if (!url) {
    return NextResponse.json({ error: "URL é obrigatória" }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        event: "test",
        data: {
          message: "Teste de webhook do Negocia Aí",
          timestamp: new Date().toISOString(),
        },
      }),
    });

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
    });
  } catch {
    return NextResponse.json({
      success: false,
      error: "Não foi possível conectar ao URL informado.",
    });
  }
}
