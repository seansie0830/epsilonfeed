import React, { useState, useRef, useEffect } from "react";
import {
  Bold,
  Italic,
  Heading2,
  List,
  ListChecks,
  Quote,
  Code,
  Image as ImageIcon,
  Link as LinkIcon,
  Eye,
  Edit3,
  Loader2,
  Send,
  X,
  UploadCloud
} from "lucide-react";
import { MarkdownView } from "./MarkdownView.js";
import { api } from "../../services/api.js";
import { Post } from "../../types/index.js";

interface PostEditorProps {
  initialContent?: string;
  initialTags?: string[];
  postId?: string; // If present, editing existing post
  placeholder?: string;
  onSave: (post: Post) => void;
  onCancel?: () => void;
  isInline?: boolean;
}

export const PostEditor: React.FC<PostEditorProps> = ({
  initialContent = "",
  postId,
  placeholder = "Share your thoughts, code, or insights in Markdown... (Drag & drop or paste images directly)",
  onSave,
  onCancel,
  isInline = false
}) => {
  const [text, setText] = useState(initialContent);
  const [tab, setTab] = useState<"write" | "preview" | "split">("write");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(initialContent);
  }, [initialContent]);

  // Insert text at cursor helper
  const insertTextAtCursor = (before: string, after = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = text.substring(start, end);
    const replacement = before + (selectedText || "") + after;

    const newText = text.substring(0, start) + replacement + text.substring(end);
    setText(newText);

    setTimeout(() => {
      textarea.focus();
      const newCursor = start + before.length + (selectedText ? selectedText.length : 0);
      textarea.setSelectionRange(newCursor, newCursor);
    }, 0);
  };

  // Upload and normalize image
  const handleUploadImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Only image files can be uploaded");
      return;
    }

    setIsUploadingImage(true);
    setError(null);

    try {
      const res = await api.uploadImage(file);
      if (res.success && res.media) {
        // Insert normalized markdown into editor
        const imageMarkdown = `\n${res.media.markdown}\n`;
        insertTextAtCursor(imageMarkdown);
      }
    } catch (err: any) {
      console.error("Image upload failed:", err);
      setError(err.response?.data?.error || err.message || "Failed to normalize and upload image");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle Clipboard Paste (e.g. Screenshot paste)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleUploadImageFile(file);
          return;
        }
      }
    }
  };

  // Handle Drag and Drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        handleUploadImageFile(file);
      }
    }
  };

  // Submit / Save handler
  const handleSubmit = async () => {
    if (!text.trim()) {
      setError("Please write something before publishing");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (postId) {
        // Update existing post
        const res = await api.updatePost(postId, { text: text.trim() });
        if (res.success && res.post) {
          onSave(res.post);
        }
      } else {
        // Create new post
        const res = await api.createPost({ text: text.trim() });
        if (res.success && res.post) {
          setText("");
          onSave(res.post);
        }
      }
    } catch (err: any) {
      console.error("Save post error:", err);
      setError(err.response?.data?.error || err.message || "Failed to save post");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard shortcut Ctrl+Enter to submit, Esc to cancel
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape" && onCancel) {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`relative transition-all rounded-2xl border ${
        dragOver
          ? "border-brand-500 bg-brand-950/20 ring-2 ring-brand-500/40"
          : isInline
          ? "border-slate-700/80 bg-slate-900/90 shadow-2xl"
          : "border-slate-800/80 bg-slate-900/70 shadow-xl"
      } backdrop-blur-xl overflow-hidden`}
    >
      {/* Uploading Overlay Indicator */}
      {isUploadingImage && (
        <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-slate-200">
          <Loader2 className="w-8 h-8 text-brand-400 animate-spin mb-2" />
          <p className="text-sm font-medium">Normalizing & uploading image with Sharp...</p>
          <span className="text-xs text-slate-400">Auto-orienting, resizing & converting to WebP</span>
        </div>
      )}

      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1 p-2 bg-slate-950/60 border-b border-slate-800/80 text-slate-300">
        <div className="flex items-center flex-wrap gap-0.5">
          <button
            type="button"
            onClick={() => insertTextAtCursor("**", "**")}
            title="Bold (**text**)"
            className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor("*", "*")}
            title="Italic (*text*)"
            className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor("### ")}
            title="Heading 3 (### )"
            className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Heading2 className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            type="button"
            onClick={() => insertTextAtCursor("- ")}
            title="Bullet list (- )"
            className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor("- [ ] ")}
            title="Checklist task (- [ ] )"
            className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
          >
            <ListChecks className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor("> ")}
            title="Blockquote (> )"
            className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor("```typescript\n", "\n```")}
            title="Code block"
            className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Code className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            type="button"
            onClick={() => insertTextAtCursor("[link description](", ")")}
            title="Hyperlink"
            className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Upload normalized image"
            className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-brand-400 transition-colors flex items-center gap-1 text-xs"
          >
            <ImageIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Image</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleUploadImageFile(e.target.files[0]);
                e.target.value = "";
              }
            }}
          />
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setTab("write")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
              tab === "write"
                ? "bg-brand-600 text-white font-medium shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Write</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("preview")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
              tab === "preview"
                ? "bg-brand-600 text-white font-medium shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("split")}
            className={`hidden md:flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
              tab === "split"
                ? "bg-brand-600 text-white font-medium shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>Split</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="p-3">
        {error && (
          <div className="mb-3 p-2.5 text-xs text-rose-300 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <X className="w-4 h-4 text-rose-400 hover:text-rose-200" />
            </button>
          </div>
        )}

        <div className={`grid gap-3 ${tab === "split" ? "md:grid-cols-2" : "grid-cols-1"}`}>
          {(tab === "write" || tab === "split") && (
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={isInline ? 6 : 5}
                className="w-full bg-transparent text-slate-100 placeholder-slate-500 resize-y rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-brand-500/50 text-sm font-mono leading-relaxed"
              />
              {dragOver && (
                <div className="absolute inset-0 bg-brand-950/80 border-2 border-dashed border-brand-400 rounded-xl flex flex-col items-center justify-center text-brand-200 pointer-events-none">
                  <UploadCloud className="w-10 h-10 text-brand-400 mb-2 animate-bounce" />
                  <p className="font-semibold text-sm">Drop image to normalize & embed</p>
                </div>
              )}
            </div>
          )}

          {(tab === "preview" || tab === "split") && (
            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 min-h-[140px] max-h-[400px] overflow-y-auto">
              {text.trim() ? (
                <MarkdownView content={text} />
              ) : (
                <div className="text-slate-500 italic text-sm py-6 text-center">
                  Nothing to preview yet. Start typing or paste an image!
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-slate-950/50 border-t border-slate-800/60">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="hidden sm:inline">💡 Tip: Press</span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300">
            Ctrl+Enter
          </kbd>
          <span className="hidden sm:inline">to save</span>
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-xl transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            disabled={isSubmitting || !text.trim()}
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all active:scale-95"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>{postId ? "Update Post" : "Publish Post"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
