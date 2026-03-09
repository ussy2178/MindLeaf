"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ContentInsert, ContentType, ContentStatus, NodeInsert } from "@/lib/types";

export async function createContent(formData: FormData) {
  const title = formData.get("title") as string | null;
  if (!title?.trim()) {
    return { error: "タイトルを入力してください" };
  }

  const supabase = await createClient();

  const status = (formData.get("status") as ContentStatus) || "Unseen";
  const isOnMapRaw = formData.get("is_on_map");
  // Unseen の場合、ユーザーが明示的にオンにしていなければ is_on_map = false
  const isOnMapExplicit = isOnMapRaw === "true" || isOnMapRaw === "on";
  const isOnMap = status === "Unseen" ? isOnMapExplicit : (isOnMapRaw != null ? isOnMapExplicit : true);

  const contentRow: ContentInsert = {
    title: title.trim(),
    author: (formData.get("author") as string)?.trim() || null,
    cover_image_url: (formData.get("cover_image_url") as string)?.trim() || null,
    content_type: (formData.get("content_type") as ContentType) || "Book",
    status,
    seen_on: (formData.get("seen_on") as string)?.trim() || null,
    rating: formData.get("rating") ? Number(formData.get("rating")) : null,
    is_on_map: isOnMap,
    overall_review: null,
  };

  const { data: content, error: contentError } = await supabase
    .from("contents")
    .insert(contentRow)
    .select("id")
    .single();

  if (contentError) {
    console.error(contentError);
    return { error: "コンテンツの登録に失敗しました" };
  }

  const nodeRow: NodeInsert = {
    content_id: content.id,
    type: "book_root",
    layer: 0,
    content: title.trim(),
    interpretation: null,
    position_x: 0,
    position_y: 0,
  };

  const { error: nodeError } = await supabase.from("nodes").insert(nodeRow);

  if (nodeError) {
    console.error(nodeError);
    return { error: "コンテンツの登録はできましたが、ノードの作成に失敗しました" };
  }

  revalidatePath("/");
  revalidatePath("/contents");
  return { success: true, contentId: content.id };
}

export async function createNode(_prev: unknown, formData: FormData) {
  const contentId = formData.get("contentId") as string | null;
  if (!contentId?.trim()) {
    return { error: "コンテンツが指定されていません" };
  }

  const content = formData.get("content") as string | null;
  if (!content?.trim()) {
    return { error: "内容を入力してください" };
  }

  const layerRaw = formData.get("layer");
  const layer = layerRaw === "1" ? 1 : 2;
  const parentIdRaw = (formData.get("parentId") as string)?.trim() || null;
  const otherContentParentNodeIdRaw = (formData.get("otherBookParentNodeId") as string)?.trim() || null;

  const typeRaw = formData.get("type") as string | null;
  const type = layer === 1 ? "thought" : (typeRaw === "thought" ? "thought" : "quote");
  const interpretationRaw = (formData.get("interpretation") as string)?.trim();
  const interpretation = interpretationRaw || null;

  const supabase = await createClient();

  let position_x = 0;
  let position_y = 0;
  if (parentIdRaw) {
    const { data: parentNode } = await supabase
      .from("nodes")
      .select("position_x, position_y")
      .eq("id", parentIdRaw)
      .single();
    if (parentNode) {
      const px = Number(parentNode.position_x) || 0;
      const py = Number(parentNode.position_y) || 0;
      position_x = px + 200;
      position_y = py + (Math.random() * 100 - 30);
    }
  }

  const nodeRow: NodeInsert = {
    content_id: contentId.trim(),
    type,
    layer,
    content: content.trim(),
    interpretation,
    position_x,
    position_y,
  };

  const { data: newNode, error } = await supabase
    .from("nodes")
    .insert(nodeRow)
    .select("id")
    .single();

  if (error) {
    console.error("[createNode] ノード登録失敗:", error.message);
    return { error: "ノードの登録に失敗しました" };
  }

  if (parentIdRaw && newNode?.id) {
    const { error: edgeError } = await supabase.from("edges").insert({
      source_node_id: parentIdRaw,
      target_node_id: newNode.id,
    });
    if (edgeError) {
      console.error("[createNode] エッジ作成失敗（同一コンテンツ）:", edgeError.message);
    }
  }

  if (otherContentParentNodeIdRaw && newNode?.id && otherContentParentNodeIdRaw !== parentIdRaw) {
    const { error: otherEdgeError } = await supabase.from("edges").insert({
      source_node_id: otherContentParentNodeIdRaw,
      target_node_id: newNode.id,
    });
    if (otherEdgeError) {
      console.error("[createNode] エッジ作成失敗（別のコンテンツ）:", otherEdgeError.message);
    }
  }

  revalidatePath("/contents");
  revalidatePath(`/contents/${contentId.trim()}`);
  revalidatePath("/map/global");
  return { success: true };
}

