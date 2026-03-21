import { Sparkles, Newspaper, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

type Tab = "storystrip" | "daily-digest" | "my-stories";

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "storystrip", label: "StoryStrip", icon: Sparkles },
  { id: "daily-digest", label: "Daily Digest", icon: Newspaper },
  { id: "my-stories", label: "My Stories", icon: BookOpen },
];

interface NavbarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const Navbar = ({ activeTab, onTabChange }: NavbarProps) => {
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold text-gradient">StoryStrip AI</span>
        </div>

        <div className="flex items-center gap-1 rounded-full border border-border bg-secondary p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-full bg-primary glow-primary"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <span className={`relative z-10 flex items-center gap-2 ${isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="w-24" />
      </div>
    </nav>
  );
};

export default Navbar;
export type { Tab };
