import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Upload,
  Undo,
  Redo,
  Minus,
  RemoveFormatting,
  Loader2,
} from "lucide-react";
import { useEffect, useCallback, useRef, useState } from "react";
import { uploadFile } from "wasp/client/operations";
import { cn } from "../utils";

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

/** Convert File → base64 string (without data-uri prefix) */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Upload an image File to S3 and return a permanent proxy URL */
async function uploadImageFile(file: File): Promise<string> {
  const base64 = await fileToBase64(file);
  const uploaded = await uploadFile({
    data: base64,
    fileName: file.name || `paste-${Date.now()}.png`,
    fileType: file.type || "image/png",
  });
  // Use permanent proxy URL — strip extension so Nginx doesn't catch it as static file
  const keyWithoutExt = uploaded.s3Key.replace(/\.[^.]+$/, '');
  return `/api/files/${keyWithoutExt}`;
}

// ────────────────────────────────────────────────────────────
// Toolbar components
// ────────────────────────────────────────────────────────────

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  children,
  title,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 h-6 w-px bg-border" />;
}

function Toolbar({ editor, uploading, setUploading }: { editor: Editor; uploading: boolean; setUploading: (v: boolean) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLink = useCallback(() => {
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("URL", prev || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addImageByUrl = useCallback(() => {
    const url = window.prompt("Image URL");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5 MB.");
      return;
    }

    // Save cursor position before async upload
    const pos = editor.state.selection.anchor;
    setUploading(true);
    try {
      const url = await uploadImageFile(file);
      editor.chain().focus().insertContentAt(pos, { type: 'image', attrs: { src: url } }).run();
    } catch (err: any) {
      alert(err?.message || "Failed to upload image.");
    } finally {
      setUploading(false);
    }
  }, [editor, setUploading]);

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 px-2 py-1.5">
      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")} title="Bold">
        <Bold size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive("italic")} title="Italic">
        <Italic size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive("underline")} title="Underline">
        <UnderlineIcon size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive("strike")} title="Strikethrough">
        <Strikethrough size={16} />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive("heading", { level: 1 })} title="Heading 1">
        <Heading1 size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive("heading", { level: 2 })} title="Heading 2">
        <Heading2 size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive("heading", { level: 3 })} title="Heading 3">
        <Heading3 size={16} />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive("bulletList")} title="Bullet List">
        <List size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive("orderedList")} title="Numbered List">
        <ListOrdered size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive("blockquote")} title="Blockquote">
        <Quote size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive("codeBlock")} title="Code Block">
        <Code size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
        <Minus size={16} />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton onClick={addLink} isActive={editor.isActive("link")} title="Insert Link">
        <LinkIcon size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={addImageByUrl} title="Image from URL">
        <ImageIcon size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        title="Upload Image"
      >
        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
      </ToolbarButton>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      <ToolbarDivider />

      <ToolbarButton onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title="Clear Formatting">
        <RemoveFormatting size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
        <Undo size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
        <Redo size={16} />
      </ToolbarButton>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Editor
// ────────────────────────────────────────────────────────────

export default function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { class: "text-primary underline cursor-pointer" },
      }),
      ImageExtension.configure({
        HTMLAttributes: { class: "rounded-lg max-w-full" },
        allowBase64: true,
      }),
      Placeholder.configure({
        placeholder: placeholder || "Start writing...",
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-neutral dark:prose-invert max-w-none min-h-[400px] px-4 py-3 focus:outline-none",
      },
      // Handle pasted images (Ctrl+V / Cmd+V with image)
      handlePaste(_view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) return false;

            // Save cursor position before async upload
            const pastePos = editor?.state.selection.anchor ?? 0;
            setUploading(true);
            uploadImageFile(file)
              .then((url) => {
                editor?.chain().focus().insertContentAt(pastePos, { type: 'image', attrs: { src: url } }).run();
              })
              .catch((err) => {
                console.error("Paste image upload failed:", err);
                alert("Failed to upload pasted image.");
              })
              .finally(() => setUploading(false));

            return true;
          }
        }
        return false;
      },
      // Handle dropped images (drag & drop)
      handleDrop(_view, event) {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;

        const imageFile = Array.from(files).find((f) => f.type.startsWith("image/"));
        if (!imageFile) return false;

        event.preventDefault();

        if (imageFile.size > 5 * 1024 * 1024) {
          alert("Image must be under 5 MB.");
          return true;
        }

        // Save cursor position before async upload
        const dropPos = editor?.state.selection.anchor ?? 0;
        setUploading(true);
        uploadImageFile(imageFile)
          .then((url) => {
            editor?.chain().focus().insertContentAt(dropPos, { type: 'image', attrs: { src: url } }).run();
          })
          .catch((err) => {
            console.error("Drop image upload failed:", err);
            alert("Failed to upload dropped image.");
          })
          .finally(() => setUploading(false));

        return true;
      },
    },
  });

  // Sync external content changes (e.g., loading existing page data)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
  }, [content]);

  if (!editor) return null;

  return (
    <div className="overflow-hidden rounded-md border border-input bg-background">
      <Toolbar editor={editor} uploading={uploading} setUploading={setUploading} />
      <EditorContent editor={editor} />
      {uploading && (
        <div className="flex items-center gap-2 border-t bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Loader2 size={14} className="animate-spin" />
          Uploading image...
        </div>
      )}
    </div>
  );
}
