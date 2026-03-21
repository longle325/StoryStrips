import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, Upload, Maximize, Save, Type, Palette,
  ChevronDown, Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { generateComic, type ArtStyle, type Comic, type Mode } from "@/api/client";

const artStyles = ["Manga", "Marvel", "Chibi", "Noir", "Webtoon", "Pixel", "Vintage"];
const modes = ["News Mode", "History Mode", "Drama Mode"];
const textOptions = ["With Text", "Without Text"];
const fonts = ["Comic Sans", "Bangers", "Space Grotesk", "JetBrains Mono"];

const modeMap: Record<string, Mode> = {
  "News Mode": "news",
  "History Mode": "history",
  "Drama Mode": "drama",
};

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
  const [bubbleText, setBubbleText] = useState("Drag bubble text");
  const [fontSize, setFontSize] = useState([16]);
  const [selectedFont, setSelectedFont] = useState("Comic Sans");
  const [bubbleColor, setBubbleColor] = useState("#00d4ff");
  const [generatedComic, setGeneratedComic] = useState<Comic | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const activePanelUrl = generatedComic?.panel_urls[0] ?? "";
  const activeDialogue = bubbleText;

  const handleGenerate = async () => {
    const trimmedInput = inputQuery.trim();
    if (!trimmedInput) {
      setErrorMessage("Please enter a URL or topic before generating.");
      return;
    }

    setIsGenerating(true);
    setErrorMessage("");

    try {
      const comic = await generateComic({
        mode: modeMap[mode],
        input_query: trimmedInput,
        art_style: styleMap[artStyle],
        include_text: textOption === "With Text",
      });
      setGeneratedComic(comic);
      const initialText = comic.script_json.panels[0]?.dialogue[0]?.text;
      if (initialText) {
        setBubbleText(initialText);
      }
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
          {generatedComic ? (
            generatedComic.panel_urls.map((url, index) => (
              <motion.div
                key={`${generatedComic.id}-${index}`}
                whileHover={{ scale: 1.05, y: -4 }}
                className="flex-shrink-0 overflow-hidden rounded-xl border border-border"
              >
                <img src={url} alt={`Panel ${index + 1}`} className="h-36 w-28 object-cover" />
                <div className="bg-card p-2">
                  <p className="text-xs text-muted-foreground">{generatedComic.title}</p>
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

      {/* Online Editor */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="mb-4 text-xl font-semibold text-foreground">Online Editor</h2>
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          {/* Canvas */}
          <div className="relative flex min-h-[400px] items-center justify-center rounded-2xl border border-border bg-card">
            {activePanelUrl ? (
              <img src={activePanelUrl} alt="Generated panel" className="h-72 w-52 rounded-lg object-cover" />
            ) : (
              <div className="flex h-72 w-52 items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, hsl(190,70%,20%), hsl(280,60%,20%))" }}>
                <ImageIcon className="h-16 w-16 text-foreground/20" />
              </div>
            )}
            <button className="absolute right-3 top-3 rounded-lg bg-secondary p-2 text-muted-foreground transition hover:text-primary">
              <Maximize className="h-4 w-4" />
            </button>
            <div
              className="absolute left-1/2 top-16 -translate-x-1/4 cursor-move rounded-xl border-2 border-primary/50 bg-card/90 px-4 py-2 text-sm font-medium text-foreground shadow-lg backdrop-blur"
              style={{
                borderColor: bubbleColor,
                fontSize: `${fontSize[0]}px`,
                fontFamily: selectedFont,
              }}
            >
              {activeDialogue}
            </div>
          </div>

          {/* Toolbar */}
          <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Type className="h-4 w-4 text-primary" /> Speech Bubbles
            </h3>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Bubble Text</label>
              <Input
                placeholder="Enter bubble text..."
                className="bg-secondary"
                value={bubbleText}
                onChange={(event) => setBubbleText(event.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Font Size: {fontSize[0]}px</label>
              <Slider value={fontSize} onValueChange={setFontSize} min={10} max={48} step={1} />
            </div>

            <div>
              <label className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                <Palette className="h-3 w-3" /> Bubble Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bubbleColor}
                  onChange={(e) => setBubbleColor(e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded border-none"
                />
                <span className="font-mono text-xs text-muted-foreground">{bubbleColor}</span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Font Family</label>
              <div className="grid grid-cols-2 gap-2">
                {fonts.map((f) => (
                  <button
                    key={f}
                    onClick={() => setSelectedFont(f)}
                    className={`rounded-lg border px-3 py-1.5 text-xs transition ${f === selectedFont ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground hover:border-primary/30"}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <Button className="w-full gap-2" size="lg">
              <Save className="h-4 w-4" /> Save
            </Button>
          </div>
        </div>
      </motion.section>
    </div>
  );
};

export default StoryStripTab;
