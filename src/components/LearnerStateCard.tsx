import type { LearnerState } from "../state/learnerTypes";

interface LearnerStateCardProps {
  state: LearnerState;
}

export function getMasteryLabel(mastery: number): string {
  if (mastery === 0) return "Needs Practice";
  if (mastery <= 39) return "Developing";
  if (mastery <= 69) return "Improving";
  return "Strong";
}

export default function LearnerStateCard({ state }: LearnerStateCardProps) {
  if (!state.lesson) {
    return (
      <div className="learner-state-card empty" aria-label="Awaiting Topic Choice">
        <p className="state-card-empty-msg">Select a topic below to initialize your learning path.</p>
      </div>
    );
  }

  const concepts = Object.values(state.concepts);
  const activeConceptObj = state.concepts[state.currentConcept];

  return (
    <div className="learner-state-card" aria-label="Current Learner Knowledge State">
      <h2 className="sr-only">Knowledge State Summary</h2>
      
      <div className="system-observing-badge" aria-live="polite">
        <span className="pulsing-dot" /> Observational Mode: Active
      </div>

      <div className="concepts-grid">
        {concepts.map((concept) => {
          const info = state.concepts[concept.id];
          if (!info) return null;
          const label = getMasteryLabel(info.mastery);
          const ariaLabelText = `${concept.name} — ${label}.`;
          
          return (
            <div 
              key={concept.id} 
              className={`concept-status-item concept-${concept.id} ${state.currentConcept === concept.id ? 'active' : ''}`}
              aria-label={ariaLabelText}
            >
              <div className="concept-meta">
                <span className="concept-name">
                  {state.currentConcept === concept.id && <span className="active-concept-indicator">▶ </span>}
                  {concept.name}
                </span>
                <span className={`mastery-badge mastery-${label.toLowerCase().replace(" ", "-")}`}>
                  {label}
                </span>
              </div>
              <div 
                className="progress-bar-bg" 
                role="progressbar"
                aria-valuenow={info.mastery}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${concept.name} progress bar`}
              >
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${info.mastery || 5}%` }} // Ensure a tiny visual fill even for 0%
                />
              </div>
            </div>
          );
        })}
      </div>

      {state.recovery.triggered && activeConceptObj && (
        <div className="struggle-focus-indicator mt-3 text-xs bg-amber-50 text-amber-800 p-2 rounded border border-amber-200">
          ⚠️ <strong>Active Struggle Detected:</strong> Currently resolving misconceptions for <em>{activeConceptObj.name}</em>.
        </div>
      )}
    </div>
  );
}
