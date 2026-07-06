"use client";

import { useCallback, useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import {
  Bold,
  Code2,
  Heading2,
  Heading3,
  ImagePlus,
  Images,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Quote,
  Table2,
  Undo2,
  Redo2,
} from "lucide-react";
import { uploadBlogImageApi } from "@/lib/blog-posts-api";
import { BlogMediaLibrary } from "@/components/admin/blog/BlogMediaLibrary";
import { useDialog } from "@/components/ui/DialogProvider";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (html: string) => void;
  className?: string;
};

function ToolbarButton({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "rounded-lg p-2 text-foreground/70 transition-colors hover:bg-gray-light hover:text-foreground",
        active && "bg-primary-light text-primary",
      )}
    >
      {children}
    </button>
  );
}

export function BlogRichEditor({ value, onChange, className }: Props) {
  const { alert, prompt } = useDialog();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: {
          HTMLAttributes: {
            class: "rounded-lg bg-dark/95 p-4 font-mono text-sm text-white overflow-x-auto",
          },
        },
        link: {
          openOnClick: false,
          HTMLAttributes: { class: "text-primary underline" },
        },
      }),
      Table.configure({
        resizable: false,
        HTMLAttributes: { class: "blog-editor-table w-full border-collapse my-4" },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: { class: "border border-gray/60 bg-gray-light px-3 py-2 text-left font-semibold" },
      }),
      TableCell.configure({
        HTMLAttributes: { class: "border border-gray/60 px-3 py-2 align-top" },
      }),
      TiptapImage.configure({
        HTMLAttributes: { class: "rounded-lg max-w-full h-auto my-4" },
      }),
      Placeholder.configure({
        placeholder: "Rédigez votre article…",
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none prose-headings:font-bold prose-headings:text-foreground prose-p:text-foreground prose-p:leading-relaxed prose-a:text-primary prose-a:underline prose-strong:text-foreground prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:text-gray-text prose-ul:list-disc prose-ol:list-decimal prose-li:my-0.5 prose-img:rounded-lg prose-pre:bg-dark prose-pre:text-white prose-code:before:content-none prose-code:after:content-none",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
    }
  }, [editor, value]);

  const insertImage = useCallback(async () => {
    if (!editor) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp,image/gif";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const { url } = await uploadBlogImageApi(file);
        editor.chain().focus().setImage({ src: url, alt: "" }).run();
      } catch {
        await alert({
          title: "Upload impossible",
          message: "Impossible d'uploader l'image.",
        });
      }
    };
    input.click();
  }, [editor, alert]);

  const setLink = useCallback(async () => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = await prompt({
      title: "Lien",
      message: "URL du lien",
      defaultValue: previous ?? "https://",
      placeholder: "https://",
      confirmLabel: "Appliquer",
    });
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor, prompt]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-gray/60 py-16">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "blog-rich-editor overflow-hidden rounded-xl border border-gray/60 bg-white",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray/40 bg-gray-light/50 px-2 py-1.5">
        <ToolbarButton
          title="Gras"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          title="Italique"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          title="Titre H2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          title="Titre H3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          title="Liste à puces"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          title="Liste numérotée"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          title="Citation"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          title="Bloc de code"
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <Code2 className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          title="Insérer un tableau"
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
        >
          <Table2 className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton title="Lien" onClick={() => void setLink()}>
          <Link2 className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton title="Image" onClick={() => void insertImage()}>
          <ImagePlus className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton title="Bibliothèque médias" onClick={() => setLibraryOpen(true)}>
          <Images className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <div className="mx-1 h-6 w-px bg-gray/40" />
        <ToolbarButton title="Annuler" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton title="Rétablir" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="h-4 w-4" aria-hidden />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
      <BlogMediaLibrary
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={(url) => editor?.chain().focus().setImage({ src: url, alt: "" }).run()}
        title="Insérer une image"
      />
    </div>
  );
}
