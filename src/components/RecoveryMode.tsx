import type { RecoveryMode as RecoveryModeType } from "../state/learnerTypes";

interface RecoveryModeProps {
  recommendedMode: RecoveryModeType | null;
  selectedMode: RecoveryModeType | null;
  isLoading: boolean;
  onSelectMode: (mode: RecoveryModeType) => void;
  misconception: string | null;
}

export default function RecoveryMode({
  recommendedMode,
  selectedMode,
  isLoading,
  onSelectMode,
  misconception,
}: RecoveryModeProps) {
  const modes = [
    {
      id: "story",
      name: "Story Mode",
      description: "Understand it through a creative real-world analogy or story.",
    },
    {
      id: "visual",
      name: "Visual Mode",
      description: "See the concept explained via step-by-step flowchart transitions.",
    },
    {
      id: "memory",
      name: "Memory Mode",
      description: "Remember it with a structured mnemonic acronym shortcut.",
    },
  ] as const;

  return (
    <div className="recovery-selection-section adaptive-struggle-detected">
      <div className="card-header recovery-header">
        <span className="card-badge recovery-badge">⚡ ADAPTIVE INTELLIGENCE TRIGGERED</span>
      </div>

      <h3 className="recovery-title font-extrabold text-2xl text-accent-violet">Let's try a different approach.</h3>
      <p className="recovery-desc mt-2 text-secondary">
        I noticed you're still working through this concept. AdaptiQ can explain it another way.
      </p>

      {misconception && (
        <div className="misconception-card-highlighted mt-6 p-4 border-l-4 border-accent-violet bg-slate-50 rounded-r-lg">
          <span className="text-xs uppercase font-mono font-bold tracking-widest text-accent-violet">What I noticed</span>
          <p className="misconception-text mt-2 font-medium text-slate-800">{misconception}</p>
        </div>
      )}

      <div className="divider-subtle my-6" />

      <h4 className="section-label-premium">Try another approach:</h4>

      <div className="recovery-modes-list mt-4 flex flex-col gap-3">
        {modes.map((mode) => {
          const isRecommended = recommendedMode === mode.id;
          const isSelected = selectedMode === mode.id;
          
          return (
            <button
              key={mode.id}
              type="button"
              className={`recovery-mode-btn text-left justify-between ${isSelected ? "selected" : ""} ${isRecommended ? "recommended" : ""}`}
              onClick={() => onSelectMode(mode.id)}
              disabled={isLoading}
              aria-describedby={`desc-${mode.id}`}
            >
              <span className="flex flex-col">
                <span className="mode-btn-title font-bold text-base">
                  {mode.name} 
                  {isRecommended && <span className="recommended-tag ml-2 text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded font-medium">Recommended for you</span>}
                  {isSelected && <span className="selected-tag ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">Selected</span>}
                </span>
                <span id={`desc-${mode.id}`} className="mode-btn-desc text-secondary text-sm mt-1">
                  {mode.description}
                </span>
              </span>
              <span className="arrow-indicator font-bold text-lg">→</span>
            </button>
          );
        })}
      </div>

      {isLoading && (
        <div className="recovery-loading-overlay mt-6" role="status" aria-live="polite">
          <p className="loading-text">Generating tailored recovery explanation...</p>
        </div>
      )}
    </div>
  );
}
