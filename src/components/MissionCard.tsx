import { useState } from "react";
import type { MissionState } from "../state/learnerTypes";

interface MissionCardProps {
  missionState: MissionState;
  onSaveSubmission: (code: string) => void;
  onUseHint: () => void;
  onSubmitMission: () => void;
  onDevelopmentMockEvaluation: (passed: boolean) => void;
}

export default function MissionCard({
  missionState,
  onSaveSubmission,
  onUseHint,
  onSubmitMission,
  onDevelopmentMockEvaluation,
}: MissionCardProps) {
  const starterCode = `def total(price, quantity):
    amount = price * quantity
    # Edit below to return the correct calculation
    `;
  
  const [code, setCode] = useState<string>(missionState.submission || starterCode);
  const [showHint, setShowHint] = useState<boolean>(missionState.hintUsed);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCode(val);
    onSaveSubmission(val);
  };

  const handleHintClick = () => {
    setShowHint(true);
    onUseHint();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitMission();
  };

  return (
    <div className="learning-card mission-card">
      <div className="card-header mission-header">
        <span className="card-badge mission-badge">Learn-by-Doing Mission</span>
      </div>

      <h3 className="mission-title">Mission: Complete the calculation</h3>
      
      <div className="mission-instructions">
        <p>
          We've set up a function `total` that receives a `price` and a `quantity`. 
          Currently, it calculates the `amount` but doesn't return it to whoever called the function.
        </p>
        <p className="mission-objective">
          <strong>Objective:</strong> Edit the code so that calling <code>total(5, 3)</code> produces the value <code>15</code>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mission-form">
        <div className="textarea-container">
          <label htmlFor="mission-code-input" className="code-input-label">
            Write your Python solution below:
          </label>
          <textarea
            id="mission-code-input"
            className="mission-textarea code-block"
            value={code}
            onChange={handleTextareaChange}
            maxLength={1000}
            rows={8}
            spellCheck={false}
          />
          <div className="char-count">{code.length}/1000 characters</div>
        </div>

        {showHint ? (
          <div className="hint-box" role="status" aria-live="polite">
            <p className="hint-text">
              <strong>Hint:</strong> Use the <code>return</code> keyword to return the variable <code>amount</code> or <code>price * quantity</code> from the function.
            </p>
          </div>
        ) : (
          <button 
            type="button" 
            className="btn btn-secondary btn-hint" 
            onClick={handleHintClick}
          >
            Use a Hint (-3 Mastery penalty)
          </button>
        )}

        <div className="button-group mission-buttons">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={missionState.evaluationStatus === "loading"}
          >
            {missionState.evaluationStatus === "loading" ? "Evaluating..." : "Submit Mission Solution"}
          </button>
        </div>
      </form>

      {/* Show evaluation status/error */}
      {missionState.evaluationStatus === "loading" && (
        <div className="evaluation-status-alert status-loading" role="status" aria-live="polite">
          <p>AI Evaluator is inspecting your code submission...</p>
        </div>
      )}

      {missionState.evaluationStatus === "idle" && missionState.attempted && (
        <div className="evaluation-status-alert status-pending">
          <p><strong>Note:</strong> Real AI Evaluation is pending server integration.</p>
          <p className="dev-helper-text">
            For development testing, choose whether this mock solution passes or fails:
          </p>
          <div className="button-group dev-buttons">
            <button 
              type="button" 
              className="btn btn-success btn-sm" 
              onClick={() => onDevelopmentMockEvaluation(true)}
            >
              Mock PASS (+20 Mastery)
            </button>
            <button 
              type="button" 
              className="btn btn-danger btn-sm" 
              onClick={() => onDevelopmentMockEvaluation(false)}
            >
              Mock FAIL (-10 Mastery)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
