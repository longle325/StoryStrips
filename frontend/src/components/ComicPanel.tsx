import type { Panel } from "@/api/client";

interface ComicPanelProps {
  panel: Panel;
}

export default function ComicPanel({ panel }: ComicPanelProps) {
  return (
    <div className="overflow-hidden rounded-xl border-2 border-foreground/20 bg-black select-none">
      {/* Panel image */}
      {panel.image_url ? (
        <img
          src={panel.image_url}
          alt={`Panel ${panel.panel_number}`}
          className="block w-full aspect-square object-cover"
          draggable={false}
        />
      ) : (
        <div className="flex w-full aspect-square items-center justify-center bg-secondary text-xs text-muted-foreground">
          {panel.image_status}
        </div>
      )}

      {/* Caption */}
      {panel.caption && (
        <div className="bg-black/80 px-3 py-1.5 text-center">
          <p className="text-xs italic text-white/80">{panel.caption}</p>
        </div>
      )}
    </div>
  );
}
