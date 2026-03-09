import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { APP_VERSION } from "@/constants/version";
import { HomeContentGrid } from "@/components/contents/HomeContentGrid";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: contents } = await supabase
    .from("contents")
    .select("id, title, author, cover_image_url, content_type, status, rating, created_at, seen_on")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-white relative">
      <p
        className="fixed top-4 right-4 z-10 text-stone-400 text-xs select-none"
        style={{ paddingRight: "env(safe-area-inset-right)", paddingTop: "env(safe-area-inset-top)" }}
        aria-label={`バージョン ${APP_VERSION}`}
      >
        v{APP_VERSION}
      </p>
      <div className="border-b border-stone-200 bg-section">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-2">
              MindLeaf
            </h1>
            <p className="text-stone-500 text-sm sm:text-base max-w-xl mx-auto">
              読書や映画鑑賞で得た印象的な表現や、自分なりの解釈を記録し、マインドマップで繋ぎ合わせます。
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/contents/new"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                コンテンツを登録する
              </Link>
              <Link
                href="/contents"
                className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                コンテンツ一覧
              </Link>
              <Link
                href="/map/global"
                className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                全体マップを見る
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <HomeContentGrid contents={contents ?? []} />
      </div>
    </main>
  );
}
