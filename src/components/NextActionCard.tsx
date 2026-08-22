import type { NextAction } from "../state/learnerTypes";
import ListenButton from "./ListenButton";

interface NextActionCardProps {
  nextAction: NextAction | null;
  onReset: () => void;
  onDevelopmentMockNextAction: (action: NextAction) => void;
  lang?: string;
}

export default function NextActionCard({
  nextAction,
  onReset,
  onDevelopmentMockNextAction,
  lang = "English",
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

  const speechText = nextAction 
    ? `Recommendation: ${nextAction.title}. Reason: ${nextAction.reason}. Estimated duration is ${nextAction.durationMinutes} minutes.`
    : "";

  return (
    <div className="learning-card next-action-card">
      <div className="card-header next-action-header">
        <span className="card-badge next-action-badge">NEXT BEST ACTION</span>
        {nextAction && <ListenButton text={speechText} lang={lang} />}
      </div>

      <h3 className="next-action-title">Your next best step</h3>
      <p className="text-secondary text-sm mt-1 font-medium">Based on how you learned today...</p>

      {nextAction ? (
        <div className="next-action-content">
          <div className="action-main-box mt-4">
            <span className={`action-type-tag tag-${nextAction.actionType}`}>
              {nextAction.actionType.toUpperCase()}
            </span>
            <h4 className="action-headline mt-2">{nextAction.title}</h4>
            <p className="action-reason mt-2">{nextAction.reason}</p>
            {nextAction.durationMinutes && (
              <span className="action-duration mt-2 block">Estimated time: {nextAction.durationMinutes} minutes</span>
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
          
          {import.meta.env.DEV && (
            <div className="dev-banner mt-4">
              <p className="dev-helper-text">
                <strong>Dev Mocks:</strong> Choose which mock Next Best Action to display:
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
      )}
    </div>
  );
}