export async function updateNode(id: string, content: string) {
  if (!id?.trim()) return { error: "ノードIDが指定されていません" };
  if (!content?.trim()) return { error: "内容を入力してください" };

  const supabase = await createClient();
  const { data: node, error: fetchError } = await supabase
    .from("nodes")
    .select("id, content_id")
    .eq("id", id)
    .single();

  if (fetchError || !node) return { error: "ノードが見つかりません" };

  const { error: updateError } = await supabase
    .from("nodes")
    .update({ content: content.trim() })
    .eq("id", id);

  if (updateError) return { error: "ノードの更新に失敗しました" };

  if (node.content_id) {
    revalidatePath("/contents");
    revalidatePath(`/contents/${node.content_id}`);
  }
  return { success: true };
}

export async function updateNodePosition(nodeId: string, x: number, y: number) {
  const supabase = await createClient();
  const { data: node, error: fetchError } = await supabase
    .from("nodes")
    .select("id, content_id")
    .eq("id", nodeId)
    .single();

  if (fetchError || !node) return { error: "ノードが見つかりません" };

  const { error: updateError } = await supabase
    .from("nodes")
    .update({ position_x: x, position_y: y })
    .eq("id", nodeId);

  if (updateError) return { error: "位置の保存に失敗しました" };

  if (node.content_id) {
    revalidatePath("/contents");
    revalidatePath(`/contents/${node.content_id}`);
  }
  return { success: true };
}

export async function createEdge(sourceId: string, targetId: string) {
  if (!sourceId?.trim() || !targetId?.trim()) return { error: "接続情報が不正です" };
  if (sourceId === targetId) return { error: "同一ノードには接続できません" };

  const supabase = await createClient();

  const { data: sourceNode, error: sourceError } = await supabase
    .from("nodes").select("id, content_id").eq("id", sourceId).single();
  if (sourceError || !sourceNode) return { error: "接続元ノードが見つかりません" };

  const { data: targetNode, error: targetError } = await supabase
    .from("nodes").select("id, content_id").eq("id", targetId).single();
  if (targetError || !targetNode) return { error: "接続先ノードが見つかりません" };

  const { data: newEdge, error: insertError } = await supabase
    .from("edges")
    .insert({ source_node_id: sourceId, target_node_id: targetId })
    .select("id")
    .single();

  if (insertError) return { error: "接続の保存に失敗しました" };

  revalidatePath("/map/global");
  if (sourceNode.content_id) {
    revalidatePath("/contents");
    revalidatePath(`/contents/${sourceNode.content_id}`);
  }
  if (targetNode.content_id && targetNode.content_id !== sourceNode.content_id) {
    revalidatePath(`/contents/${targetNode.content_id}`);
  }
  return { success: true, edgeId: newEdge.id };
}

export async function deleteEdge(edgeId: string) {
  if (!edgeId?.trim()) return { error: "エッジIDが指定されていません" };

  const supabase = await createClient();
  const { data: edge, error: fetchError } = await supabase
    .from("edges").select("id, source_node_id").eq("id", edgeId).single();
  if (fetchError || !edge) return { error: "接続が見つかりません" };

  const { data: sourceNode } = await supabase
    .from("nodes").select("content_id").eq("id", edge.source_node_id).single();

  const { error: deleteError } = await supabase.from("edges").delete().eq("id", edgeId);
  if (deleteError) return { error: "接続の削除に失敗しました" };

  revalidatePath("/map/global");
  if (sourceNode?.content_id) {
    revalidatePath("/contents");
    revalidatePath(`/contents/${sourceNode.content_id}`);
  }
  return { success: true };
}

