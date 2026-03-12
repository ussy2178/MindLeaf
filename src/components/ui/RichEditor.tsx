"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { BubbleMenu as BubbleMenuComponent } from "@tiptap/react/menus";
import {
  Bold,
  Italic,
  List,
  ListTodo,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Link as LinkIcon,
} from "lucide-react";

const PLACEHOLDER = "Type '/' for commands...";

const SLASH_COMMANDS = [
  { id: "h1", label: "Heading 1", icon: Heading1, run: (e: Editor) => e.chain().focus().setHeading({ level: 1 }).run() },
  { id: "h2", label: "Heading 2", icon: Heading2, run: (e: Editor) => e.chain().focus().setHeading({ level: 2 }).run() },
  { id: "h3", label: "Heading 3", icon: Heading3, run: (e: Editor) => e.chain().focus().setHeading({ level: 3 }).run() },
  { id: "bullet", label: "Bullet List", icon: List, run: (e: Editor) => e.chain().focus().toggleBulletList().run() },
  { id: "task", label: "Task List", icon: ListTodo, run: (e: Editor) => e.chain().focus().toggleTaskList().run() },
  { id: "quote", label: "Quote", icon: Quote, run: (e: Editor) => e.chain().focus().toggleBlockquote().run() },
];

function getSlashTrigger(editor: Editor | null): { from: number; query: string } | null {
  if (!editor) return null;
  const { state } = editor;
  const { selection } = state;
  const { $from } = selection;
  const lineStart = $from.start();
  const lineText = state.doc.textBetween(lineStart, $from.pos, "\n");
  const match = lineText.match(/^\/(.*)$/);
  if (!match) return null;
  return { from: lineStart + 1, query: (match[1] ?? "").toLowerCase() };
}

const EDITOR_CLASS =
  "rich-editor-content prose prose-sm max-w-none min-w-0 w-full min-h-[150px] leading-normal outline-none focus:outline-none px-3 py-2 text-stone-800 prose-h1:mt-4 prose-h1:mb-2 prose-h1:leading-tight prose-h2:mt-3 prose-h2:mb-1 prose-h2:leading-tight prose-h3:mt-2 prose-h3:mb-1 prose-h3:leading-tight prose-p:mt-0 prose-p:mb-3 prose-li:my-0 prose-ul:mt-1 prose-ul:mb-5 prose-ol:mt-1 prose-ol:mb-5 [&_.tiptap]:outline-none [&_.tiptap]:focus:outline-none [&_ul]:list-disc [&_ol]:list-decimal [&_pre]:bg-stone-100 [&_pre]:rounded [&_pre]:p-3 [&_code]:bg-stone-100 [&_code]:px-1 [&_code]:rounded";

export type RichEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  editable?: boolean;
};

/** クライアントマウント後にのみエディタを描画し、Hydration の不一致を防ぐ */
export function RichEditor({
  value,
  onChange,
  placeholder = PLACEHOLDER,
  minHeight = "160px",
  className = "",
  editable = true,
}: RichEditorProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <RichEditorInner
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      minHeight={minHeight}
      className={className}
      editable={editable}
    />
  );
}

function RichEditorInner({
  value,
  onChange,
  placeholder,
  minHeight,
  className,
  editable,
}: RichEditorProps) {
  const [slashState, setSlashState] = useState<{ from: number; query: string; top: number; left: number } | null>(null);
  const slashRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: {},
        code: false,
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary-600 underline" } }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: value || "<p></p>",
    editable,
    editorProps: {
      attributes: {
        class: EDITOR_CLASS,
      },
      // スラッシュコマンド用 Escape は一旦コメントアウト（Hydration 安定化のため）
      // handleKeyDown(_view, event) {
      //   if (slashState && event.key === "Escape") { setSlashState(null); return true; }
      //   return false;
      // },
    },
    onUpdate: (payload) => {
      const editorInstance = payload.editor;
      const html = editorInstance.getHTML();
      onChange(html);
      // スラッシュコマンド用 UI は一旦無効化（Hydration 安定化のため）
      // const trigger = getSlashTrigger(editorInstance);
      // if (trigger) {
      //   try {
      //     const coords = editorInstance.view.coordsAtPos(trigger.from - 1);
      //     setSlashState({ from: trigger.from, query: trigger.query, top: coords.top, left: coords.left });
      //   } catch { setSlashState(null); }
      // } else {
      //   setSlashState(null);
      // }
    },
  });

  // Sync controlled value when it changes externally (e.g. initial load)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const normalized = value || "<p></p>";
    if (current !== normalized) {
      editor.commands.setContent(normalized, { emitUpdate: false });
    }
  }, [value, editor]);

  const filteredCommands = slashState
    ? SLASH_COMMANDS.filter(
        (c) =>
          !slashState.query || c.label.toLowerCase().includes(slashState.query) || c.id.includes(slashState.query)
      )
    : [];

  const handleSlashSelect = useCallback(
    (cmd: (typeof SLASH_COMMANDS)[0]) => {
      if (!editor || !slashState) return;
      const { from } = slashState;
      const to = editor.state.selection.from;
      editor.chain().focus().deleteRange({ from: from - 1, to }).run();
      cmd.run(editor);
      setSlashState(null);
    },
    [editor, slashState]
  );

  // Close slash menu on click outside
  useEffect(() => {
    if (!slashState) return;
    const onDocClick = (e: MouseEvent) => {
      if (slashRef.current?.contains(e.target as Node)) return;
      setSlashState(null);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [slashState]);

  if (!editor) {
    return (
      <div
        className={`relative min-h-[150px] rounded-lg border border-stone-300 bg-white ${className}`}
        style={{ minHeight }}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={`relative min-h-[150px] rounded-lg border border-stone-300 bg-white focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500 ${className}`}
      style={{ minHeight: minHeight || "160px" }}
    >
      <EditorContent editor={editor} className="min-h-[150px] [&_.tiptap]:min-h-[150px] [&_.tiptap]:outline-none" />

      <BubbleMenuComponent editor={editor} className="flex items-center gap-0.5 rounded-lg border border-stone-200 bg-white px-1 py-1 shadow-md">
        <BubbleMenuButtons editor={editor} />
      </BubbleMenuComponent>

      {/* スラッシュコマンド UI は Hydration 安定化のため一旦無効化
      {slashState && filteredCommands.length > 0 && (
        <div ref={slashRef} className="..." style={{ top: slashState.top + 20, left: slashState.left }}>
          ...Commands list...
        </div>
      )}
      */}
    </div>
  );
}

function BubbleMenuButtons({ editor }: { editor: Editor }) {
  const setLink = useCallback(() => {
    const url = window.prompt("URL");
    if (url) editor.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  return (
    <>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`rounded p-1.5 ${editor.isActive("bold") ? "bg-stone-200 text-stone-900" : "text-stone-600 hover:bg-stone-100"}`}
        title="Bold"
      >
        <Bold className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`rounded p-1.5 ${editor.isActive("italic") ? "bg-stone-200 text-stone-900" : "text-stone-600 hover:bg-stone-100"}`}
        title="Italic"
      >
        <Italic className="size-4" />
      </button>
      <button
        type="button"
        onClick={setLink}
        className={`rounded p-1.5 ${editor.isActive("link") ? "bg-stone-200 text-stone-900" : "text-stone-600 hover:bg-stone-100"}`}
        title="Link"
      >
        <LinkIcon className="size-4" />
      </button>
    </>
  );
}
