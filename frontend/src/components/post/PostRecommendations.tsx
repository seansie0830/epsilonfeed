import React, { useEffect, useState } from "react";
import { Sparkles, Heart, MessageSquare, ArrowRight, Loader2 } from "lucide-react";
import { Post } from "../../types/index.js";
import { api } from "../../services/api.js";

interface PostRecommendationsProps {
  postId: string;
  onSelectPost?: (postId: string) => void;
}

export const PostRecommendations: React.FC<PostRecommendationsProps> = ({
  postId,
  onSelectPost
}) => {
  const [recommendations, setRecommendations] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadRecs() {
      try {
        setLoading(true);
        const res = await api.getRecommendations(postId, 3);
        if (isMounted) {
          setRecommendations(res.recommendations);
        }
      } catch (err) {
        console.error("Failed to load recommendations:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadRecs();
    return () => {
      isMounted = false;
    };
  }, [postId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4 text-xs text-slate-500 gap-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-400" />
        <span>Finding related posts you may like...</span>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 pt-4 border-t border-slate-800/80">
      <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold text-brand-300">
        <Sparkles className="w-3.5 h-3.5 text-brand-400" />
        <span>You May Also Like</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {recommendations.map((rec) => {
          // Clean text snippet for preview
          const previewText = rec.text
            .replace(/[#*`_\[\]()]/g, "")
            .replace(/!\[.*?\]\(.*?\)/g, "")
            .trim()
            .slice(0, 90);

          return (
            <div
              key={rec.uid}
              onClick={() => onSelectPost && onSelectPost(rec.uid)}
              className="group p-3 rounded-xl bg-slate-950/60 hover:bg-slate-900/90 border border-slate-800/80 hover:border-brand-500/50 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <img
                    src={
                      rec.author?.avatarUrl ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${rec.uid}`
                    }
                    alt={rec.author?.username || "Author"}
                    className="w-4 h-4 rounded-full bg-slate-800 object-cover"
                  />
                  <span className="text-[11px] font-medium text-slate-300 truncate">
                    {rec.author?.displayName || rec.author?.username || "Anonymous"}
                  </span>
                </div>
                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed group-hover:text-white transition-colors">
                  {previewText}...
                </p>
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-900 text-[10px] text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3 text-rose-400" />
                    {rec._count?.reactions || 0}
                  </span>
                  {rec.tags && rec.tags[0] && (
                    <span className="px-1.5 py-0.5 rounded bg-brand-950/80 text-brand-400 border border-brand-800/40 truncate max-w-[80px]">
                      #{rec.tags[0].text}
                    </span>
                  )}
                </div>
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 text-brand-400 transition-all" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
