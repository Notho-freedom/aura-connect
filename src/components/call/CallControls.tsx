import { motion } from "framer-motion";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  MonitorUp,
  Grid3X3,
  Maximize2,
  MoreHorizontal,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface CallControlsProps {
  audioEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing?: boolean;
  viewMode: "grid" | "speaker";
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare?: () => void;
  onToggleViewMode: () => void;
  onEndCall: () => void;
  onOpenSettings?: () => void;
  className?: string;
  visible?: boolean;
}

export function CallControls({
  audioEnabled,
  videoEnabled,
  isScreenSharing = false,
  viewMode,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleViewMode,
  onEndCall,
  onOpenSettings,
  className,
  visible = true,
}: CallControlsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 20 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-center justify-center gap-2 sm:gap-3 md:gap-4",
        className
      )}
    >
      {/* Audio toggle */}
      <Button
        variant="ghost"
        size="lg"
        onClick={onToggleAudio}
        className={cn(
          "h-12 w-12 rounded-full backdrop-blur-lg sm:h-14 sm:w-14 md:h-16 md:w-16",
          !audioEnabled
            ? "bg-destructive text-white hover:bg-destructive/90"
            : "bg-white/10 text-white hover:bg-white/20"
        )}
      >
        {audioEnabled ? (
          <Mic className="h-5 w-5 sm:h-6 sm:w-6" />
        ) : (
          <MicOff className="h-5 w-5 sm:h-6 sm:w-6" />
        )}
      </Button>

      {/* Video toggle */}
      <Button
        variant="ghost"
        size="lg"
        onClick={onToggleVideo}
        className={cn(
          "h-12 w-12 rounded-full backdrop-blur-lg sm:h-14 sm:w-14 md:h-16 md:w-16",
          !videoEnabled
            ? "bg-destructive text-white hover:bg-destructive/90"
            : "bg-white/10 text-white hover:bg-white/20"
        )}
      >
        {videoEnabled ? (
          <Video className="h-5 w-5 sm:h-6 sm:w-6" />
        ) : (
          <VideoOff className="h-5 w-5 sm:h-6 sm:w-6" />
        )}
      </Button>

      {/* Screen share - hidden on mobile */}
      {onToggleScreenShare && (
        <Button
          variant="ghost"
          size="lg"
          onClick={onToggleScreenShare}
          className={cn(
            "hidden h-12 w-12 rounded-full backdrop-blur-lg sm:flex sm:h-14 sm:w-14 md:h-16 md:w-16",
            isScreenSharing
              ? "bg-accent text-white hover:bg-accent/90"
              : "bg-white/10 text-white hover:bg-white/20"
          )}
        >
          <MonitorUp className="h-5 w-5 sm:h-6 sm:w-6" />
        </Button>
      )}

      {/* End call */}
      <Button
        variant="ghost"
        size="lg"
        onClick={onEndCall}
        className="h-12 w-12 rounded-full bg-destructive text-white hover:bg-destructive/90 sm:h-14 sm:w-14 md:h-16 md:w-16"
      >
        <PhoneOff className="h-5 w-5 sm:h-6 sm:w-6" />
      </Button>

      {/* View mode toggle - hidden on mobile */}
      <Button
        variant="ghost"
        size="lg"
        onClick={onToggleViewMode}
        className="hidden h-12 w-12 rounded-full bg-white/10 text-white backdrop-blur-lg hover:bg-white/20 sm:flex sm:h-14 sm:w-14 md:h-16 md:w-16"
      >
        {viewMode === "grid" ? (
          <Maximize2 className="h-5 w-5 sm:h-6 sm:w-6" />
        ) : (
          <Grid3X3 className="h-5 w-5 sm:h-6 sm:w-6" />
        )}
      </Button>

      {/* More options */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="lg"
            className="h-12 w-12 rounded-full bg-white/10 text-white backdrop-blur-lg hover:bg-white/20 sm:h-14 sm:w-14 md:h-16 md:w-16"
          >
            <MoreHorizontal className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 bg-black/90 text-white backdrop-blur-lg border-white/10"
        >
          <DropdownMenuItem
            onClick={onToggleViewMode}
            className="sm:hidden focus:bg-white/10"
          >
            {viewMode === "grid" ? (
              <>
                <Maximize2 className="mr-2 h-4 w-4" />
                Mode Speaker
              </>
            ) : (
              <>
                <Grid3X3 className="mr-2 h-4 w-4" />
                Mode Grille
              </>
            )}
          </DropdownMenuItem>
          {onToggleScreenShare && (
            <DropdownMenuItem
              onClick={onToggleScreenShare}
              className="sm:hidden focus:bg-white/10"
            >
              <MonitorUp className="mr-2 h-4 w-4" />
              {isScreenSharing ? "Arrêter le partage" : "Partager l'écran"}
            </DropdownMenuItem>
          )}
          {onOpenSettings && (
            <DropdownMenuItem
              onClick={onOpenSettings}
              className="focus:bg-white/10"
            >
              <Settings className="mr-2 h-4 w-4" />
              Paramètres
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}
