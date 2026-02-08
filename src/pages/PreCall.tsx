import { motion } from "framer-motion";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Settings,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { useCalls } from "@/hooks/useCalls";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function PreCall() {
  const navigate = useNavigate();
  const { meetingId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { calls, createCall, acceptCall, findCallByCode } = useCalls();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [callInfo, setCallInfo] = useState<{
    exists: boolean;
    isInitiator: boolean;
    participantIds: string[];
    actualCallId: string | null;
  } | null>(null);

  // Get target user ID from query params (when initiating a call to someone)
  const targetUserId = searchParams.get("userId");

  // Check if this call exists and get info
  useEffect(() => {
    const checkCall = async () => {
      if (!meetingId || !user) return;

      // Use findCallByCode to handle both full UUIDs and short codes
      const { data: existingCall, error } = await findCallByCode(meetingId);

      if (existingCall && !error) {
        const isInitiator = existingCall.initiated_by === user.id;
        const participantIds = existingCall.call_participants
          ?.filter((p: { user_id: string }) => p.user_id !== user.id)
          .map((p: { user_id: string }) => p.user_id) || [];

        setCallInfo({
          exists: true,
          isInitiator,
          participantIds,
          actualCallId: existingCall.id,
        });
      } else {
        // This is a new call - meetingId should be a full UUID
        setCallInfo({
          exists: false,
          isInitiator: true,
          participantIds: targetUserId ? [targetUserId] : [],
          actualCallId: null,
        });
      }
    };

    checkCall();
  }, [meetingId, user, targetUserId, findCallByCode]);

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

  const joinCall = async () => {
    if (!user || !callInfo) return;

    setIsJoining(true);

    try {
      // Stop the preview stream before navigating
      stream?.getTracks().forEach((track) => track.stop());

      // Use the actual call ID from database if it exists
      const actualCallId = callInfo.actualCallId || meetingId;

      if (callInfo.exists && actualCallId) {
        // Join existing call - add user as participant if not already
        const { data: existingParticipant } = await supabase
          .from("call_participants")
          .select("*")
          .eq("call_id", actualCallId)
          .eq("user_id", user.id)
          .single();

        if (!existingParticipant) {
          // Add user as participant
          await supabase
            .from("call_participants")
            .insert({
              call_id: actualCallId,
              user_id: user.id,
              joined_at: new Date().toISOString(),
            });
        } else {
          // Update joined_at timestamp
          await supabase
            .from("call_participants")
            .update({ joined_at: new Date().toISOString() })
            .eq("call_id", actualCallId)
            .eq("user_id", user.id);
        }

        // Update call status to active if needed
        await supabase
          .from("calls")
          .update({ status: "active", started_at: new Date().toISOString() })
          .eq("id", actualCallId)
          .eq("status", "pending");

        // Navigate to the call with the actual UUID
        navigate(`/call/${actualCallId}`, {
          state: {
            videoEnabled,
            audioEnabled,
            isInitiator: callInfo.isInitiator,
          },
        });
      } else if (callInfo.participantIds.length > 0) {
        // Create a new call with the target user
        const result = await createCall(callInfo.participantIds, "video");
        if (result.error) {
          console.error("Error creating call:", result.error);
          setIsJoining(false);
          return;
        }
        // Navigate to the new call
        if (result.data) {
          navigate(`/call/${result.data.id}`, {
            state: {
              videoEnabled,
              audioEnabled,
              isInitiator: true,
            },
          });
          return;
        }
      } else {
        // Creating a new call without a specific target
        const result = await createCall([], "video");
        if (result.error) {
          console.error("Error creating call:", result.error);
          setIsJoining(false);
          return;
        }
        if (result.data) {
          navigate(`/call/${result.data.id}`, {
            state: {
              videoEnabled,
              audioEnabled,
              isInitiator: true,
            },
          });
        }
      }
    } catch (error) {
      console.error("Error joining call:", error);
      setIsJoining(false);
    }
  };

  const handleBack = () => {
    stream?.getTracks().forEach((track) => track.stop());
    navigate("/");
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
              onClick={handleBack}
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
              disabled={isJoining}
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
              disabled={isJoining}
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
              disabled={isJoining || !callInfo}
              className="w-full max-w-xs rounded-xl bg-accent py-6 text-lg font-medium text-accent-foreground hover:bg-accent/90"
            >
              {isJoining ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Connexion...
                </>
              ) : callInfo?.exists ? (
                "Rejoindre l'appel"
              ) : (
                "Démarrer l'appel"
              )}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Code de réunion : <span className="font-mono font-medium">{(callInfo?.actualCallId || meetingId)?.slice(0, 8)}</span>
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
