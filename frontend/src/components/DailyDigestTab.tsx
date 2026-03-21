import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, ExternalLink, Image as ImageIcon } from "lucide-react";
import { generateComic, type ArtStyle, type GeneratedComic, type Mode } from "@/api/client";

interface DigestSeedStory {
  id: string;
  title: string;
  input: string;
  mode: Mode;
  artStyle: ArtStyle;
  cover: string;
}

interface DigestStoryResult extends DigestSeedStory {
  comic: GeneratedComic | null;
  status: "loading" | "done" | "error";
  error?: string;
}

const DIGEST_DEFAULT_STORIES: DigestSeedStory[] = [
  {
    id: "digest-bbc-ai",
    title: "AI policy race in Europe",
    input: "https://www.bbc.com/news/technology",
    mode: "url",
    artStyle: "manga",
    cover: "/backgrounds/manga-2.jpg",
  },
  {
    id: "digest-history-moon",
    title: "Apollo 11 moon landing",
    input: "Apollo 11 moon landing timeline",
    mode: "history",
    artStyle: "vintage",
    cover: "/backgrounds/vintage-1.jpg",
  },
  {
    id: "digest-drama-social",
    title: "Viral social media backlash",
    input: "Viral creator backlash timeline this week",
    mode: "drama",
    artStyle: "webtoon",
    cover: "/backgrounds/webtoon-1.jpg",
  },
  {
    id: "digest-space-race",
    title: "Private space launch rivalry",
    input: "private space launch rivalry 2026",
    mode: "freeform",
    artStyle: "marvel",
    cover: "/backgrounds/marvel-2.jpg",
  },
  {
    id: "digest-climate",
    title: "Global climate negotiation",
    input: "Global climate negotiation latest turning points",
    mode: "freeform",
    artStyle: "noir",
    cover: "/backgrounds/noir-1.jpg",
  },
];

const DailyDigestTab = () => {
  const [stories, setStories] = useState<DigestStoryResult[]>(
    DIGEST_DEFAULT_STORIES.map((story) => ({ ...story, comic: null, status: "loading" }))
  );
  const [activeStoryId, setActiveStoryId] = useState(DIGEST_DEFAULT_STORIES[0]?.id ?? "");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedStory = useMemo(
    () => stories.find((story) => story.id === activeStoryId) ?? stories[0],
    [stories, activeStoryId]
  );

  const generateDigestStories = async () => {
    setIsRefreshing(true);
    setErrorMessage("");

    setStories((prev) =>
      prev.map((story) => ({
        ...story,
        status: "loading",
        error: undefined,
      }))
    );

    try {
      const results = await Promise.all(
        DIGEST_DEFAULT_STORIES.map(async (story) => {
          try {
            const comic = await generateComic({
              input: story.input,
              mode: story.mode,
              art_style: story.artStyle,
              include_text: true,
            });
            return { ...story, comic, status: "done" as const };
          } catch (error) {
            return {
              ...story,
              comic: null,
              status: "error" as const,
              error: error instanceof Error ? error.message : "Generation failed",
            };
          }
        })
      );

      setStories(results);
      if (!activeStoryId && results.length > 0) {
        setActiveStoryId(results[0].id);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to generate daily digest.");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void generateDigestStories();
    const timer = window.setInterval(() => {
      void generateDigestStories();
    }, 10 * 60_000);
    return () => window.clearInterval(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = () => {
    void generateDigestStories();
  };

  return (
    <div className="space-y-8 pt-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h1 className="text-3xl font-bold text-foreground">
          Events <span className="text-gradient">nổi bật</span>
        </h1>
        <button
          onClick={handleRefresh}
          className="rounded-xl border border-border bg-secondary p-2.5 text-muted-foreground transition hover:text-primary"
        >
          <RefreshCw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} />
        </button>
      </motion.div>
      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stories.map((story) => (
          <button
            key={story.id}
            type="button"
            onClick={() => setActiveStoryId(story.id)}
            className={`overflow-hidden rounded-2xl border text-left transition ${selectedStory?.id === story.id ? "border-primary shadow-[0_0_0_1px_hsl(var(--primary))]" : "border-border hover:border-primary/40"}`}
          >
            <div className="relative h-40 w-full bg-secondary">
              {story.comic?.panels?.[0]?.image_url ? (
                <img src={story.comic.panels[0].image_url} alt={story.title} className="h-full w-full object-cover" />
              ) : (
                <img src={story.cover} alt={story.title} className="h-full w-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <span className="absolute left-3 top-3 rounded-md bg-black/50 px-2 py-1 text-xs text-white">
                {story.status === "loading" ? "Generating..." : story.status === "error" ? "Error" : "Ready"}
              </span>
            </div>
            <div className="space-y-1 p-3">
              <h3 className="line-clamp-1 text-sm font-semibold text-foreground">{story.comic?.script.title ?? story.title}</h3>
              <p className="line-clamp-1 text-xs text-muted-foreground">{story.input}</p>
            </div>
          </button>
        ))}
      </div>

      {selectedStory && (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-foreground">
              {selectedStory.comic?.script.title ?? selectedStory.title}
            </h3>
            {selectedStory.input.startsWith("http") && (
              <a
                href={selectedStory.input}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Read source <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {selectedStory.comic ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {selectedStory.comic.panels.map((panel) => (
                <div key={`${selectedStory.id}-${panel.panel_number}`} className="overflow-hidden rounded-xl border border-border bg-card">
                  <div className="aspect-[4/3] bg-secondary">
                    {panel.image_url ? (
                      <img src={panel.image_url} alt={`Panel ${panel.panel_number}`} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        <ImageIcon className="mr-1 h-4 w-4" /> {panel.image_status}
                      </div>
                    )}
                  </div>
                  <div className="p-2 text-xs text-muted-foreground">Panel {panel.panel_number}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              {selectedStory.status === "loading" ? "Story is being generated..." : selectedStory.error ?? "No comic generated yet."}
            </div>
          )}
        </motion.section>
      )}
    </div>
  );
};

export default DailyDigestTab;
