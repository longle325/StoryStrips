import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Image as ImageIcon } from "lucide-react";
import { getDigest, refreshDigest, type DigestArticle } from "@/api/client";

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
      const resp = await refreshDigest();
      if (resp.articles) {
        setArticles(resp.articles);
        setSelectedIdx(0);
      } else {
        await fetchData();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setIsRefreshing(false);
    }
  };

  const selected = articles[selectedIdx] ?? null;

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
                  onClick={() => setSelectedIdx(idx)}
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
    </div>
  );
};

export default DailyDigestTab;
