import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, Upload,
  ChevronDown, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { generateComic, type ArtStyle, type Mode } from "@/api/client";
import { addComicToCache, loadCachedComics, type CachedComic } from "@/lib/comicCache";

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

interface StoryStripTabProps {
  artStyle: string;
  onArtStyleChange: (style: string) => void;
}

const StoryStripTab = ({ artStyle, onArtStyleChange }: StoryStripTabProps) => {
  const [mode, setMode] = useState("News Mode");
  const [textOption, setTextOption] = useState("With Text");
  const [inputQuery, setInputQuery] = useState("");
  const [recentComics, setRecentComics] = useState<CachedComic[]>(() => loadCachedComics());
  const [selectedComicId, setSelectedComicId] = useState<string | null>(() => loadCachedComics()[0]?.comic_id ?? null);
  const [viewerComicId, setViewerComicId] = useState<string | null>(null);
  const [viewerPanelIndex, setViewerPanelIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedComic = selectedComicId
    ? recentComics.find((comic) => comic.comic_id === selectedComicId) ?? null
    : null;

  const viewerComic = viewerComicId
    ? recentComics.find((comic) => comic.comic_id === viewerComicId) ?? null
    : null;

  const viewerPanels = useMemo(() => {
    if (!viewerComic) {
      return [];
    }
    return viewerComic.panels.slice(0, 5);
  }, [viewerComic]);

  useEffect(() => {
    setViewerPanelIndex(0);
  }, [viewerComicId]);

  const goPrevPanel = () => {
    if (!viewerPanels.length) {
      return;
    }
    setViewerPanelIndex((prev) => (prev - 1 + viewerPanels.length) % viewerPanels.length);
  };

  const goNextPanel = () => {
    if (!viewerPanels.length) {
      return;
    }
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
      const updated = addComicToCache(comic, trimmedInput);
      setRecentComics(updated);
      setSelectedComicId(comic.comic_id);
      setViewerComicId(comic.comic_id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to generate comic.");
    } finally {
      setIsGenerating(false);
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
            recentComics.map((comic) => (
              <motion.div
                key={comic.comic_id}
                whileHover={{ scale: 1.05, y: -4 }}
                className={`group flex-shrink-0 overflow-hidden rounded-xl border ${selectedComicId === comic.comic_id ? "border-primary" : "border-border"}`}
              >
                {comic.panels[0]?.image_url ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedComicId(comic.comic_id);
                      setViewerComicId(comic.comic_id);
                    }}
                    className="relative block w-32 aspect-square bg-secondary"
                  >
                    <img src={comic.panels[0].image_url} alt={comic.script.title} className="h-full w-full object-cover" />
                    <span className="absolute inset-x-0 bottom-0 bg-black/50 px-2 py-1 text-left text-[10px] text-white">
                      {comic.panels.length} panels
                    </span>
                  </button>
                ) : (
                  <div className="flex w-32 aspect-square items-center justify-center bg-secondary text-xs text-muted-foreground">
                    {comic.panels[0]?.image_status ?? "pending"}
                  </div>
                )}
                <div className="bg-card p-2">
                  <p className="line-clamp-1 text-xs text-muted-foreground">{comic.script.title}</p>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="flex h-36 w-full items-center justify-center rounded-xl border border-dashed border-border bg-card text-sm text-muted-foreground">
              Generate a comic to see recent panels here.
            </div>
          )}
        </div>
      </motion.section>

      <Dialog open={Boolean(viewerComic)} onOpenChange={(open) => !open && setViewerComicId(null)}>
        <DialogContent className="max-w-6xl border border-border/40 bg-card/90 backdrop-blur-md p-6">
          <DialogTitle>{viewerComic?.script.title ?? "Story"}</DialogTitle>
          {viewerComic && (
            <div className="space-y-4">
              <div className="relative h-[460px] w-full overflow-hidden rounded-2xl border border-border/60 bg-black/30">
                {viewerPanels.map((panel, index) => {
                  const offset = ((index - viewerPanelIndex + viewerPanels.length) % viewerPanels.length);
                  const normalizedOffset =
                    offset > Math.floor(viewerPanels.length / 2) ? offset - viewerPanels.length : offset;
                  const isCenter = normalizedOffset === 0;
                  const absOffset = Math.abs(normalizedOffset);

                  if (absOffset > 2) {
                    return null;
                  }

                  return (
                    <motion.div
                      key={`${viewerComic.comic_id}-${panel.panel_number}`}
                      className="absolute left-1/2 top-1/2"
                      animate={{
                        x: normalizedOffset * 230,
                        y: "-50%",
                        scale: isCenter ? 1 : 0.72 - absOffset * 0.07,
                        opacity: isCenter ? 1 : 0.5,
                        zIndex: 20 - absOffset,
                        rotateY: normalizedOffset * -10,
                      }}
                      transition={{ type: "spring", stiffness: 280, damping: 28 }}
                      drag={isCenter ? "x" : false}
                      dragConstraints={{ left: 0, right: 0 }}
                      onDragEnd={(_, info) => {
                        if (info.offset.x > 80) {
                          goPrevPanel();
                        } else if (info.offset.x < -80) {
                          goNextPanel();
                        }
                      }}
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      <button
                        type="button"
                        onClick={() => setViewerPanelIndex(index)}
                        className="w-52 overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
                      >
                        {panel.image_url ? (
                          <div className="w-52 aspect-square bg-secondary">
                            <img src={panel.image_url} alt={`Panel ${index + 1}`} className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="flex w-52 aspect-square items-center justify-center bg-secondary text-xs text-muted-foreground">
                            {panel.image_status}
                          </div>
                        )}
                        <div className="p-2 text-xs text-muted-foreground text-left">Panel {panel.panel_number}</div>
                      </button>
                    </motion.div>
                  );
                })}
              </div>

              <div className="flex items-center justify-center gap-6">
                <button
                  type="button"
                  onClick={goPrevPanel}
                  disabled={!viewerPanels.length}
                  className="rounded-full border border-border bg-secondary p-3 text-muted-foreground transition hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex gap-2">
                  {viewerPanels.map((_, i) => (
                    <span
                      key={`dot-${i}`}
                      className={`h-2 w-2 rounded-full ${i === viewerPanelIndex ? "bg-primary" : "bg-muted"}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={goNextPanel}
                  disabled={!viewerPanels.length}
                  className="rounded-full border border-border bg-secondary p-3 text-muted-foreground transition hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default StoryStripTab;
