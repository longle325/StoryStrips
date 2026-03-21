import { useEffect, useState, useMemo } from "react";
import { AnimatePresence, motion, useScroll } from "framer-motion";

const artStyleImages: Record<string, string[]> = {
  Manga: ["/backgrounds/manga-1.jpg", "/backgrounds/manga-2.jpg"],
  Marvel: ["/backgrounds/marvel-1.jpg", "/backgrounds/marvel-2.jpg"],
  Chibi: ["/backgrounds/chibi-1.jpg"],
  Noir: ["/backgrounds/noir-1.jpg"],
  Webtoon: ["/backgrounds/webtoon-1.jpg"],
  Pixel: ["/backgrounds/pixel-1.jpg"],
  Vintage: ["/backgrounds/vintage-1.jpg"],
};

const defaultImages = [
  "/backgrounds/manga-1.jpg",
  "/backgrounds/webtoon-1.jpg",
  "/backgrounds/noir-1.jpg",
];

interface ScrollBackgroundProps {
  artStyle?: string;
}

const ScrollBackground = ({ artStyle }: ScrollBackgroundProps) => {
  const images = useMemo(
    () => (artStyle ? artStyleImages[artStyle] ?? defaultImages : defaultImages),
    [artStyle]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    setActiveIndex(0);
  }, [artStyle]);

  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (v) => {
      const segmentSize = 1 / images.length;
      const newIndex = Math.min(Math.floor(v / segmentSize), images.length - 1);
      setActiveIndex(newIndex);
    });
    return unsubscribe;
  }, [scrollYProgress, images.length]);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <AnimatePresence mode="sync">
        <motion.div
          key={`${artStyle}-${activeIndex}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <img
            src={images[activeIndex]}
            alt=""
            className="h-full w-full object-cover blur-3xl brightness-[0.25] scale-110"
          />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 bg-background/60" />
    </div>
  );
};

export default ScrollBackground;
export { artStyleImages };
