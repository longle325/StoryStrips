import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw, Image as ImageIcon, ChevronLeft, ChevronRight, X, ExternalLink, Trash2 } from "lucide-react";
import { getDigest, streamRefreshDigest, deleteComic, type DigestArticle } from "@/api/client";

const DailyDigestTab = () => {
  const [articles, setArticles] = useState<DigestArticle[]>([]);
  const [digestDate, setDigestDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await getDigest();
      setArticles(resp.articles);
      setDigestDate(resp.date);
      setSelectedIdx(0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load digest");
      setArticles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      await streamRefreshDigest((event, data) => {
        if (event === "article_ready") {
          const d = data as { article?: DigestArticle };
          if (d.article) {
            const incoming = d.article as DigestArticle;
            setArticles((prev) => {
              if (incoming.comic_id && prev.some((a) => a.comic_id === incoming.comic_id)) return prev;
              return [...prev, incoming];
            });
          }
        }
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setIsRefreshing(false);
    }
  };

  const selected = articles[selectedIdx] ?? null;

  /* Viewer state */
  const [viewerIdx, setViewerIdx] = useState<number | null>(null);
  const [viewerPanelIndex, setViewerPanelIndex] = useState(0);

  const viewerArticle = viewerIdx !== null ? articles[viewerIdx] ?? null : null;
  const viewerPanels = useMemo(() => viewerArticle?.panel_urls ?? [], [viewerArticle]);

  useEffect(() => {
    setViewerPanelIndex(0);
  }, [viewerIdx]);

  const goPrevPanel = () => {
    if (!viewerPanels.length) return;
    setViewerPanelIndex((prev) => (prev - 1 + viewerPanels.length) % viewerPanels.length);
  };

  const goNextPanel = () => {
    if (!viewerPanels.length) return;
    setViewerPanelIndex((prev) => (prev + 1) % viewerPanels.length);
  };

  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, comicId: string | null) => {
    e.stopPropagation();
    if (!comicId) return;
    setDeleteError(null);
    try {
      await deleteComic(comicId);
      setArticles((prev) => prev.filter((a) => a.comic_id !== comicId));
      setViewerIdx(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      console.error("Delete failed", err);
      setDeleteError(msg);
    }
  };

  return (
    <div className="space-y-8 pt-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Daily <span className="text-gradient">Digest</span>
          </h1>
          {digestDate && (
            <p className="mt-1 text-sm text-muted-foreground">{digestDate}</p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="rounded-xl border border-border bg-secondary p-2.5 text-muted-foreground transition hover:text-primary disabled:opacity-50"
        >
          <RefreshCw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} />
        </button>
      </motion.div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}

      {isLoading && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
          Loading today's digest...
        </div>
      )}

      {!isLoading && articles.length === 0 && !error && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
          No digest available for today. Click refresh to generate one.
        </div>
      )}

      {articles.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article, idx) => {
              const thumb = article.panel_urls?.[0];
              return (
                <button
                  key={article.comic_id ?? idx}
                  type="button"
                  onClick={() => {
                    setSelectedIdx(idx);
                    if (article.panel_urls?.length) setViewerIdx(idx);
                  }}
                  className={`overflow-hidden rounded-2xl border text-left transition ${
                    selectedIdx === idx
                      ? "border-primary shadow-[0_0_0_1px_hsl(var(--primary))]"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="relative h-40 w-full bg-secondary">
                    {thumb ? (
                      <img src={thumb} alt={article.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageIcon className="h-10 w-10 text-foreground/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <span className="absolute left-3 top-3 rounded-md bg-black/50 px-2 py-1 text-xs text-white">
                      {article.panel_urls?.length
                        ? `${article.panel_urls.length} panels`
                        : "No comic"}
                    </span>
                  </div>
                  <div className="space-y-1 p-3">
                    <h3 className="line-clamp-1 text-sm font-semibold text-foreground">
                      {article.title}
                    </h3>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {article.summary}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {selected && selected.panel_urls?.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h3 className="text-xl font-semibold text-foreground">{selected.title}</h3>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {selected.panel_urls.map((url, i) => (
                  <div
                    key={`${selected.comic_id}-panel-${i}`}
                    className="overflow-hidden rounded-xl border border-border bg-card"
                  >
                    <div className="aspect-square bg-secondary">
                      <img
                        src={url}
                        alt={`Panel ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="p-2 text-xs text-muted-foreground">Panel {i + 1}</div>
                  </div>
                ))}
              </div>
            </motion.section>
          )}
        </>
      )}
      {/* Fullscreen Viewer Overlay */}
      <AnimatePresence>
        {viewerArticle && viewerPanels.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
            onClick={() => setViewerIdx(null)}
          >
            {/* Delete & Close buttons */}
            <div className="absolute right-6 top-6 z-50 flex items-center gap-2">
              {viewerArticle.comic_id && (
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, viewerArticle.comic_id)}
                  className="rounded-full bg-white/10 p-2 text-red-400 transition hover:bg-red-500/20 hover:text-red-300"
                >
                  <Trash2 className="h-6 w-6" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewerIdx(null)}
                className="rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-white/20 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
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
                      key={`digest-panel-${viewerArticle.comic_id}-${index}`}
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

            {/* Title + Source link */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-40">
              <h2 className="text-xl font-bold text-white drop-shadow-lg text-center max-w-lg">
                {viewerArticle.title}
              </h2>
              {viewerArticle.source_url && (
                <a
                  href={viewerArticle.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-white/70 transition hover:text-white"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View original article
                </a>
              )}
            </div>

            {/* Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {viewerPanels.map((_, i) => (
                <button
                  key={`digest-dot-${i}`}
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

export default DailyDigestTab;
