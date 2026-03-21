import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, ChevronLeft, ChevronRight, ExternalLink, Image as ImageIcon } from "lucide-react";

const mockArticles = Array.from({ length: 5 }, (_, i) => ({
  id: i,
  title: [
    "Breaking: AI Art Revolution Sweeps Global Markets",
    "New Discovery in Deep Ocean Exploration",
    "Historic Space Mission Launches Successfully",
    "Climate Summit Reaches Landmark Agreement",
    "Tech Giants Unveil Next-Gen Computing Platform",
  ][i],
  url: "https://example.com/article/" + (i + 1),
  color: `hsl(${190 + i * 25}, 60%, ${20 + i * 5}%)`,
}));

const DailyDigestTab = () => {
  const [activeIndex, setActiveIndex] = useState(2);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const goLeft = () => setActiveIndex((p) => (p - 1 + mockArticles.length) % mockArticles.length);
  const goRight = () => setActiveIndex((p) => (p + 1) % mockArticles.length);

  return (
    <div className="space-y-10 pt-8">
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

      {/* 3D Carousel */}
      <div className="relative flex flex-col items-center py-8">
        <div className="relative flex h-[420px] w-full items-center justify-center">
          <AnimatePresence mode="popLayout">
            {mockArticles.map((article, i) => {
              const offset = ((i - activeIndex + mockArticles.length) % mockArticles.length);
              const normalizedOffset = offset > Math.floor(mockArticles.length / 2) ? offset - mockArticles.length : offset;
              const isCenter = normalizedOffset === 0;
              const absOffset = Math.abs(normalizedOffset);

              if (absOffset > 2) return null;

              return (
                <motion.div
                  key={article.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    x: normalizedOffset * 200,
                    scale: isCenter ? 1 : 0.7 - absOffset * 0.05,
                    zIndex: 10 - absOffset,
                    opacity: isCenter ? 1 : 0.5,
                    rotateY: normalizedOffset * -8,
                  }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="absolute cursor-pointer"
                  style={{ perspective: "1200px" }}
                  onClick={() => setActiveIndex(i)}
                >
                  <div
                    className={`flex h-80 w-56 items-center justify-center rounded-2xl border shadow-2xl transition-shadow ${isCenter ? "border-primary/50 glow-primary" : "border-border"}`}
                    style={{ backgroundColor: article.color }}
                  >
                    <ImageIcon className={`h-12 w-12 ${isCenter ? "text-foreground/40" : "text-foreground/20"}`} />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Navigation arrows */}
        <div className="flex items-center gap-6 mt-2">
          <button onClick={goLeft} className="rounded-full border border-border bg-secondary p-3 text-muted-foreground transition hover:bg-primary hover:text-primary-foreground">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex gap-2">
            {mockArticles.map((_, i) => (
              <div key={i} className={`h-2 w-2 rounded-full transition-colors ${i === activeIndex ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
          <button onClick={goRight} className="rounded-full border border-border bg-secondary p-3 text-muted-foreground transition hover:bg-primary hover:text-primary-foreground">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Active article info */}
        <motion.div
          key={activeIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 text-center"
        >
          <h3 className="text-lg font-semibold text-foreground">{mockArticles[activeIndex].title}</h3>
          <a
            href={mockArticles[activeIndex].url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Read original <ExternalLink className="h-3 w-3" />
          </a>
        </motion.div>
      </div>
    </div>
  );
};

export default DailyDigestTab;
