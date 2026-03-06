"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BookInsert, NodeInsert } from "@/lib/types";

export async function createBook(formData: FormData) {
  const title = formData.get("title") as string | null;
  if (!title?.trim()) {
    return { error: "タイトルを入力してください" };
  }

  const supabase = await createClient();

  const bookRow: BookInsert = {
    title: title.trim(),
    author: (formData.get("author") as string)?.trim() || null,
    cover_image_url: (formData.get("cover_image_url") as string)?.trim() || null,
  };

  const { data: book, error: bookError } = await supabase
    .from("books")
    .insert(bookRow)
    .select("id")
    .single();

  if (bookError) {
    console.error(bookError);
    return { error: "本の登録に失敗しました" };
  }

  const nodeRow: NodeInsert = {
    book_id: book.id,
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
    return { error: "本の登録はできましたが、ノードの作成に失敗しました" };
  }

  revalidatePath("/");
  revalidatePath("/books");
  return { success: true, bookId: book.id };
}

export async function createNode(_prev: unknown, formData: FormData) {
  const bookId = formData.get("bookId") as string | null;
  if (!bookId?.trim()) {
    return { error: "本が指定されていません" };
  }

  const content = formData.get("content") as string | null;
  if (!content?.trim()) {
    return { error: "内容を入力してください" };
  }

  const layerRaw = formData.get("layer");
  const layer = layerRaw === "1" ? 1 : 2;
  const parentIdRaw = (formData.get("parentId") as string)?.trim() || null;

  // レイヤー1（抽象）の場合は常に thought。レイヤー2はフォームの種類を使用
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
      .eq("book_id", bookId.trim())
      .single();
    if (parentNode) {
      const px = Number(parentNode.position_x) || 0;
      const py = Number(parentNode.position_y) || 0;
      position_x = px + 200;
      position_y = py + (Math.random() * 100 - 30);
    }
  }

  const nodeRow: NodeInsert = {
    book_id: bookId.trim(),
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
      console.error("[createNode] エッジ作成失敗（ノードは登録済み）:", edgeError.message);
    }
  }

  revalidatePath("/books");
  revalidatePath(`/books/${bookId.trim()}`);
  return { success: true };
}

export async function updateNodePosition(nodeId: string, x: number, y: number) {
  const supabase = await createClient();

  const { data: node, error: fetchError } = await supabase
    .from("nodes")
    .select("id, book_id")
    .eq("id", nodeId)
    .single();

  if (fetchError || !node) {
    console.error("[updateNodePosition] ノード取得失敗:", fetchError?.message ?? "not found");
    return { error: "ノードが見つかりません" };
  }

  const { error: updateError } = await supabase
    .from("nodes")
    .update({ position_x: x, position_y: y })
    .eq("id", nodeId);

  if (updateError) {
    console.error("[updateNodePosition] 更新失敗:", updateError.message);
    return { error: "位置の保存に失敗しました" };
  }

  if (node.book_id) {
    revalidatePath("/books");
    revalidatePath(`/books/${node.book_id}`);
  }
  return { success: true };
}

export async function createEdge(sourceId: string, targetId: string) {
  if (!sourceId?.trim() || !targetId?.trim()) {
    console.error("[createEdge] source または target が空です");
    return { error: "接続情報が不正です" };
  }
  if (sourceId === targetId) {
    console.error("[createEdge] 同一ノードへの接続はできません");
    return { error: "同一ノードには接続できません" };
  }

  const supabase = await createClient();

  const { data: sourceNode, error: sourceError } = await supabase
    .from("nodes")
    .select("id, book_id")
    .eq("id", sourceId)
    .single();

  if (sourceError || !sourceNode) {
    console.error("[createEdge] ソースノード取得失敗:", sourceError?.message ?? "not found");
    return { error: "接続元ノードが見つかりません" };
  }

  const { data: targetNode, error: targetError } = await supabase
    .from("nodes")
    .select("id")
    .eq("id", targetId)
    .single();

  if (targetError || !targetNode) {
    console.error("[createEdge] ターゲットノード取得失敗:", targetError?.message ?? "not found");
    return { error: "接続先ノードが見つかりません" };
  }

  const { data: newEdge, error: insertError } = await supabase
    .from("edges")
    .insert({
      source_node_id: sourceId,
      target_node_id: targetId,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("[createEdge] エッジ作成失敗:", insertError.message);
    return { error: "接続の保存に失敗しました" };
  }

  if (sourceNode.book_id) {
    revalidatePath("/books");
    revalidatePath(`/books/${sourceNode.book_id}`);
  }
  return { success: true, edgeId: newEdge.id };
}

export async function deleteEdge(edgeId: string) {
  if (!edgeId?.trim()) {
    console.error("[deleteEdge] edgeId が空です");
    return { error: "エッジIDが指定されていません" };
  }

  const supabase = await createClient();

  const { data: edge, error: fetchError } = await supabase
    .from("edges")
    .select("id, source_node_id")
    .eq("id", edgeId)
    .single();

  if (fetchError || !edge) {
    console.error("[deleteEdge] エッジ取得失敗:", fetchError?.message ?? "not found");
    return { error: "接続が見つかりません" };
  }

  const { data: sourceNode } = await supabase
    .from("nodes")
    .select("book_id")
    .eq("id", edge.source_node_id)
    .single();

  const { error: deleteError } = await supabase
    .from("edges")
    .delete()
    .eq("id", edgeId);

  if (deleteError) {
    console.error("[deleteEdge] 削除失敗:", deleteError.message);
    return { error: "接続の削除に失敗しました" };
  }

  if (sourceNode?.book_id) {
    revalidatePath("/books");
    revalidatePath(`/books/${sourceNode.book_id}`);
  }
  return { success: true };
}

export async function deleteNode(nodeId: string) {
  if (!nodeId?.trim()) {
    console.error("[deleteNode] nodeId が空です");
    return { error: "ノードIDが指定されていません" };
  }

  const supabase = await createClient();

  const { data: node, error: fetchError } = await supabase
    .from("nodes")
    .select("id, book_id")
    .eq("id", nodeId)
    .single();

  if (fetchError || !node) {
    console.error("[deleteNode] ノード取得失敗:", fetchError?.message ?? "not found");
    return { error: "ノードが見つかりません" };
  }

  const { error: deleteError } = await supabase
    .from("nodes")
    .delete()
    .eq("id", nodeId);

  if (deleteError) {
    console.error("[deleteNode] 削除失敗:", deleteError.message);
    return { error: "ノードの削除に失敗しました" };
  }

  if (node.book_id) {
    revalidatePath("/books");
    revalidatePath(`/books/${node.book_id}`);
  }
  return { success: true };
}
