import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Admin client with service_role key — bypasses RLS
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { nome, cnpj, email, password } = body;

  if (!nome || !cnpj || !email || !password) {
    return NextResponse.json(
      { error: "Todos os campos são obrigatórios." },
      { status: 400 }
    );
  }

  const cnpjDigits = cnpj.replace(/\D/g, "");
  if (cnpjDigits.length !== 14) {
    return NextResponse.json(
      { error: "CNPJ deve ter 14 dígitos." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // 1. Create auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    return NextResponse.json(
      { error: authError.message },
      { status: 400 }
    );
  }

  // 2. Insert credor row (admin client bypasses RLS)
  const { error: credorError } = await admin.from("credores").insert({
    nome,
    cnpj: cnpjDigits,
    email,
    user_id: authData.user.id,
  });

  if (credorError) {
    // Rollback: delete the auth user if credor insert fails
    await admin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json(
      { error: "Erro ao registrar credor. CNPJ já cadastrado?" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
