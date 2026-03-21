import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ImagePlus, Type, MessageCircle, Trash2, Move,
  Plus, Minus, RotateCcw, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BubbleItem {
  id: string;
  src: string;       // public path to bubble PNG
  x: number;         // % from left
  y: number;         // % from top
  width: number;     // px
  height: number;    // px
}

interface TextItem {
  id: string;
  text: string;
  x: number;
  y: number;
  fontFamily: string;
  fontSize: number;
  color: string;
  strokeColor: string;
  strokeWidth: number;
}

type SelectedOverlay =
  | { kind: "bubble"; id: string }
  | { kind: "text"; id: string }
  | null;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

let _idCounter = 0;
const uid = () => `overlay-${++_idCounter}-${Date.now()}`;

const COLORS = [
  "#ffffff", "#000000", "#ff0000", "#ff6600", "#ffcc00",
  "#00cc00", "#0066ff", "#9933ff", "#ff3399", "#00cccc",
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const EditTextTab = () => {
  /* ---- canvas image ---- */
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  /* ---- overlays ---- */
  const [bubbles, setBubbles] = useState<BubbleItem[]>([]);
  const [texts, setTexts] = useState<TextItem[]>([]);
  const [selected, setSelected] = useState<SelectedOverlay>(null);

  /* ---- available assets ---- */
  const [bubbleAssets, setBubbleAssets] = useState<string[]>([]);
  const [fontAssets, setFontAssets] = useState<string[]>([]);

  /* ---- active tool tab ---- */
  const [toolTab, setToolTab] = useState<"bubble" | "text">("bubble");

  /* ---- drag state ---- */
  const dragRef = useRef<{
    kind: "bubble" | "text";
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  /* ---- resize state ---- */
  const resizeRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origW: number;
    origH: number;
  } | null>(null);

  /* Load bubble PNGs and fonts from public folders */
  useEffect(() => {
    // Scan for bubble images — we use a manifest approach:
    // users drop PNGs into public/bubble_chat_image/ and we list them.
    // Since Vite can't dynamically list public files at runtime,
    // we use import.meta.glob on the assets side.
    const bubbleModules = import.meta.glob<string>(
      "/public/bubble_chat_image/*.{png,PNG,svg,SVG,webp}",
      { eager: true, query: "?url", import: "default" },
    );
    const paths = Object.values(bubbleModules);
    setBubbleAssets(paths);

    const fontModules = import.meta.glob<string>(
      "/public/font_text_edit/*.{ttf,otf,woff,woff2,TTF,OTF}",
      { eager: true, query: "?url", import: "default" },
    );
    const fonts = Object.entries(fontModules).map(([path, url]) => {
      const filename = path.split("/").pop() ?? "";
      const name = filename.replace(/\.[^.]+$/, "");
      // Register font-face dynamically
      const face = new FontFace(name, `url(${url})`);
      face.load().then((loaded) => document.fonts.add(loaded)).catch(() => {});
      return name;
    });
    setFontAssets(fonts);
  }, []);

  /* ---- Image drop / paste ---- */
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  /* ---- Overlay dragging (move) ---- */
  const startDrag = useCallback(
    (e: React.MouseEvent, kind: "bubble" | "text", id: string) => {
      e.stopPropagation();
      setSelected({ kind, id });
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const item =
        kind === "bubble"
          ? bubbles.find((b) => b.id === id)
          : texts.find((t) => t.id === id);
      if (!item) return;
      dragRef.current = {
        kind,
        id,
        startX: e.clientX,
        startY: e.clientY,
        origX: item.x,
        origY: item.y,
      };
    },
    [bubbles, texts],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      const r = resizeRef.current;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (d) {
        const dx = ((e.clientX - d.startX) / rect.width) * 100;
        const dy = ((e.clientY - d.startY) / rect.height) * 100;
        if (d.kind === "bubble") {
          setBubbles((prev) =>
            prev.map((b) =>
              b.id === d.id ? { ...b, x: d.origX + dx, y: d.origY + dy } : b,
            ),
          );
        } else {
          setTexts((prev) =>
            prev.map((t) =>
              t.id === d.id ? { ...t, x: d.origX + dx, y: d.origY + dy } : t,
            ),
          );
        }
      }

      if (r) {
        const dx = e.clientX - r.startX;
        const dy = e.clientY - r.startY;
        setBubbles((prev) =>
          prev.map((b) =>
            b.id === r.id
              ? {
                  ...b,
                  width: Math.max(40, r.origW + dx),
                  height: Math.max(30, r.origH + dy),
                }
              : b,
          ),
        );
      }
    };

    const onUp = () => {
      dragRef.current = null;
      resizeRef.current = null;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  /* ---- Add bubble to canvas ---- */
  const addBubble = (src: string) => {
    if (!imageSrc) return;
    setBubbles((prev) => [
      ...prev,
      { id: uid(), src, x: 30, y: 20, width: 140, height: 100 },
    ]);
  };

  /* ---- Add text to canvas ---- */
  const addText = () => {
    if (!imageSrc) return;
    setTexts((prev) => [
      ...prev,
      {
        id: uid(),
        text: "Text",
        x: 40,
        y: 50,
        fontFamily: fontAssets[0] ?? "Bangers",
        fontSize: 28,
        color: "#ffffff",
        strokeColor: "#000000",
        strokeWidth: 2,
      },
    ]);
  };

  /* ---- Delete selected ---- */
  const deleteSelected = () => {
    if (!selected) return;
    if (selected.kind === "bubble") {
      setBubbles((prev) => prev.filter((b) => b.id !== selected.id));
    } else {
      setTexts((prev) => prev.filter((t) => t.id !== selected.id));
    }
    setSelected(null);
  };

  /* ---- Selected text helper ---- */
  const selectedText =
    selected?.kind === "text"
      ? texts.find((t) => t.id === selected.id) ?? null
      : null;

  const updateSelectedText = (patch: Partial<TextItem>) => {
    if (!selected || selected.kind !== "text") return;
    setTexts((prev) =>
      prev.map((t) => (t.id === selected.id ? { ...t, ...patch } : t)),
    );
  };

  /* ---- Selected bubble helper ---- */
  const selectedBubble =
    selected?.kind === "bubble"
      ? bubbles.find((b) => b.id === selected.id) ?? null
      : null;

  /* ---- Export ---- */
  const handleExport = async () => {
    if (!canvasRef.current) return;
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(canvasRef.current, {
      useCORS: true,
      backgroundColor: null,
    });
    const link = document.createElement("a");
    link.download = "storystrip-edit.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  /* ---- Reset ---- */
  const handleReset = () => {
    setImageSrc(null);
    setBubbles([]);
    setTexts([]);
    setSelected(null);
  };

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div className="space-y-8">
      {/* Section header */}
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <h2 className="text-xl font-semibold text-foreground">Edit Text</h2>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Main editor layout */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-6"
      >
        {/* ===================== LEFT: Canvas ===================== */}
        <div className="flex-1 min-w-0">
          <div
            ref={canvasRef}
            className={`relative mx-auto overflow-hidden rounded-2xl border-2 border-dashed transition ${
              imageSrc
                ? "border-border bg-black"
                : "border-primary/40 bg-secondary/50 hover:border-primary/60"
            }`}
            style={{ minHeight: 500, maxWidth: 700 }}
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => setSelected(null)}
          >
            {!imageSrc ? (
              <label className="flex h-full min-h-[500px] cursor-pointer flex-col items-center justify-center gap-4 text-muted-foreground">
                <ImagePlus className="h-16 w-16 text-primary/40" />
                <span className="text-lg font-medium">
                  Drag & drop an image here
                </span>
                <span className="text-sm">or click to browse</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </label>
            ) : (
              <>
                {/* Base image */}
                <img
                  src={imageSrc}
                  alt="Edit canvas"
                  className="block w-full select-none"
                  draggable={false}
                />

                {/* Bubble overlays */}
                {bubbles.map((b) => {
                  const isSelected = selected?.kind === "bubble" && selected.id === b.id;
                  return (
                    <div
                      key={b.id}
                      className={`absolute cursor-move select-none ${
                        isSelected ? "ring-2 ring-primary ring-offset-1" : ""
                      }`}
                      style={{
                        left: `${b.x}%`,
                        top: `${b.y}%`,
                        width: b.width,
                        height: b.height,
                      }}
                      onMouseDown={(e) => startDrag(e, "bubble", b.id)}
                    >
                      <img
                        src={b.src}
                        alt="bubble"
                        className="h-full w-full object-contain pointer-events-none"
                        draggable={false}
                      />
                      {/* Resize handle */}
                      {isSelected && (
                        <div
                          className="absolute -bottom-1 -right-1 h-4 w-4 cursor-se-resize rounded-sm bg-primary"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            resizeRef.current = {
                              id: b.id,
                              startX: e.clientX,
                              startY: e.clientY,
                              origW: b.width,
                              origH: b.height,
                            };
                          }}
                        />
                      )}
                    </div>
                  );
                })}

                {/* Text overlays */}
                {texts.map((t) => {
                  const isSelected = selected?.kind === "text" && selected.id === t.id;
                  return (
                    <div
                      key={t.id}
                      className={`absolute cursor-move select-none whitespace-nowrap ${
                        isSelected ? "ring-2 ring-primary ring-offset-1 rounded" : ""
                      }`}
                      style={{
                        left: `${t.x}%`,
                        top: `${t.y}%`,
                        fontFamily: `'${t.fontFamily}', 'Bangers', cursive`,
                        fontSize: t.fontSize,
                        color: t.color,
                        WebkitTextStroke: `${t.strokeWidth}px ${t.strokeColor}`,
                        paintOrder: "stroke fill",
                        letterSpacing: "1px",
                      }}
                      onMouseDown={(e) => startDrag(e, "text", t.id)}
                    >
                      {t.text}
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Canvas actions */}
          {imageSrc && (
            <div className="mt-3 flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" className="gap-2" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" /> Reset
              </Button>
              <Button size="sm" className="gap-2 glow-primary" onClick={handleExport}>
                <Download className="h-4 w-4" /> Export PNG
              </Button>
            </div>
          )}
        </div>

        {/* =================== RIGHT: Tools Panel =================== */}
        <div className="w-80 flex-shrink-0 space-y-4">
          {/* Tool tab switcher */}
          <div className="flex rounded-xl border border-border bg-secondary p-1">
            <button
              onClick={() => setToolTab("bubble")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                toolTab === "bubble"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageCircle className="h-4 w-4" /> Bubble
            </button>
            <button
              onClick={() => setToolTab("text")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                toolTab === "text"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Type className="h-4 w-4" /> Text
            </button>
          </div>

          {/* ---- Bubble tool ---- */}
          {toolTab === "bubble" && (
            <div className="space-y-3 rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground">Speech Bubbles</h3>
              <p className="text-xs text-muted-foreground">
                Click a bubble below to add it to the canvas.
              </p>

              {bubbleAssets.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {bubbleAssets.map((src) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => addBubble(src)}
                      className="rounded-lg border border-border bg-white/5 p-2 transition hover:border-primary hover:bg-primary/10"
                    >
                      <img
                        src={src}
                        alt="bubble"
                        className="h-16 w-full object-contain"
                        draggable={false}
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-secondary/50 px-4 py-8 text-center text-xs text-muted-foreground">
                  No bubble images yet.
                  <br />
                  Add <code>.png</code> files to{" "}
                  <code>public/bubble_chat_image/</code>
                </div>
              )}

              {/* Bubble layers */}
              {bubbles.length > 0 && (
                <div className="space-y-2 border-t border-border pt-3">
                  <p className="text-xs font-medium text-foreground">Bubble Layers</p>
                  <div className="flex flex-col gap-1">
                    {bubbles.map((b, i) => {
                      const isActive = selected?.kind === "bubble" && selected.id === b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setSelected({ kind: "bubble", id: b.id })}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                            isActive
                              ? "bg-primary/20 text-primary ring-1 ring-primary/40"
                              : "bg-secondary text-foreground hover:bg-secondary/80"
                          }`}
                        >
                          <MessageCircle className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">Bubble {i + 1}</span>
                          <span className="ml-auto text-[10px] text-muted-foreground">
                            {b.width}×{b.height}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Controls for selected bubble */}
                  {selectedBubble ? (
                    <div className="space-y-3 border-t border-border pt-3">
                      {/* Size (scales width & height proportionally) */}
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                          Size: {selectedBubble.width}×{selectedBubble.height}
                        </label>
                        <input
                          type="range"
                          min={40}
                          max={500}
                          value={selectedBubble.width}
                          onChange={(e) => {
                            const newWidth = Number(e.target.value);
                            setBubbles((prev) =>
                              prev.map((b) => {
                                if (b.id !== selectedBubble.id) return b;
                                const ratio = b.height / b.width;
                                return { ...b, width: newWidth, height: Math.round(newWidth * ratio) };
                              }),
                            );
                          }}
                          className="w-full accent-primary"
                        />
                      </div>

                      {/* Delete bubble */}
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full gap-2"
                        onClick={deleteSelected}
                      >
                        <Trash2 className="h-4 w-4" /> Delete Bubble
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Select a bubble layer to adjust size.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ---- Text tool ---- */}
          {toolTab === "text" && (
            <div className="space-y-4 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Text Layers</h3>
                <Button size="sm" variant="outline" className="gap-1" onClick={addText} disabled={!imageSrc}>
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>

              {texts.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Click "Add" to place text on the image.
                </p>
              ) : (
                <div className="space-y-2">
                  {/* Text list — click to select */}
                  <div className="flex flex-col gap-1">
                    {texts.map((t) => {
                      const isActive = selected?.kind === "text" && selected.id === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelected({ kind: "text", id: t.id })}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                            isActive
                              ? "bg-primary/20 text-primary ring-1 ring-primary/40"
                              : "bg-secondary text-foreground hover:bg-secondary/80"
                          }`}
                        >
                          <Type className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{t.text || "Text"}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Controls — always visible, shows selected text's properties */}
                  <div className="space-y-3 border-t border-border pt-3">
                    {!selectedText && (
                      <p className="text-xs text-muted-foreground">
                        Select a text layer above to edit its properties.
                      </p>
                    )}

                    {selectedText && (
                      <>
                        {/* Text content */}
                        <div>
                          <label className="mb-1 block text-xs font-medium text-muted-foreground">Content</label>
                          <input
                            type="text"
                            value={selectedText.text}
                            onChange={(e) => updateSelectedText({ text: e.target.value })}
                            className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        {/* Font family */}
                        <div>
                          <label className="mb-1 block text-xs font-medium text-muted-foreground">Font</label>
                          <select
                            value={selectedText.fontFamily}
                            onChange={(e) => updateSelectedText({ fontFamily: e.target.value })}
                            className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                          >
                            <option value="Bangers">Bangers (default)</option>
                            <option value="Space Grotesk">Space Grotesk</option>
                            {fontAssets.map((f) => (
                              <option key={f} value={f}>
                                {f}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Font size */}
                        <div>
                          <label className="mb-1 block text-xs font-medium text-muted-foreground">
                            Size: {selectedText.fontSize}px
                          </label>
                          <input
                            type="range"
                            min={10}
                            max={120}
                            value={selectedText.fontSize}
                            onChange={(e) => updateSelectedText({ fontSize: Number(e.target.value) })}
                            className="w-full accent-primary"
                          />
                        </div>

                        {/* Text color */}
                        <div>
                          <label className="mb-1 block text-xs font-medium text-muted-foreground">Text Color</label>
                          <div className="flex flex-wrap gap-1.5">
                            {COLORS.map((c) => (
                              <button
                                key={`text-${c}`}
                                className={`h-7 w-7 rounded-md border-2 transition ${
                                  selectedText.color === c ? "border-primary scale-110" : "border-transparent"
                                }`}
                                style={{ backgroundColor: c }}
                                onClick={() => updateSelectedText({ color: c })}
                              />
                            ))}
                            <label className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-border text-xs text-muted-foreground">
                              <span>+</span>
                              <input
                                type="color"
                                className="sr-only"
                                value={selectedText.color}
                                onChange={(e) => updateSelectedText({ color: e.target.value })}
                              />
                            </label>
                          </div>
                        </div>

                        {/* Stroke color */}
                        <div>
                          <label className="mb-1 block text-xs font-medium text-muted-foreground">Stroke Color</label>
                          <div className="flex flex-wrap gap-1.5">
                            {COLORS.map((c) => (
                              <button
                                key={`stroke-${c}`}
                                className={`h-7 w-7 rounded-md border-2 transition ${
                                  selectedText.strokeColor === c ? "border-primary scale-110" : "border-transparent"
                                }`}
                                style={{ backgroundColor: c }}
                                onClick={() => updateSelectedText({ strokeColor: c })}
                              />
                            ))}
                            <label className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-border text-xs text-muted-foreground">
                              <span>+</span>
                              <input
                                type="color"
                                className="sr-only"
                                value={selectedText.strokeColor}
                                onChange={(e) => updateSelectedText({ strokeColor: e.target.value })}
                              />
                            </label>
                          </div>
                        </div>

                        {/* Stroke width */}
                        <div>
                          <label className="mb-1 block text-xs font-medium text-muted-foreground">
                            Stroke Width: {selectedText.strokeWidth}px
                          </label>
                          <input
                            type="range"
                            min={0}
                            max={8}
                            step={0.5}
                            value={selectedText.strokeWidth}
                            onChange={(e) => updateSelectedText({ strokeWidth: Number(e.target.value) })}
                            className="w-full accent-primary"
                          />
                        </div>

                        {/* Preview */}
                        <div className="rounded-lg border border-border bg-secondary/50 p-3 text-center">
                          <span
                            style={{
                              fontFamily: `'${selectedText.fontFamily}', 'Bangers', cursive`,
                              fontSize: Math.min(selectedText.fontSize, 40),
                              color: selectedText.color,
                              WebkitTextStroke: `${selectedText.strokeWidth}px ${selectedText.strokeColor}`,
                              paintOrder: "stroke fill",
                            }}
                          >
                            {selectedText.text || "Preview"}
                          </span>
                        </div>

                        {/* Delete this text */}
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full gap-2"
                          onClick={deleteSelected}
                        >
                          <Trash2 className="h-4 w-4" /> Delete Text
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="rounded-xl border border-border bg-card/50 p-4 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Tips</p>
            <p>- Drag items on the canvas to reposition</p>
            <p>- Click an item to select, then edit in panel</p>
            <p>- Use the resize handle (corner) on bubbles</p>
            <p>- Press Delete button to remove selected item</p>
          </div>
        </div>
      </motion.section>
    </div>
  );
};

export default EditTextTab;
