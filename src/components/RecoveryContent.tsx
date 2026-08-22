import type { RecoveryMode } from "../state/learnerTypes";

export interface VisualStep {
  step: number;
  label: string;
  accessibleExplanation: string;
}

export interface RecoveryContentData {
  title: string;
  mode: RecoveryMode;
  shortExplanation: string;
  content: {
    text?: string;
    visualSteps?: VisualStep[];
  };
  keyTakeaway: string;
}

interface RecoveryContentProps {
  content: RecoveryContentData | null;
  onContinueToRetest: () => void;
}

export default function RecoveryContent({ content, onContinueToRetest }: RecoveryContentProps) {
  if (!content) {
    return (
      <div className="recovery-content-placeholder">
        <p>No recovery content generated yet.</p>
      </div>
    );
  }

  return (
    <div className="recovery-content-card">
      <div className="card-header recovery-header">
        <span className="card-badge recovery-badge">Tailored Explanation ({content.mode})</span>
      </div>

      <h3 className="recovery-content-title">{content.title}</h3>
      <p className="recovery-content-intro">{content.shortExplanation}</p>

      <div className="recovery-content-body">
        {content.mode === "visual" && content.content.visualSteps ? (
          <div className="visual-steps-container">
            <h4 className="sr-only">Step-by-step visual representation</h4>
            <div className="visual-flow-chart" aria-hidden="true">
              {content.content.visualSteps.map((step, idx) => (
                <div key={step.step} className="flow-step-wrapper">
                  <div className="flow-step-box">
                    <span className="step-num">{step.step}</span>
                    <span className="step-label">{step.label}</span>
                  </div>
                  {idx < (content.content.visualSteps || []).length - 1 && (
                    <div className="flow-arrow">↓</div>
                  )}
                </div>
              ))}
            </div>

            {/* Screen Reader Equivalent for the visual steps */}
            <div className="sr-only">
              <h5>Detailed Explanation of the visual diagram:</h5>
              <ol>
                {content.content.visualSteps.map((step) => (
                  <li key={step.step}>
                    <strong>{step.label}:</strong> {step.accessibleExplanation}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ) : (
          <div className="text-explanation">
            <p className="explanation-paragraph">{content.content.text}</p>
          </div>
        )}
      </div>

      <div className="takeaway-box">
        <strong>Key Takeaway:</strong> {content.keyTakeaway}
      </div>

      <button 
        type="button" 
        className="btn btn-primary recovery-cta" 
        onClick={onContinueToRetest}
      >
        Try Re-test Question
      </button>
    </div>
  );
}
