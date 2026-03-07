import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { APP_VERSION } from "@/constants/version";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: books } = await supabase
    .from("books")
    .select("id, title, author, cover_image_url, created_at")
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
              読書で得た印象的な表現や、自分なりの解釈を記録し、マインドマップで繋ぎ合わせます。
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/books/new"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                本を登録する
              </Link>
              <Link
                href="/books"
                className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                本一覧
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-6 text-center">
          登録されている本
        </h2>
        {!books?.length ? (
          <p className="text-stone-400 text-sm text-center">
            まだ本が登録されていません。
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6 justify-items-center">
            {books.map((book) => (
              <Link
                key={book.id}
                href={`/books/${book.id}`}
                className="group block w-full max-w-[200px] rounded-2xl border border-stone-200 bg-white overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all"
              >
                <div className="aspect-[3/4] bg-section overflow-hidden">
                  {book.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={book.cover_image_url}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">
                      書影なし
                    </div>
                  )}
                </div>
                <div className="p-3 border-t border-stone-100">
                  <p className="font-medium text-stone-900 text-sm line-clamp-2 group-hover:text-primary">
                    {book.title}
                  </p>
                  {book.author && (
                    <p className="text-xs text-stone-400 mt-0.5 truncate">
                      {book.author}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
