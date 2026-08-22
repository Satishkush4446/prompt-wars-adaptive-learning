import { useState, useEffect, useCallback, useRef } from "react";

export function resolveSpeechLocale(langName: string): string | null {
  const clean = langName.trim().toLowerCase();
  const localeMap: Record<string, string> = {
    english: "en-US",
    spanish: "es-ES",
    español: "es-ES",
    hindi: "hi-IN",
    हिन्दी: "hi-IN",
    tamil: "ta-IN",
    தமிழ்: "ta-IN",
    french: "fr-FR",
    français: "fr-FR",
    german: "de-DE",
    deutsch: "de-DE",
    japanese: "ja-JP",
    日本語: "ja-JP",
    italian: "it-IT",
    italiano: "it-IT",
    portuguese: "pt-PT",
    português: "pt-PT",
    korean: "ko-KR",
    한국어: "ko-KR",
    chinese: "zh-CN",
    mandarin: "zh-CN",
    中文: "zh-CN",
    arabic: "ar-SA",
    العربية: "ar-SA",
    russian: "ru-RU",
    русский: "ru-RU",
    vietnamese: "vi-VN",
    "tiếng việt": "vi-VN",
    swahili: "sw-KE",
    indonesian: "id-ID",
    "bahasa indonesia": "id-ID",
    marathi: "mr-IN",
    मराठी: "mr-IN",
    bengali: "bn-IN",
    "বাংলা": "bn-IN",
    telugu: "te-IN",
    తెలుగు: "te-IN",
    gujarati: "gu-IN",
    ગુજરાતી: "gu-IN",
    punjabi: "pa-IN",
    ਪੰਜਾਬੀ: "pa-IN",
    urdu: "ur-IN",
    اردו: "ur-IN"
  };

  if (localeMap[clean]) {
    return localeMap[clean];
  }

  // Fallback matching
  for (const [key, val] of Object.entries(localeMap)) {
    if (clean.includes(key) || key.includes(clean)) {
      return val;
    }
  }

  return null;
}

export function useSpeechSynthesis(langName: string = "English") {
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      setIsSupported(true);
    }
  }, []);

  const resolvedLocale = resolveSpeechLocale(langName);
  const isSpeechLanguageSupported = !!resolvedLocale;

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
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      if (resolvedLocale) {
        utterance.lang = resolvedLocale;

        // Select voice matching language if available
        const voices = window.speechSynthesis.getVoices();
        const matchingVoice = voices.find(v => 
          v.lang.toLowerCase().replace("_", "-") === resolvedLocale.toLowerCase() ||
          v.lang.toLowerCase().startsWith(resolvedLocale.toLowerCase().split("-")[0])
        );
        if (matchingVoice) {
          utterance.voice = matchingVoice;
        }
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (e) => {
        if (e.error !== "interrupted") {
          setIsSpeaking(false);
        }
      };

      utterance.rate = 0.95;

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Speech synthesis failed:", e);
      setIsSpeaking(false);
    }
  }, [isSupported, stop, resolvedLocale]);

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
    isSpeechLanguageSupported,
    isSpeaking,
    speak,
    stop
  };
}
