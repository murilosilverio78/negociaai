import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

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

  // Verify divida belongs to credor
  const { data: divida } = await supabase
    .from("dividas")
    .select("id")
    .eq("id", params.id)
    .eq("credor_id", credor.id)
    .single();

  if (!divida) return NextResponse.json({ error: "Dívida not found" }, { status: 404 });

  // Soft delete
  const { error } = await supabase
    .from("dividas")
    .update({ status: "excluida" })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
