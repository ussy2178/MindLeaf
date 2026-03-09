import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NodeAddForm } from "@/components/contents/NodeAddForm";
import { CollapsibleNodeList } from "@/components/contents/CollapsibleNodeList";
import { ContentSettingsDialog } from "@/components/contents/ContentSettingsDialog";
import { OverallReviewEditor } from "@/components/contents/OverallReviewEditor";
import { StatusBadgeInline } from "@/components/contents/StatusBadgeInline";
import { TypeBadgeInline } from "@/components/contents/TypeBadgeInline";
import { MindMap } from "@/components/map/MindMap";

type Props = { params: Promise<{ id: string }> };

export default async function ContentDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: content, error: contentError } = await supabase
    .from("contents")
    .select("id, title, author, cover_image_url, content_type, status, seen_on, rating, overall_review, is_on_map")
    .eq("id", id)
    .single();

  if (contentError || !content) {
    notFound();
  }

  const { data: contentNodes } = await supabase
    .from("nodes")
    .select("id, content_id, type, layer, content, interpretation, position_x, position_y, created_at")
    .eq("content_id", id)
    .order("created_at", { ascending: true });

  // is_on_map が true のコンテンツのノードのみマップ用に取得
  const { data: mapContents } = await supabase
    .from("contents")
    .select("id")
    .eq("is_on_map", true);

  const mapContentIds = new Set((mapContents ?? []).map((c) => c.id));

  const { data: allNodes } = await supabase
    .from("nodes")
    .select("id, content_id, type, layer, content, interpretation, position_x, position_y, created_at")
    .order("created_at", { ascending: true });

  const filteredNodes = (allNodes ?? []).filter(
    (n) => n.content_id && mapContentIds.has(n.content_id)
  );

  const allNodeIds = filteredNodes.map((n) => n.id);
  let allEdges: { id: string; source_node_id: string; target_node_id: string }[] = [];
  if (allNodeIds.length > 0) {
    const { data: edgesData } = await supabase
      .from("edges")
      .select("id, source_node_id, target_node_id");
    allEdges =
      edgesData?.filter(
        (e) => allNodeIds.includes(e.source_node_id) && allNodeIds.includes(e.target_node_id)
      ) ?? [];
  }

  const mindMapNodes = filteredNodes.map((n) => ({
    id: n.id,
    type: n.type,
    layer: n.layer,
    content: n.content,
    interpretation: n.interpretation ?? null,
    position_x: n.position_x ?? 0,
    position_y: n.position_y ?? 0,
    content_id: n.content_id ?? null,
  }));

  const contentNodeIds = contentNodes?.map((n) => n.id) ?? [];
  const edgesForModal = allEdges
    .filter((e) => contentNodeIds.includes(e.source_node_id) || contentNodeIds.includes(e.target_node_id))
    .map((e) => ({
      id: e.id,
      source: e.source_node_id,
      target: e.target_node_id,
    }));

  return (
    <main className="min-h-screen px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto bg-white">
      <Link
        href="/contents"
        className="text-stone-500 hover:text-stone-700 text-sm mb-6 inline-block"
      >
        ← コンテンツ一覧へ
      </Link>

      <div className="flex gap-4 mb-8">
        {content.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={content.cover_image_url}
            alt=""
            className="w-16 h-24 object-cover rounded flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-24 rounded bg-stone-200 flex items-center justify-center text-stone-400 text-xs flex-shrink-0">
            No img
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold">{content.title}</h1>
            <ContentSettingsDialog
              content={{
                id: content.id,
                title: content.title,
                author: content.author ?? null,
                cover_image_url: content.cover_image_url ?? null,
                content_type: content.content_type,
                status: content.status,
                seen_on: content.seen_on,
                rating: content.rating,
                is_on_map: content.is_on_map ?? true,
              }}
              triggerLabel="編集"
            />
          </div>
          {content.author && (
            <p className="text-stone-500 text-sm mt-1">{content.author}</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <TypeBadgeInline contentId={id} contentType={content.content_type} />
            <StatusBadgeInline contentId={id} status={content.status} />
            {content.rating && (
              <span className="text-amber-500 text-[10px] font-medium">
                {"★".repeat(Math.min(content.rating, 4))}{content.rating >= 4 && "+"}
              </span>
            )}
            {content.seen_on && (
              <span className="text-[10px] text-stone-400">{content.seen_on}</span>
            )}
          </div>
        </div>
      </div>

      {/* 作品全体の感想 */}
      <section className="mb-8 rounded-2xl border border-stone-200 bg-section p-6">
        <h2 className="text-sm font-semibold text-stone-600 mb-3">
          作品全体の感想
        </h2>
        <OverallReviewEditor
          contentId={id}
          initialReview={content.overall_review ?? null}
        />
      </section>

      <section className="mb-8 rounded-2xl border border-stone-200 bg-section p-6">
        <h2 className="text-sm font-semibold text-stone-600 mb-3">
          新しいノードを追加
        </h2>
        <NodeAddForm
          contentId={id}
          nodes={contentNodes?.map((n) => ({ id: n.id, layer: n.layer, content: n.content })) ?? []}
        />
      </section>

      <CollapsibleNodeList
        nodes={mindMapNodes.filter((n) => n.content_id === id)}
        edges={edgesForModal}
      />

      {content.is_on_map && (
        <section className="rounded-2xl border border-stone-200 bg-section p-6">
          <h2 className="text-sm font-semibold text-stone-600 mb-3">
            マインドマップ
          </h2>
          <div
            key={`mindmap-${mindMapNodes.length}-${allEdges.length}`}
            className="rounded-2xl border border-stone-200 overflow-hidden bg-white"
          >
            <MindMap
              nodes={mindMapNodes}
              edges={allEdges}
              focusContentId={id}
            />
          </div>
        </section>
      )}
    </main>
  );
}
