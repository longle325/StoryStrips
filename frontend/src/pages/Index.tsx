import { useState } from "react";
import Navbar, { type Tab } from "@/components/Navbar";
import StoryStripTab from "@/components/StoryStripTab";
import DailyDigestTab from "@/components/DailyDigestTab";
import MyStoriesTab from "@/components/MyStoriesTab";
import ScrollBackground from "@/components/ScrollBackground";

const tabStyle = (active: boolean): React.CSSProperties => ({
  display: active ? "block" : "none",
  opacity: active ? 1 : 0,
  transition: "opacity 0.2s ease",
});

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
        <div style={tabStyle(activeTab === "storystrip")}>
          <StoryStripTab artStyle={artStyle} onArtStyleChange={setArtStyle} />
        </div>
        <div style={tabStyle(activeTab === "daily-digest")}>
          <DailyDigestTab />
        </div>
        <div style={tabStyle(activeTab === "my-stories")}>
          <MyStoriesTab />
        </div>
      </main>
    </div>
  );
};

export default Index;
