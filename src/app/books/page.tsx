import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function BooksPage() {
  const supabase = await createClient();
  const { data: books } = await supabase
    .from("books")
    .select("id, title, author, cover_image_url, created_at")
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
        <h1 className="text-xl font-bold text-stone-900">本一覧</h1>
        <Link
          href="/books/new"
          className="px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-600 text-sm font-medium"
        >
          本を登録
        </Link>
      </div>
      {!books?.length ? (
        <p className="text-stone-500 text-sm">まだ本が登録されていません。</p>
      ) : (
        <ul className="space-y-3">
          {books.map((book) => (
            <li key={book.id}>
              <Link
                href={`/books/${book.id}`}
                className="flex items-center gap-4 p-4 rounded-2xl border border-stone-200 bg-section hover:border-primary/20 hover:bg-white block transition-colors"
              >
                {book.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- 書影URLはユーザー入力のため
                <img
                  src={book.cover_image_url}
                  alt=""
                  className="w-12 h-16 object-cover rounded"
                />
              ) : (
                <div className="w-12 h-16 rounded bg-stone-200 flex items-center justify-center text-stone-400 text-xs">
                  書影
                </div>
              )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{book.title}</p>
                  {book.author && (
                    <p className="text-sm text-stone-500 truncate">{book.author}</p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
