import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NodeAddForm } from "@/components/books/NodeAddForm";
import { CollapsibleNodeList } from "@/components/books/CollapsibleNodeList";
import { MindMap } from "@/components/map/MindMap";

type Props = { params: Promise<{ id: string }> };

export default async function BookDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, title, author, cover_image_url")
    .eq("id", id)
    .single();

  if (bookError || !book) {
    notFound();
  }

  const { data: nodes } = await supabase
    .from("nodes")
    .select("id, type, layer, content, interpretation, position_x, position_y, created_at")
    .eq("book_id", id)
    .order("created_at", { ascending: true });

  const nodeIds = nodes?.map((n) => n.id) ?? [];
  let edges: { id: string; source_node_id: string; target_node_id: string }[] = [];
  if (nodeIds.length > 0) {
    const { data: edgesData } = await supabase
      .from("edges")
      .select("id, source_node_id, target_node_id")
      .in("source_node_id", nodeIds);
    edges =
      edgesData?.filter((e) => nodeIds.includes(e.target_node_id)) ?? [];
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
    })) ?? [];

  const edgesForModal = edges.map((e) => ({
    id: e.id,
    source: e.source_node_id,
    target: e.target_node_id,
  }));

  return (
    <main className="min-h-screen px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto bg-white">
      <Link
        href="/books"
        className="text-stone-500 hover:text-stone-700 text-sm mb-6 inline-block"
      >
        ← 本一覧へ
      </Link>

      <div className="flex gap-4 mb-8">
        {book.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- 書影URLはユーザー入力のため
          <img
            src={book.cover_image_url}
            alt=""
            className="w-16 h-24 object-cover rounded flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-24 rounded bg-stone-200 flex items-center justify-center text-stone-400 text-xs flex-shrink-0">
            書影
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-bold">{book.title}</h1>
          {book.author && (
            <p className="text-stone-500 text-sm mt-1">{book.author}</p>
          )}
        </div>
      </div>

      <section className="mb-8 rounded-2xl border border-stone-200 bg-section p-6">
        <h2 className="text-sm font-semibold text-stone-600 mb-3">
          新しいノードを追加
        </h2>
        <NodeAddForm
          bookId={id}
          nodes={nodes?.map((n) => ({ id: n.id, layer: n.layer, content: n.content })) ?? []}
        />
      </section>

      <CollapsibleNodeList nodes={mindMapNodes} edges={edgesForModal} />

      <section className="rounded-2xl border border-stone-200 bg-section p-6">
        <h2 className="text-sm font-semibold text-stone-600 mb-3">
          マインドマップ
        </h2>
        <div
          key={`mindmap-${mindMapNodes.length}-${edges.length}`}
          className="rounded-2xl border border-stone-200 overflow-hidden bg-white"
        >
          <MindMap nodes={mindMapNodes} edges={edges} />
        </div>
      </section>
    </main>
  );
}
