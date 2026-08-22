import React from "react";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";

interface ListenButtonProps {
  text: string;
  lang?: string; // Language name (e.g. "English", "Spanish")
}

export const ListenButton: React.FC<ListenButtonProps> = ({ text, lang = "English" }) => {
  const { isSupported, isSpeechLanguageSupported, isSpeaking, speak, stop } = useSpeechSynthesis(lang);

  if (!isSupported) {
    return null;
  }

  if (!isSpeechLanguageSupported) {
    return (
      <button
        type="button"
        className="btn btn-secondary btn-sm listen-btn disabled opacity-60 cursor-not-allowed"
        disabled
        aria-label={`Listen is not available for ${lang}`}
        title={`Listen is not available for ${lang}`}
      >
        🚫 Narration Unavailable
      </button>
    );
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpeaking) {
      stop();
    } else {
      speak(text);
    }
  };

  return (
    <button
      type="button"
      className={`btn btn-secondary btn-sm listen-btn ${isSpeaking ? "speaking" : ""}`}
      onClick={handleToggle}
      aria-label={isSpeaking ? "Stop reading" : "Read aloud"}
      title={isSpeaking ? "Stop reading" : "Read aloud"}
    >
      {isSpeaking ? "⏹ Stop" : "🔊 Listen"}
    </button>
  );
};

export default ListenButton;
