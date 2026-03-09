import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ContentListClient } from "@/components/contents/ContentListClient";

export default async function ContentsPage() {
  const supabase = await createClient();
  const { data: contents } = await supabase
    .from("contents")
    .select("id, title, author, cover_image_url, content_type, status, rating, is_on_map, created_at, seen_on")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto bg-white">
      <Link
        href="/"
        className="text-stone-500 hover:text-stone-700 text-sm mb-6 inline-block"
      >
        ← トップへ
      </Link>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-stone-900">コンテンツ一覧</h1>
        <Link
          href="/contents/new"
          className="px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-600 text-sm font-medium"
        >
          新規登録
        </Link>
      </div>
      <ContentListClient contents={contents ?? []} />
    </main>
  );
}
