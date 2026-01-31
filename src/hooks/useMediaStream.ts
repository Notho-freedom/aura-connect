import { useCallback, useEffect, useRef, useState } from "react";

interface UseMediaStreamOptions {
  video?: boolean;
  audio?: boolean;
}

export function useMediaStream(options: UseMediaStreamOptions = { video: true, audio: true }) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(options.video ?? true);
  const [audioEnabled, setAudioEnabled] = useState(options.audio ?? true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const initStream = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: options.video ?? true,
        audio: options.audio ?? true,
      });
      
      setStream(mediaStream);
      
      // Apply initial states
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = options.video ?? true;
      }
      
      const audioTrack = mediaStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = options.audio ?? true;
      }
    } catch (err) {
      console.error("Error accessing media devices:", err);
      setError("Impossible d'accéder à la caméra ou au microphone");
    } finally {
      setIsLoading(false);
    }
  }, [options.video, options.audio]);

  const toggleVideo = useCallback(() => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  }, [stream]);

  const toggleAudio = useCallback(() => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  }, [stream]);

  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    initStream();

    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return {
    stream,
    videoEnabled,
    audioEnabled,
    error,
    isLoading,
    toggleVideo,
    toggleAudio,
    stopStream,
    reinitialize: initStream,
  };
}
