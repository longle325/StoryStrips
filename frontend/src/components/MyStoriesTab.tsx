import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Image as ImageIcon, Trash2 } from "lucide-react";
import { listComics, deleteComic, type ComicRecord } from "@/api/client";

const MyStoriesTab = () => {
  const [stories, setStories] = useState<ComicRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStories = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await listComics();
      setStories(resp.comics);
    } catch {
      setStories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStories();
  }, [loadStories]);

  const sortedStories = useMemo(
    () => [...stories].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [stories]
  );

  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async (comicId: string) => {
    setDeleteError(null);
    try {
      await deleteComic(comicId);
      setStories((prev) => prev.filter((s) => s.id !== comicId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      console.error("Delete failed", err);
      setDeleteError(msg);
    }
  };

  return (
    <div className="space-y-8 pt-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground">My Stories</h1>
        <p className="mt-1 text-muted-foreground">Your generated comic collection.</p>
      </motion.div>

      {deleteError && (
        <p className="text-sm text-destructive">{deleteError}</p>
      )}

      {loading && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
          Loading stories...
        </div>
      )}

      {!loading && sortedStories.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
          No saved stories yet. Generate one in StoryStrip tab.
        </div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
      >
        {sortedStories.map((story, i) => {
          const thumb = story.panel_urls?.[0];
          return (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ y: -6 }}
              className="group overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/40"
            >
              <div className="relative h-44">
                {thumb ? (
                  <img src={thumb} alt={story.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-secondary">
                    <ImageIcon className="h-10 w-10 text-foreground/20" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/60 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => handleDelete(story.id)}
                    className="rounded-lg bg-destructive p-2 text-destructive-foreground transition hover:scale-110"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="p-3">
                <p className="line-clamp-1 text-sm font-medium text-foreground">{story.title}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {new Date(story.created_at).toLocaleDateString("en-GB")}
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {story.art_style}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};

export default MyStoriesTab;
