import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Check, Copy, ExternalLink, Maximize2, X } from "lucide-react";

interface MarkdownViewProps {
  content: string;
  className?: string;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ content, className = "" }) => {
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null);

  const handleCopyCode = (codeText: string, index: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  let codeBlockCounter = 0;

  return (
    <>
      <div className={`markdown-body ${className}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            code({ node, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || "");
              const isInline = !match && !String(children).includes("\n");

              if (isInline) {
                return (
                  <code className="bg-slate-800 text-brand-300 px-1.5 py-0.5 rounded text-xs font-mono border border-slate-700/60" {...props}>
                    {children}
                  </code>
                );
              }

              const currentIndex = ++codeBlockCounter;
              const codeString = String(children).replace(/\n$/, "");
              const language = match ? match[1] : "text";

              return (
                <div className="relative group my-3 rounded-xl overflow-hidden border border-slate-800 bg-slate-950/90 shadow-lg">
                  <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900/90 border-b border-slate-800/80 text-xs font-mono text-slate-400">
                    <span className="uppercase tracking-wider font-semibold text-[10px] text-brand-400">
                      {language}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(codeString, currentIndex)}
                      className="flex items-center gap-1 text-[11px] hover:text-white transition-colors px-2 py-0.5 rounded bg-slate-800/60 hover:bg-slate-700/60"
                      title="Copy code"
                    >
                      {copiedCodeIndex === currentIndex ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 text-xs md:text-sm font-mono overflow-x-auto text-slate-200">
                    <code>{codeString}</code>
                  </pre>
                </div>
              );
            },
            img({ src, alt }) {
              if (!src) return null;
              return (
                <div className="relative group my-3 rounded-xl overflow-hidden border border-slate-800/90 bg-slate-950 shadow-md">
                  <img
                    src={src}
                    alt={alt || "Embedded visual"}
                    loading="lazy"
                    className="w-full max-h-[500px] object-cover hover:opacity-95 transition-opacity cursor-pointer"
                    onClick={() => setZoomedImage({ src, alt: alt || "Embedded Image" })}
                  />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md rounded-lg p-1.5 text-white pointer-events-none">
                    <Maximize2 className="w-4 h-4" />
                  </div>
                  {alt && (
                    <div className="px-3 py-1.5 bg-slate-900/90 text-xs text-slate-400 italic text-center border-t border-slate-800/80">
                      {alt}
                    </div>
                  )}
                </div>
              );
            },
            a({ href, children }) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-brand-400 hover:text-brand-300 underline underline-offset-4 decoration-brand-500/40 hover:decoration-brand-400 transition-colors"
                >
                  {children}
                  <ExternalLink className="w-3 h-3 opacity-60 inline" />
                </a>
              );
            },
            blockquote({ children }) {
              return (
                <blockquote className="border-l-4 border-brand-500 pl-4 py-2 my-3 bg-brand-950/20 rounded-r-xl text-slate-300 italic">
                  {children}
                </blockquote>
              );
            }
          }}
        >
          {content}
        </ReactMarkdown>
      </div>

      {/* Lightbox Zoom Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute -top-10 right-0 text-slate-400 hover:text-white bg-slate-800/80 p-1.5 rounded-full backdrop-blur-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={zoomedImage.src}
              alt={zoomedImage.alt}
              className="max-w-full max-h-[80vh] object-contain rounded-xl border border-slate-700/60 shadow-2xl"
            />
            {zoomedImage.alt && (
              <p className="mt-3 text-slate-300 text-sm font-medium bg-slate-900/80 px-4 py-1.5 rounded-full border border-slate-800">
                {zoomedImage.alt}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};
