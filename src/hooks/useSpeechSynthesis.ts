import { useState, useEffect, useCallback, useRef } from "react";

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      setIsSupported(true);
    }
  }, []);

  const stop = useCallback(() => {
    if (!isSupported) return;
    try {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } catch (e) {
      console.error("Failed to cancel speech synthesis:", e);
    }
  }, [isSupported]);

  const speak = useCallback((text: string) => {
    if (!isSupported) return;
    
    // Stop any active speech first
    stop();

    try {
      // Create new utterance
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (e) => {
        // Only reset state if it wasn't cancelled intentionally
        if (e.error !== "interrupted") {
          setIsSpeaking(false);
        }
      };

      // Set rate to a moderate speed for better cognitive accessibility
      utterance.rate = 0.95;

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Speech synthesis failed:", e);
      setIsSpeaking(false);
    }
  }, [isSupported, stop]);

  // Cancel speech on unmount
  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  return {
    isSupported,
    isSpeaking,
    speak,
    stop
  };
}
