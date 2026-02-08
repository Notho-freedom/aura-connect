import { useEffect, useState } from "react";
import { Wifi, WifiOff, Signal, SignalLow, SignalMedium, SignalHigh } from "lucide-react";
import { cn } from "@/lib/utils";

interface NetworkStats {
  rtt: number; // Round-trip time in ms
  jitter: number;
  packetsLost: number;
  packetsReceived: number;
  bitrate: number;
}

interface CallQualityIndicatorProps {
  peerConnection: RTCPeerConnection | null;
  className?: string;
  showDetails?: boolean;
}

type QualityLevel = "excellent" | "good" | "fair" | "poor" | "disconnected";

export function CallQualityIndicator({
  peerConnection,
  className,
  showDetails = false,
}: CallQualityIndicatorProps) {
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [quality, setQuality] = useState<QualityLevel>("good");

  useEffect(() => {
    if (!peerConnection) {
      setQuality("disconnected");
      return;
    }

    const getStats = async () => {
      try {
        const report = await peerConnection.getStats();
        let rtt = 0;
        let jitter = 0;
        let packetsLost = 0;
        let packetsReceived = 0;
        let bytesReceived = 0;

        report.forEach((stat) => {
          if (stat.type === "candidate-pair" && stat.state === "succeeded") {
            rtt = stat.currentRoundTripTime ? stat.currentRoundTripTime * 1000 : 0;
          }
          if (stat.type === "inbound-rtp" && stat.kind === "video") {
            jitter = stat.jitter || 0;
            packetsLost = stat.packetsLost || 0;
            packetsReceived = stat.packetsReceived || 0;
            bytesReceived = stat.bytesReceived || 0;
          }
        });

        const newStats: NetworkStats = {
          rtt,
          jitter,
          packetsLost,
          packetsReceived,
          bitrate: bytesReceived * 8 / 1000, // kbps approximation
        };

        setStats(newStats);

        // Calculate quality based on metrics
        const lossRate = packetsReceived > 0 
          ? (packetsLost / (packetsLost + packetsReceived)) * 100 
          : 0;

        if (rtt < 50 && lossRate < 1) {
          setQuality("excellent");
        } else if (rtt < 150 && lossRate < 3) {
          setQuality("good");
        } else if (rtt < 300 && lossRate < 8) {
          setQuality("fair");
        } else {
          setQuality("poor");
        }
      } catch (error) {
        console.error("Error getting WebRTC stats:", error);
      }
    };

    // Poll stats every 2 seconds
    const interval = setInterval(getStats, 2000);
    getStats(); // Initial call

    return () => clearInterval(interval);
  }, [peerConnection]);

  const getQualityIcon = () => {
    switch (quality) {
      case "excellent":
        return <SignalHigh className="h-4 w-4" />;
      case "good":
        return <SignalMedium className="h-4 w-4" />;
      case "fair":
        return <SignalLow className="h-4 w-4" />;
      case "poor":
        return <Signal className="h-4 w-4" />;
      case "disconnected":
        return <WifiOff className="h-4 w-4" />;
    }
  };

  const getQualityColor = () => {
    switch (quality) {
      case "excellent":
        return "text-green-400";
      case "good":
        return "text-green-300";
      case "fair":
        return "text-yellow-400";
      case "poor":
        return "text-red-400";
      case "disconnected":
        return "text-muted-foreground";
    }
  };

  const getQualityLabel = () => {
    switch (quality) {
      case "excellent":
        return "Excellente";
      case "good":
        return "Bonne";
      case "fair":
        return "Moyenne";
      case "poor":
        return "Faible";
      case "disconnected":
        return "Déconnecté";
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("flex items-center gap-1", getQualityColor())}>
        {getQualityIcon()}
        {showDetails && (
          <span className="text-xs font-medium">{getQualityLabel()}</span>
        )}
      </div>
      
      {showDetails && stats && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{Math.round(stats.rtt)}ms</span>
          {stats.bitrate > 0 && (
            <span>{Math.round(stats.bitrate / 1000)}Mbps</span>
          )}
        </div>
      )}
    </div>
  );
}
