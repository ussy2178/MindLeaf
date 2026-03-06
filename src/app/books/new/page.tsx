import Link from "next/link";
import { BookNewForm } from "@/components/books/BookNewForm";

export default function BookNewPage() {
  return (
    <main className="min-h-screen px-4 sm:px-6 lg:px-8 py-8 max-w-2xl mx-auto bg-white">
      <Link
        href="/"
        className="text-stone-500 hover:text-stone-700 text-sm mb-6 inline-block"
      >
        ← トップへ
      </Link>
      <h1 className="text-xl font-bold mb-6 text-stone-900">本を登録する</h1>
      <BookNewForm />
    </main>
  );
}
