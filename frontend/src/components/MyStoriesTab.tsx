import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Image as ImageIcon, Trash2,
  ChevronLeft, ChevronRight, X,
} from "lucide-react";
import { listComics, deleteComic, type ComicRecord } from "@/api/client";

const MyStoriesTab = () => {
  const [stories, setStories] = useState<ComicRecord[]>([]);
  const [loading, setLoading] = useState(true);

  /* Viewer state */
  const [viewerStoryId, setViewerStoryId] = useState<string | null>(null);
  const [viewerPanelIndex, setViewerPanelIndex] = useState(0);

  const viewerStory = viewerStoryId
    ? stories.find((s) => s.id === viewerStoryId) ?? null
    : null;

  const viewerPanels = useMemo(
    () => viewerStory?.panel_urls ?? [],
    [viewerStory],
  );

  useEffect(() => {
    setViewerPanelIndex(0);
  }, [viewerStoryId]);

  const goPrevPanel = () => {
    if (!viewerPanels.length) return;
    setViewerPanelIndex((prev) => (prev - 1 + viewerPanels.length) % viewerPanels.length);
  };

  const goNextPanel = () => {
    if (!viewerPanels.length) return;
    setViewerPanelIndex((prev) => (prev + 1) % viewerPanels.length);
  };

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
    [stories],
  );

  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, comicId: string) => {
    e.stopPropagation();
    setDeleteError(null);
    try {
      await deleteComic(comicId);
      setStories((prev) => prev.filter((s) => s.id !== comicId));
      if (viewerStoryId === comicId) setViewerStoryId(null);
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
              className="group cursor-pointer overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/40"
              onClick={() => setViewerStoryId(story.id)}
            >
              <div className="relative h-44">
                {thumb ? (
                  <img src={thumb} alt={story.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-secondary">
                    <ImageIcon className="h-10 w-10 text-foreground/20" />
                  </div>
                )}
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

      {/* Fullscreen Viewer Overlay — same style as StoryStripTab */}
      <AnimatePresence>
        {viewerStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
            onClick={() => setViewerStoryId(null)}
          >
            {/* Delete & Close buttons */}
            <div className="absolute right-6 top-6 z-50 flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => handleDelete(e, viewerStory.id)}
                className="rounded-full bg-white/10 p-2 text-red-400 transition hover:bg-red-500/20 hover:text-red-300"
              >
                <Trash2 className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => setViewerStoryId(null)}
                className="rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-white/20 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Title */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40">
              <h2 className="text-xl font-bold text-white drop-shadow-lg">
                {viewerStory.title}
              </h2>
            </div>

            {/* Carousel container */}
            <div
              className="relative flex w-full items-center justify-center gap-4 px-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Left arrow */}
              <button
                type="button"
                onClick={goPrevPanel}
                disabled={!viewerPanels.length}
                className="flex-shrink-0 rounded-full bg-white/10 p-3 text-white/70 transition hover:bg-white/20 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>

              {/* Panels row */}
              <div
                className="relative flex items-center justify-center"
                style={{ width: "min(90vw, 1100px)", height: "min(80vh, 700px)" }}
              >
                {viewerPanels.map((url, index) => {
                  const offset = ((index - viewerPanelIndex + viewerPanels.length) % viewerPanels.length);
                  const normalizedOffset =
                    offset > Math.floor(viewerPanels.length / 2) ? offset - viewerPanels.length : offset;
                  const isCenter = normalizedOffset === 0;
                  const absOffset = Math.abs(normalizedOffset);

                  if (absOffset > 1) return null;

                  return (
                    <motion.div
                      key={`${viewerStory.id}-panel-${index}`}
                      className="absolute cursor-pointer"
                      animate={{
                        x: normalizedOffset * 350,
                        scale: isCenter ? 1 : 0.5,
                        opacity: isCenter ? 1 : 0.5,
                        zIndex: isCenter ? 30 : 10,
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      onClick={() => setViewerPanelIndex(index)}
                      drag={isCenter ? "x" : false}
                      dragConstraints={{ left: 0, right: 0 }}
                      onDragEnd={(_, info) => {
                        if (info.offset.x > 80) goPrevPanel();
                        else if (info.offset.x < -80) goNextPanel();
                      }}
                    >
                      <div
                        className={`overflow-hidden rounded-2xl shadow-2xl ${
                          isCenter ? "ring-2 ring-white/20" : ""
                        }`}
                        style={{ width: "min(55vh, 500px)" }}
                      >
                        <img
                          src={url}
                          alt={`Panel ${index + 1}`}
                          className="block w-full aspect-square object-cover"
                          draggable={false}
                        />
                      </div>
                      {isCenter && (
                        <p className="mt-3 text-center text-sm text-white/70">
                          Panel {index + 1} / {viewerPanels.length}
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Right arrow */}
              <button
                type="button"
                onClick={goNextPanel}
                disabled={!viewerPanels.length}
                className="flex-shrink-0 rounded-full bg-white/10 p-3 text-white/70 transition hover:bg-white/20 hover:text-white disabled:opacity-30"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>

            {/* Dots */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
              {viewerPanels.map((_, i) => (
                <button
                  key={`dot-${i}`}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setViewerPanelIndex(i); }}
                  className={`h-2.5 w-2.5 rounded-full transition ${
                    i === viewerPanelIndex ? "bg-white scale-125" : "bg-white/40 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyStoriesTab;
