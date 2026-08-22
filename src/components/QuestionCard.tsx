import { useState } from "react";
import type { ConceptId } from "../state/learnerTypes";

interface QuestionCardProps {
  currentAttemptCount: number;
  recentOutcome: "correct" | "incorrect" | null;
  onSubmitAnswer: (payload: { questionId: string; concept: ConceptId; answer: string; correct: boolean }) => void;
  onContinue: () => void;
  onHelpRequest: () => void;
}

export default function QuestionCard({
  currentAttemptCount,
  recentOutcome,
  onSubmitAnswer,
  onContinue,
  onHelpRequest,
}: QuestionCardProps) {
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false);

  const questionId = "q_double_func";
  const concept: ConceptId = "parameters";
  const correctAnswer = "8";
  
  const options = ["4", "6", "8", "result"];
  
  const codeSnippet = `def double(number):
    result = number * 2
    return result

answer = double(4)`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOption) return;

    const isCorrect = selectedOption === correctAnswer;
    onSubmitAnswer({
      questionId,
      concept,
      answer: selectedOption,
      correct: isCorrect,
    });
    setSubmitted(true);
  };

  const handleRetry = () => {
    setSelectedOption("");
    setSubmitted(false);
  };

  return (
    <div className="learning-card">
      <div className="card-header">
        <span className="card-badge">Concept Practice</span>
        <span className="attempts-badge">Attempts: {currentAttemptCount}</span>
      </div>

      <h3 className="question-title">What value is stored in `answer`?</h3>

      <pre className="code-block">
        <code>{codeSnippet}</code>
      </pre>

      {!submitted ? (
        <form onSubmit={handleSubmit} className="practice-form">
          <fieldset className="options-fieldset">
            <legend className="sr-only">Choose one answer option</legend>
            <div className="options-list">
              {options.map((option) => (
                <label 
                  key={option} 
                  className={`option-label ${selectedOption === option ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="answer-option"
                    value={option}
                    checked={selectedOption === option}
                    onChange={(e) => setSelectedOption(e.target.value)}
                    className="sr-only"
                  />
                  <span className="custom-radio" aria-hidden="true" />
                  <span className="option-text">{option}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="button-group">
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={!selectedOption}
            >
              Submit Answer
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onHelpRequest}
            >
              I need help
            </button>
          </div>
        </form>
      ) : (
        <div className="feedback-section" role="status" aria-live="polite">
          {recentOutcome === "correct" ? (
            <div className="feedback-correct">
              <p className="feedback-msg">✓ That's right. <code>double(4)</code> returns <code>8</code>.</p>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={onContinue}
              >
                Continue to Mission
              </button>
            </div>
          ) : (
            <div className="feedback-incorrect">
              <p className="feedback-msg">
                Not quite. Look closely at what the function sends back with <code>return</code>.
              </p>
              <div className="button-group">
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleRetry}
                >
                  Try Again
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={onHelpRequest}
                >
                  Request Recovery Mode
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
