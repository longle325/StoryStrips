import { motion } from "framer-motion";
import { Image as ImageIcon, Download, Trash2 } from "lucide-react";

const mockStories = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  title: `Comic Strip #${i + 1}`,
  date: `Mar ${(21 - i) > 0 ? 21 - i : 1}, 2026`,
  style: ["Manga", "Marvel", "Chibi", "Noir", "Webtoon", "Pixel"][i % 6],
  color: `hsl(${(i * 30 + 190) % 360}, 55%, ${22 + (i % 4) * 3}%)`,
}));

const MyStoriesTab = () => {
  return (
    <div className="space-y-8 pt-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground">My Stories</h1>
        <p className="mt-1 text-muted-foreground">Your generated comic collection.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
      >
        {mockStories.map((story, i) => (
          <motion.div
            key={story.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            whileHover={{ y: -6 }}
            className="group overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/40"
          >
            <div
              className="relative flex h-44 items-center justify-center"
              style={{ backgroundColor: story.color }}
            >
              <ImageIcon className="h-10 w-10 text-foreground/20" />
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/60 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                <button className="rounded-lg bg-primary p-2 text-primary-foreground transition hover:scale-110">
                  <Download className="h-4 w-4" />
                </button>
                <button className="rounded-lg bg-destructive p-2 text-destructive-foreground transition hover:scale-110">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-3">
              <p className="text-sm font-medium text-foreground">{story.title}</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{story.date}</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {story.style}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default MyStoriesTab;
