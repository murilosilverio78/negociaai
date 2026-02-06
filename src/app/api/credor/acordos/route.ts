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
  const status = searchParams.get("status") || "";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  // Get credor's divida IDs
  const { data: dividas } = await supabase
    .from("dividas")
    .select("id")
    .eq("credor_id", credor.id);

  const dividaIds = dividas?.map((d) => d.id) ?? [];

  if (dividaIds.length === 0) {
    return NextResponse.json({ data: [], total: 0 });
  }

  let query = supabase
    .from("acordos")
    .select("*, divida:dividas(*, devedor:devedores(cpf, nome))", { count: "exact" })
    .in("divida_id", dividaIds);

  if (status) query = query.eq("status", status);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to + "T23:59:59");

  query = query
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const { data, count, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data ?? [], total: count ?? 0 });
}
