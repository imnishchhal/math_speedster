// Utility: random integer in range [min, max]
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate distractors (MCQ choices) close to correct answer
function generateDistractors(correctAnswer, count = 3) {
  const choices = new Set([correctAnswer]);
  while (choices.size < count + 1) {
    const offset = getRandomInt(1, 5) * (Math.random() < 0.5 ? 1 : -1);
    const fake = correctAnswer + offset;
    if (fake >= 0) choices.add(fake);
  }
  return Array.from(choices).sort(() => Math.random() - 0.5);
}

export function generateQuestion(gradeGroup) {
  let num1, num2, questionText, answer, type = 'input';

  switch (gradeGroup) {
    case 'PG_UKG':
      num1 = getRandomInt(1, 5);
      num2 = getRandomInt(1, 5);
      questionText = `${num1} + ${num2}`;
      answer = num1 + num2;
      type = 'mcq';
      break;

    case 'CLASS_1_4':
      num1 = getRandomInt(5, 20);
      num2 = getRandomInt(1, 10);
      const isSub = Math.random() > 0.5;
      questionText = isSub ? `${num1} - ${num2}` : `${num1} + ${num2}`;
      answer = isSub ? num1 - num2 : num1 + num2;
      type = 'mcq';
      break;

    case 'CLASS_5_8':
      // Tables, Integers, Squares
      num1 = getRandomInt(6, 19);
      num2 = getRandomInt(2, 12);
      questionText = `${num1} × ${num2}`;
      answer = num1 * num2;
      type = 'input';
      break;

    default:
      questionText = "2 + 2";
      answer = 4;
      type = 'mcq';
  }

  const options = (type === 'mcq') ? generateDistractors(answer) : null;

  return { questionText, answer, options, type };
}
