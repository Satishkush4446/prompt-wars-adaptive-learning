import React from "react";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";

interface ListenButtonProps {
  text: string;
}

export const ListenButton: React.FC<ListenButtonProps> = ({ text }) => {
  const { isSupported, isSpeaking, speak, stop } = useSpeechSynthesis();

  if (!isSupported) {
    return null;
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
