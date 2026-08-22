import type { LearnerState } from "../state/learnerTypes";

interface LearnerStateCardProps {
  state: LearnerState;
}

export function getMasteryLabel(mastery: number): string {
  if (mastery === 0) return "Not assessed";
  if (mastery <= 39) return "Building";
  if (mastery <= 69) return "Developing";
  if (mastery <= 89) return "Strong";
  return "Mastered";
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

  return (
    <div className="learner-state-card" aria-label="Current Learner Knowledge State">
      <h2 className="sr-only">Knowledge State Summary</h2>
      <div className="concepts-grid">
        {concepts.map((concept) => {
          const info = state.concepts[concept.id];
          if (!info) return null;
          const label = getMasteryLabel(info.mastery);
          const ariaLabelText = `${concept.name} — ${label}, ${info.mastery} percent mastery.`;
          
          return (
            <div 
              key={concept.id} 
              className={`concept-status-item concept-${concept.id} ${state.currentConcept === concept.id ? 'active' : ''}`}
              aria-label={ariaLabelText}
            >
              <div className="concept-meta">
                <span className="concept-name">{concept.name}</span>
                <span className={`mastery-badge mastery-${label.toLowerCase().replace(" ", "-")}`}>
                  {label} ({info.mastery}%)
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
                  style={{ width: `${info.mastery}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
