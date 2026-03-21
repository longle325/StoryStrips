import { useState } from "react";
import Navbar, { type Tab } from "@/components/Navbar";
import StoryStripTab from "@/components/StoryStripTab";
import DailyDigestTab from "@/components/DailyDigestTab";
import MyStoriesTab from "@/components/MyStoriesTab";
import ScrollBackground from "@/components/ScrollBackground";
import { AnimatePresence, motion } from "framer-motion";

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>("storystrip");
  const [artStyle, setArtStyle] = useState("Manga");

  const showBackground = activeTab === "storystrip" || activeTab === "my-stories" || activeTab === "daily-digest";

  return (
    <div className="min-h-screen">
      {showBackground && (
        <ScrollBackground artStyle={activeTab === "storystrip" ? artStyle : undefined} />
      )}
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="container pb-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "storystrip" && (
              <StoryStripTab artStyle={artStyle} onArtStyleChange={setArtStyle} />
            )}
            {activeTab === "daily-digest" && <DailyDigestTab />}
            {activeTab === "my-stories" && <MyStoriesTab />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Index;
