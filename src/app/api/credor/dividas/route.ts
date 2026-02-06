import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { searchParams } = request.nextUrl;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: credor } = await supabase
    .from("credores")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!credor) return NextResponse.json({ error: "Credor not found" }, { status: 404 });

  const page = Number(searchParams.get("page") || "1");
  const pageSize = Number(searchParams.get("pageSize") || "10");
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const sortKey = searchParams.get("sort") || "created_at";
  const sortDir = searchParams.get("dir") === "asc";

  let query = supabase
    .from("dividas")
    .select("*, devedor:devedores(cpf, nome, email, telefone)", { count: "exact" })
    .eq("credor_id", credor.id)
    .neq("status", "excluida");

  if (status) {
    query = query.eq("status", status);
  }

  if (search) {
    // Search by CPF in the devedor relation is complex; filter client-side or use RPC
    // For now, search by produto
    query = query.ilike("produto", `%${search}%`);
  }

  query = query
    .order(sortKey, { ascending: sortDir })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const { data, count, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data ?? [], total: count ?? 0 });
}
