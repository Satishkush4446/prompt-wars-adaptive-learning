import type { RecoveryMode as RecoveryModeType } from "../state/learnerTypes";

interface RecoveryModeProps {
  recommendedMode: RecoveryModeType | null;
  selectedMode: RecoveryModeType | null;
  isLoading: boolean;
  onSelectMode: (mode: RecoveryModeType) => void;
}

export default function RecoveryMode({
  recommendedMode,
  selectedMode,
  isLoading,
  onSelectMode,
}: RecoveryModeProps) {
  const modes = [
    {
      id: "story",
      name: "Story",
      description: "Understand it through a real-world example.",
    },
    {
      id: "visual",
      name: "Visual",
      description: "See the idea step by step.",
    },
    {
      id: "memory",
      name: "Memory",
      description: "Remember it with a simple mental shortcut.",
    },
  ] as const;

  return (
    <div className="recovery-selection-section">
      <div className="card-header recovery-header">
        <span className="card-badge recovery-badge">Recovery Strategy</span>
      </div>

      <h3 className="recovery-title">Let's try a different way.</h3>
      <p className="recovery-desc">
        Choose the explanation style that works best for you. We will generate it tailored to your misunderstanding.
      </p>

      <div className="recovery-modes-list">
        {modes.map((mode) => {
          const isRecommended = recommendedMode === mode.id;
          const isSelected = selectedMode === mode.id;
          
          return (
            <button
              key={mode.id}
              type="button"
              className={`recovery-mode-btn ${isSelected ? "selected" : ""} ${isRecommended ? "recommended" : ""}`}
              onClick={() => onSelectMode(mode.id)}
              disabled={isLoading}
              aria-describedby={`desc-${mode.id}`}
            >
              <span className="mode-btn-title">
                {mode.name} 
                {isRecommended && <span className="recommended-tag"> (Recommended for you)</span>}
                {isSelected && <span className="selected-tag"> (Selected)</span>}
              </span>
              <span id={`desc-${mode.id}`} className="mode-btn-desc">
                {mode.description}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading && (
        <div className="recovery-loading-overlay" role="status" aria-live="polite">
          <p className="loading-text">Generating tailored recovery explanation...</p>
        </div>
      )}
    </div>
  );
}
