import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sparkles, Upload,
  ChevronDown, ChevronLeft, ChevronRight, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateComic, type ArtStyle, type Mode, type GeneratedComic } from "@/api/client";
import ComicPanel from "@/components/ComicPanel";
import EditTextTab from "@/components/EditTextTab";

const artStyles = ["Manga", "Marvel", "Chibi", "Noir", "Webtoon", "Pixel", "Vintage"];
const modes = ["News Mode", "History Mode", "Drama Mode"];
const textOptions = ["With Text", "Without Text"];

const modeMap: Record<string, Mode> = {
  "News Mode": "freeform",
  "History Mode": "history",
  "Drama Mode": "drama",
};

const URL_PATTERN = /^https?:\/\//i;

const styleMap: Record<string, ArtStyle> = {
  Manga: "manga",
  Marvel: "marvel",
  Chibi: "chibi",
  Noir: "noir",
  Webtoon: "webtoon",
  Pixel: "pixel",
  Vintage: "vintage",
};

const Dropdown = ({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-secondary-foreground transition hover:border-primary/50"
      >
        <span className="text-muted-foreground text-xs">{label}:</span>
        <span className="font-medium">{value}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card p-1 shadow-xl"
        >
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full rounded-md px-3 py-1.5 text-left text-sm transition ${opt === value ? "bg-primary/20 text-primary" : "text-card-foreground hover:bg-secondary"}`}
            >
              {opt}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
};

interface RecentComic extends GeneratedComic {
  source_input: string;
  created_at: string;
}

interface StoryStripTabProps {
  artStyle: string;
  onArtStyleChange: (style: string) => void;
}

const StoryStripTab = ({ artStyle, onArtStyleChange }: StoryStripTabProps) => {
  const [mode, setMode] = useState("News Mode");
  const [textOption, setTextOption] = useState("With Text");
  const [inputQuery, setInputQuery] = useState("");
  const [recentComics, setRecentComics] = useState<RecentComic[]>([]);
  const [selectedComicId, setSelectedComicId] = useState<string | null>(null);
  const [viewerComicId, setViewerComicId] = useState<string | null>(null);
  const [viewerPanelIndex, setViewerPanelIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [genPercent, setGenPercent] = useState(0);
  const genStartRef = useRef(0);
  const genTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopGenTimer = useCallback(() => {
    if (genTimerRef.current) {
      clearInterval(genTimerRef.current);
      genTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isGenerating) {
      genStartRef.current = Date.now();
      setGenPercent(0);
      genTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - genStartRef.current;
        const pct = 90 * (1 - Math.exp(-elapsed / 12000));
        setGenPercent(Math.min(pct, 90));
      }, 200);
    } else {
      stopGenTimer();
    }
    return stopGenTimer;
  }, [isGenerating, stopGenTimer]);

  const selectedComic = selectedComicId
    ? recentComics.find((comic) => comic.comic_id === selectedComicId) ?? null
    : null;

  const viewerComic = viewerComicId
    ? recentComics.find((comic) => comic.comic_id === viewerComicId) ?? null
    : null;

  const viewerPanels = useMemo(() => {
    if (!viewerComic) return [];
    return viewerComic.panels.slice(0, 5);
  }, [viewerComic]);

  useEffect(() => {
    setViewerPanelIndex(0);
  }, [viewerComicId]);

  const goPrevPanel = () => {
    if (!viewerPanels.length) return;
    setViewerPanelIndex((prev) => (prev - 1 + viewerPanels.length) % viewerPanels.length);
  };

  const goNextPanel = () => {
    if (!viewerPanels.length) return;
    setViewerPanelIndex((prev) => (prev + 1) % viewerPanels.length);
  };

  const handleGenerate = async () => {
    const trimmedInput = inputQuery.trim();
    if (!trimmedInput) {
      setErrorMessage("Please enter a URL or topic before generating.");
      return;
    }

    setIsGenerating(true);
    setErrorMessage("");

    try {
      const selectedMode = mode === "News Mode" && URL_PATTERN.test(trimmedInput)
        ? "url"
        : modeMap[mode];

      const comic = await generateComic({
        input: trimmedInput,
        mode: selectedMode,
        art_style: styleMap[artStyle],
        include_text: textOption === "With Text",
      });

      const recent: RecentComic = {
        ...comic,
        source_input: trimmedInput,
        created_at: new Date().toISOString(),
      };
      setRecentComics((prev) => [recent, ...prev.filter((c) => c.comic_id !== comic.comic_id)]);
      setSelectedComicId(comic.comic_id);
      setViewerComicId(comic.comic_id);
      stopGenTimer();
      setGenPercent(100);
      await new Promise((r) => setTimeout(r, 400));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to generate comic.");
    } finally {
      setIsGenerating(false);
      setGenPercent(0);
    }
  };

  return (
    <div className="space-y-12">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="pt-12 text-center"
      >
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
          <span className="text-gradient">StoryStrip AI</span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
          Transform any story into stunning comic strips with AI-powered artistry.
        </p>
      </motion.section>

      {/* Generation Hub */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mx-auto max-w-3xl space-y-4"
      >
        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
          <div className="relative">
            <textarea
              placeholder="Paste a URL, type your story, or describe what you want..."
              rows={3}
              value={inputQuery}
              onChange={(event) => setInputQuery(event.target.value)}
              className="w-full resize-none rounded-xl border border-border bg-secondary px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <label className="absolute bottom-3 right-3 cursor-pointer rounded-lg bg-muted p-2 text-muted-foreground transition hover:text-primary">
              <Upload className="h-4 w-4" />
              <input type="file" className="hidden" accept=".pdf,.txt" />
            </label>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <Dropdown label="Style" options={artStyles} value={artStyle} onChange={onArtStyleChange} />
            <Dropdown label="Mode" options={modes} value={mode} onChange={setMode} />
            <Dropdown label="Text" options={textOptions} value={textOption} onChange={setTextOption} />
          </div>

          <Button className="mt-4 w-full gap-2 glow-primary" size="lg" onClick={handleGenerate} disabled={isGenerating}>
            <Sparkles className="h-4 w-4" />
            {isGenerating ? "Generating..." : "Generate Comic"}
          </Button>
          {isGenerating && (
            <div className="mt-3 space-y-1.5">
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  animate={{ width: `${genPercent}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {genPercent >= 100 ? "Complete!" : genPercent < 5 ? "Starting..." : "Generating comic..."}
              </p>
            </div>
          )}
          {errorMessage && <p className="mt-3 text-sm text-destructive">{errorMessage}</p>}
        </div>
      </motion.section>

      {/* Recent Stories */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="mb-4 text-xl font-semibold text-foreground">Recent Stories</h2>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
          {recentComics.length > 0 ? (
            recentComics.map((comic) => {
              const thumb = comic.panels[0]?.image_url;
              return (
                <motion.div
                  key={comic.comic_id}
                  whileHover={{ scale: 1.05, y: -4 }}
                  className={`group w-32 flex-shrink-0 overflow-hidden rounded-xl border ${selectedComicId === comic.comic_id ? "border-primary" : "border-border"}`}
                >
                  {thumb ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedComicId(comic.comic_id);
                        setViewerComicId(comic.comic_id);
                      }}
                      className="relative block w-full aspect-square overflow-hidden bg-secondary"
                    >
                      <img src={thumb} alt={comic.script.title} className="absolute inset-0 h-full w-full object-cover" />
                      <span className="absolute inset-x-0 bottom-0 bg-black/50 px-2 py-1 text-left text-[10px] text-white">
                        {comic.panels.length} panels
                      </span>
                    </button>
                  ) : (
                    <div className="flex w-full aspect-square items-center justify-center bg-secondary text-xs text-muted-foreground">
                      {comic.panels[0]?.image_status ?? "pending"}
                    </div>
                  )}
                  <div className="bg-card p-2">
                    <p className="line-clamp-1 text-xs text-muted-foreground">{comic.script.title}</p>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="flex h-36 w-full items-center justify-center rounded-xl border border-dashed border-border bg-card text-sm text-muted-foreground">
              Generate a comic to see recent panels here.
            </div>
          )}
        </div>
      </motion.section>

      {/* Fullscreen Viewer Overlay */}
      <AnimatePresence>
      {viewerComic && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
          onClick={() => setViewerComicId(null)}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setViewerComicId(null)}
            className="absolute right-6 top-6 z-50 rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-white/20 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Title */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40">
            <h2 className="text-xl font-bold text-white drop-shadow-lg">
              {viewerComic.script.title}
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
            <div className="relative flex items-center justify-center" style={{ width: "min(90vw, 1100px)", height: "min(80vh, 700px)" }}>
              {viewerPanels.map((panel, index) => {
                const offset = ((index - viewerPanelIndex + viewerPanels.length) % viewerPanels.length);
                const normalizedOffset =
                  offset > Math.floor(viewerPanels.length / 2) ? offset - viewerPanels.length : offset;
                const isCenter = normalizedOffset === 0;
                const absOffset = Math.abs(normalizedOffset);

                if (absOffset > 1) return null;

                return (
                  <motion.div
                    key={`${viewerComic.comic_id}-${panel.panel_number}`}
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
                      className={`overflow-hidden rounded-2xl shadow-2xl transition-shadow ${
                        isCenter ? "ring-2 ring-white/20" : ""
                      }`}
                      style={{
                        width: isCenter ? "min(55vh, 500px)" : "min(55vh, 500px)",
                      }}
                    >
                      <ComicPanel panel={panel} />
                    </div>
                    {isCenter && (
                      <p className="mt-3 text-center text-sm text-white/70">
                        Panel {panel.panel_number} / {viewerPanels.length}
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
                className={`h-2.5 w-2.5 rounded-full transition ${i === viewerPanelIndex ? "bg-white scale-125" : "bg-white/40 hover:bg-white/60"}`}
              />
            ))}
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Edit Text Section */}
      <EditTextTab />
    </div>
  );
};

export default StoryStripTab;
