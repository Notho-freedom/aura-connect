import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";

export default function PreCall() {
  const navigate = useNavigate();
  const { meetingId } = useParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    const initMedia = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (error) {
        console.error("Error accessing media devices:", error);
        setPermissionError(
          "Impossible d'accéder à la caméra ou au microphone. Veuillez vérifier vos permissions."
        );
      }
    };

    initMedia();

    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const joinCall = () => {
    // Stop the preview stream before navigating
    stream?.getTracks().forEach((track) => track.stop());
    navigate(`/call/${meetingId}`, { state: { videoEnabled, audioEnabled } });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background safe-area-inset">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => {
                stream?.getTracks().forEach((track) => track.stop());
                navigate("/");
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Prêt à rejoindre ?</h1>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="container flex flex-1 flex-col items-center justify-center py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-2xl"
        >
          {/* Video preview */}
          <div className="glass-card mb-6 overflow-hidden p-2">
            <div className="video-container relative">
              {permissionError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted text-center">
                  <VideoOff className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="px-4 text-sm text-muted-foreground">
                    {permissionError}
                  </p>
                </div>
              ) : !videoEnabled ? (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <VideoOff className="h-12 w-12 text-muted-foreground" />
                </div>
              ) : null}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover ${
                  !videoEnabled || permissionError ? "hidden" : ""
                }`}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="mb-8 flex justify-center gap-4">
            <Button
              variant="ghost"
              size="lg"
              onClick={toggleAudio}
              className={`h-14 w-14 rounded-full ${
                !audioEnabled ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "glass-card"
              }`}
            >
              {audioEnabled ? (
                <Mic className="h-6 w-6" />
              ) : (
                <MicOff className="h-6 w-6" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="lg"
              onClick={toggleVideo}
              className={`h-14 w-14 rounded-full ${
                !videoEnabled ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "glass-card"
              }`}
            >
              {videoEnabled ? (
                <Video className="h-6 w-6" />
              ) : (
                <VideoOff className="h-6 w-6" />
              )}
            </Button>
          </div>

          {/* Join button */}
          <div className="flex flex-col items-center gap-4">
            <Button
              onClick={joinCall}
              size="lg"
              className="w-full max-w-xs rounded-xl bg-accent py-6 text-lg font-medium text-accent-foreground hover:bg-accent/90"
            >
              Rejoindre l'appel
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Code de réunion : <span className="font-mono font-medium">{meetingId}</span>
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
