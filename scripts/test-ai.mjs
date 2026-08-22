import handler from '../api/ai.ts';
import { config } from 'dotenv';
config();

async function runTest() {
  const req = {
    method: 'POST',
    body: {
      action: 'diagnose',
      context: {
        topic: 'Python Functions',
        concept: 'returnValues',
        question: 'What value is stored in answer after calling double(4)?',
        correctAnswer: '8',
        learnerAnswers: ['4', '6'],
        attemptCount: 2,
        mastery: 0,
        recoveryHistory: []
      }
    }
  };

  let status = 200;
  let jsonResponse = null;

  const res = {
    setHeader: () => {},
    status: (s) => {
      status = s;
      return res;
    },
    json: (data) => {
      jsonResponse = data;
    }
  };

  console.log('Testing /api/ai ...');
  try {
    await handler(req, res);
    console.log(`HTTP Status: ${status}`);
    console.log(`Success: ${status === 200 && jsonResponse?.ok}`);
    console.log(`Action: ${req.body.action}`);
    if (!jsonResponse?.ok) {
      console.log('Error:', jsonResponse?.error);
    } else {
      console.log('Validation Result: Passed schema');
      console.log('Diagnosed Misconception:', jsonResponse?.data?.misconception);
    }
  } catch (err) {
    console.log('Exception:', err.message);
  }
}

runTest();
