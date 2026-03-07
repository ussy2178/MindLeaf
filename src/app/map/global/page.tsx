import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MindMap } from "@/components/map/MindMap";

export default async function GlobalMapPage() {
  const supabase = await createClient();

  const { data: nodes } = await supabase
    .from("nodes")
    .select("id, book_id, type, layer, content, interpretation, position_x, position_y, created_at")
    .order("created_at", { ascending: true });

  const nodeIds = nodes?.map((n) => n.id) ?? [];
  let edges: { id: string; source_node_id: string; target_node_id: string }[] = [];
  if (nodeIds.length > 0) {
    const { data: edgesData } = await supabase
      .from("edges")
      .select("id, source_node_id, target_node_id");
    edges =
      edgesData?.filter(
        (e) =>
          nodeIds.includes(e.source_node_id) && nodeIds.includes(e.target_node_id)
      ) ?? [];
  }

  const mindMapNodes =
    nodes?.map((n) => ({
      id: n.id,
      type: n.type,
      layer: n.layer,
      content: n.content,
      interpretation: n.interpretation ?? null,
      position_x: n.position_x ?? 0,
      position_y: n.position_y ?? 0,
      book_id: n.book_id ?? null,
    })) ?? [];

  const edgesForMindMap = edges.map((e) => ({
    id: e.id,
    source_node_id: e.source_node_id,
    target_node_id: e.target_node_id,
  }));

  return (
    <main className="min-h-screen px-4 sm:px-6 lg:px-8 py-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link
            href="/"
            className="text-stone-500 hover:text-stone-700 text-sm inline-flex items-center gap-1"
          >
            ← トップへ
          </Link>
          <h1 className="text-lg font-semibold text-stone-800">
            全体マップ（グローバルビュー）
          </h1>
          <Link
            href="/books"
            className="text-stone-500 hover:text-stone-700 text-sm"
          >
            本一覧
          </Link>
        </div>
        <div className="rounded-2xl border border-stone-200 overflow-hidden bg-white min-h-[640px]">
          <MindMap nodes={mindMapNodes} edges={edgesForMindMap} />
        </div>
      </div>
    </main>
  );
}