export async function deleteNode(nodeId: string) {
  if (!nodeId?.trim()) return { error: "ノードIDが指定されていません" };

  const supabase = await createClient();
  const { data: node, error: fetchError } = await supabase
    .from("nodes").select("id, content_id").eq("id", nodeId).single();
  if (fetchError || !node) return { error: "ノードが見つかりません" };

  const { error: deleteError } = await supabase.from("nodes").delete().eq("id", nodeId);
  if (deleteError) return { error: "ノードの削除に失敗しました" };

  if (node.content_id) {
    revalidatePath("/contents");
    revalidatePath(`/contents/${node.content_id}`);
  }
  return { success: true };
}

export async function updateContent(
  id: string,
  data: {
    title: string;
    author: string | null;
    cover_image_url: string | null;
    content_type?: ContentType | null;
    status?: ContentStatus | null;
    seen_on?: string | null;
    rating?: number | null;
    is_on_map?: boolean;
  }
) {
  if (!id?.trim()) return { error: "コンテンツIDが指定されていません" };
  if (!data.title?.trim()) return { error: "タイトルを入力してください" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("contents")
    .update({
      title: data.title.trim(),
      author: data.author?.trim() || null,
      cover_image_url: data.cover_image_url?.trim() || null,
      content_type: data.content_type ?? null,
      status: data.status ?? null,
      seen_on: data.seen_on?.trim() || null,
      rating: data.rating ?? null,
      is_on_map: data.is_on_map ?? true,
    })
    .eq("id", id);

  if (error) return { error: "コンテンツの更新に失敗しました" };

  revalidatePath("/");
  revalidatePath("/contents");
  revalidatePath(`/contents/${id}`);
  return { success: true };
}

export async function updateContentStatus(id: string, status: ContentStatus) {
  if (!id?.trim()) return { error: "コンテンツIDが指定されていません" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("contents")
    .update({ status })
    .eq("id", id);

  if (error) return { error: "ステータスの更新に失敗しました" };

  revalidatePath("/");
  revalidatePath("/contents");
  revalidatePath(`/contents/${id}`);
  return { success: true };
}

export async function updateContentType(id: string, contentType: ContentType) {
  if (!id?.trim()) return { error: "コンテンツIDが指定されていません" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("contents")
    .update({ content_type: contentType })
    .eq("id", id);

  if (error) return { error: "種別の更新に失敗しました" };

  revalidatePath("/");
  revalidatePath("/contents");
  revalidatePath(`/contents/${id}`);
  return { success: true };
}

export async function updateOverallReview(id: string, overallReview: string) {
  if (!id?.trim()) return { error: "コンテンツIDが指定されていません" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("contents")
    .update({ overall_review: overallReview.trim() || null })
    .eq("id", id);

  if (error) return { error: "感想の更新に失敗しました" };

  revalidatePath(`/contents/${id}`);
  return { success: true };
}

export async function deleteContent(id: string) {
  if (!id?.trim()) return { error: "コンテンツIDが指定されていません" };

  const supabase = await createClient();
  const { error: fetchError } = await supabase.from("contents").select("id").eq("id", id).single();
  if (fetchError) return { error: "コンテンツが見つかりません" };

  const { error: deleteError } = await supabase.from("contents").delete().eq("id", id);
  if (deleteError) return { error: "コンテンツの削除に失敗しました" };

  revalidatePath("/");
  revalidatePath("/contents");
  redirect("/");
}

export async function searchContents(query: string) {
  const q = (query ?? "").trim();
  if (!q) return { contents: [] as { id: string; title: string }[] };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contents")
    .select("id, title")
    .ilike("title", `%${q}%`)
    .order("title", { ascending: true })
    .limit(20);
  if (error) return { error: "検索に失敗しました", contents: [] as { id: string; title: string }[] };
  return { contents: (data ?? []).map((b) => ({ id: b.id, title: b.title ?? "" })) };
}

export async function getNodesByContentId(contentId: string) {
  if (!contentId?.trim()) return { nodes: [] as { id: string; layer: number; content: string }[] };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("nodes")
    .select("id, layer, content")
    .eq("content_id", contentId.trim())
    .in("layer", [0, 1, 2])
    .order("layer", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return { error: "ノードの取得に失敗しました", nodes: [] as { id: string; layer: number; content: string }[] };
  return {
    nodes: (data ?? []).map((n) => ({ id: n.id, layer: n.layer, content: n.content ?? "" })),
  };
}
