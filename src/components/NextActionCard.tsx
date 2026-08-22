import type { NextAction } from "../state/learnerTypes";

interface NextActionCardProps {
  nextAction: NextAction | null;
  onReset: () => void;
  onDevelopmentMockNextAction: (action: NextAction) => void;
}

export default function NextActionCard({
  nextAction,
  onReset,
  onDevelopmentMockNextAction,
}: NextActionCardProps) {
  const handleMockNextAction = (type: "practice" | "review" | "challenge") => {
    const mockActions: Record<string, NextAction> = {
      practice: {
        concept: "returnValues",
        actionType: "practice",
        title: "Practice Return Values Workflow",
        reason: "You completed the main mission but parameters could use some reinforcement.",
        durationMinutes: 3,
      },
      review: {
        concept: "parameters",
        actionType: "review",
        title: "Review Function Parameters",
        reason: "You struggled during recovery, so reviewing the inputs is the best next step.",
        durationMinutes: 5,
      },
      challenge: {
        concept: "functionCalls",
        actionType: "challenge",
        title: "Function Calls Advanced Challenge",
        reason: "You mastered parameters and return values easily! Try nesting function calls.",
        durationMinutes: 8,
      },
    };
    onDevelopmentMockNextAction(mockActions[type]);
  };

  return (
    <div className="learning-card next-action-card">
      <div className="card-header next-action-header">
        <span className="card-badge next-action-badge">Next Step</span>
      </div>

      <h3 className="next-action-title">Your next best step</h3>

      {nextAction ? (
        <div className="next-action-content">
          <div className="action-main-box">
            <span className={`action-type-tag tag-${nextAction.actionType}`}>
              {nextAction.actionType.toUpperCase()}
            </span>
            <h4 className="action-headline">{nextAction.title}</h4>
            <p className="action-reason">{nextAction.reason}</p>
            {nextAction.durationMinutes && (
              <span className="action-duration">Estimated time: {nextAction.durationMinutes} minutes</span>
            )}
          </div>

          <div className="button-group action-buttons">
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={onReset}
            >
              Restart Learning Journey
            </button>
          </div>
        </div>
      ) : (
        <div className="next-action-pending">
          <p className="pending-text">AI Recommendation is pending connection.</p>
          <p className="dev-helper-text">
            For development testing, choose which mock Next Best Action to display:
          </p>
          <div className="button-group dev-buttons">
            <button 
              type="button" 
              className="btn btn-secondary btn-sm" 
              onClick={() => handleMockNextAction("practice")}
            >
              Mock Practice (+3 min)
            </button>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm" 
              onClick={() => handleMockNextAction("review")}
            >
              Mock Review (+5 min)
            </button>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm" 
              onClick={() => handleMockNextAction("challenge")}
            >
              Mock Challenge (+8 min)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
