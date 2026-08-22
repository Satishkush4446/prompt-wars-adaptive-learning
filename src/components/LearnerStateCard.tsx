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
  const concepts = [
    { id: "parameters", name: "Parameters" },
    { id: "returnValues", name: "Return values" },
    { id: "functionCalls", name: "Function calls" },
  ] as const;

  return (
    <div className="learner-state-card" aria-label="Current Learner Knowledge State">
      <h2 className="sr-only">Knowledge State Summary</h2>
      <div className="concepts-grid">
        {concepts.map((concept) => {
          const info = state.concepts[concept.id];
          const label = getMasteryLabel(info.mastery);
          return (
            <div 
              key={concept.id} 
              className={`concept-status-item concept-${concept.id} ${state.currentConcept === concept.id ? 'active' : ''}`}
            >
              <div className="concept-meta">
                <span className="concept-name">{concept.name}</span>
                <span className={`mastery-badge mastery-${label.toLowerCase().replace(" ", "-")}`}>
                  {label} ({info.mastery}%)
                </span>
              </div>
              <div className="progress-bar-bg" aria-hidden="true">
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
