import type { RecoveryContentData } from "../lib/aiClient";
import ListenButton from "./ListenButton";

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

  let speechText = "";
  if (content.mode === "story") {
    speechText = `Title: ${content.title}. Story Analogy: ${content.story}. Connection: ${content.connection}. Key Takeaway: ${content.keyTakeaway}`;
  } else if (content.mode === "memory") {
    speechText = `Mnemonic Hook: ${content.hook}. Meaning: ${content.meaning}. Example: ${content.example}. Recall Question: ${content.recallQuestion}`;
  } else if (content.mode === "visual") {
    speechText = `Title: ${content.title}. Visual Explanation: ${content.accessibleExplanation}. Key Takeaway: ${content.keyTakeaway}`;
  }

  return (
    <div className="recovery-content-card">
      <div className="card-header recovery-header">
        <span className="card-badge recovery-badge">Tailored Explanation ({content.mode.toUpperCase()})</span>
        <ListenButton text={speechText} />
      </div>

      {content.mode === "story" && (
        <div className="story-recovery-view">
          <h3 className="recovery-content-title">{content.title}</h3>
          
          <div className="story-box-layout">
            <h4 className="story-subtitle">📖 The Analogy</h4>
            <p className="story-text">{content.story}</p>
          </div>

          <div className="story-connection-layout mt-4">
            <h4>💡 How this connects to the topic</h4>
            <p className="connection-text">{content.connection}</p>
          </div>

          <div className="takeaway-box mt-4">
            <strong>Key Takeaway:</strong> {content.keyTakeaway}
          </div>
        </div>
      )}

      {content.mode === "memory" && (
        <div className="memory-recovery-view">
          <h3 className="recovery-content-title">Memory Shortcut</h3>
          
          <div className="mnemonic-hook-card">
            <span className="hook-prefix">Mnemonic Hook:</span>
            <div className="hook-value">{content.hook}</div>
          </div>

          <div className="memory-meaning-layout mt-4">
            <h4>🔍 What it stands for</h4>
            <p className="meaning-text">{content.meaning}</p>
          </div>

          <div className="memory-example-layout mt-4">
            <h4>💻 Code / Context Example</h4>
            <pre className="code-block">
              <code>{content.example}</code>
            </pre>
          </div>

          {content.recallQuestion && (
            <div className="memory-recall-layout mt-4">
              <h4>❓ Recall Question</h4>
              <p className="recall-text">{content.recallQuestion}</p>
            </div>
          )}
        </div>
      )}

      {content.mode === "visual" && (
        <div className="visual-recovery-view">
          <h3 className="recovery-content-title">{content.title}</h3>

          <div className="visual-steps-flow" aria-hidden="true">
            {content.steps.map((step, idx) => (
              <div key={idx} className="visual-flow-step">
                <div className="flow-step-box">
                  <div className="flow-step-label">{step.label}</div>
                  <div className="flow-step-value">{step.value}</div>
                  <div className="flow-step-desc">{step.explanation}</div>
                </div>
                {idx < content.steps.length - 1 && (
                  <div className="flow-arrow-down" aria-hidden="true">↓</div>
                )}
              </div>
            ))}
          </div>

          {/* VISIBLE and SCREEN-READER equivalent text explanation for accessibility */}
          <div className="accessible-description-section mt-4">
            <h4>📝 Educational Diagram Explanation</h4>
            <p className="accessible-description-text">{content.accessibleExplanation}</p>
          </div>

          <div className="takeaway-box mt-4">
            <strong>Key Takeaway:</strong> {content.keyTakeaway}
          </div>
        </div>
      )}

      <button 
        type="button" 
        className="btn btn-primary recovery-cta mt-6" 
        onClick={onContinueToRetest}
      >
        Try Re-test Question
      </button>
    </div>
  );
}
