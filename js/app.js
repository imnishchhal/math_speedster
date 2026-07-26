import { generateQuestion } from './questions.js';
import { fetchTopper, saveGameResult } from './db.js';

// Application State
const state = {
  currentChild: null,
  selectedGrade: 'CLASS_1_4',
  score: 0,
  currentQuestion: null,
  parentPhone: null
};

// DOM Elements
const elements = {
  topperDisplay: document.getElementById('topper-display'),
  questionText: document.getElementById('question-text'),
  mcqContainer: document.getElementById('mcq-container'),
  answerInput: document.getElementById('answer-input')
};

// Initialize App
async function init() {
  setupEventListeners();
  
  // Load Global Topper on Start
  const topper = await fetchTopper();
  if (elements.topperDisplay) {
    elements.topperDisplay.innerText = `${topper.name} (${topper.score} pts)`;
  }
}

function loadNextQuestion() {
  state.currentQuestion = generateQuestion(state.selectedGrade);
  elements.questionText.innerText = state.currentQuestion.questionText;

  if (state.currentQuestion.type === 'mcq') {
    elements.answerInput.style.display = 'none';
    elements.mcqContainer.style.display = 'flex';
    renderMCQ(state.currentQuestion.options);
  } else {
    elements.mcqContainer.style.display = 'none';
    elements.answerInput.style.display = 'block';
    elements.answerInput.value = '';
    elements.answerInput.focus();
  }
}

function renderMCQ(options) {
  elements.mcqContainer.innerHTML = '';
  options.forEach(option => {
    const btn = document.createElement('button');
    btn.className = 'mcq-btn';
    btn.innerText = option;
    btn.onclick = () => handleAnswer(option);
    elements.mcqContainer.appendChild(btn);
  });
}

function handleAnswer(userAnswer) {
  if (parseInt(userAnswer, 10) === state.currentQuestion.answer) {
    state.score += 10;
  } else {
    state.score = Math.max(0, state.score - 5);
  }
  loadNextQuestion();
}

function setupEventListeners() {
  // Input auto-advance event listener
  if (elements.answerInput) {
    elements.answerInput.addEventListener('input', (e) => {
      if (parseInt(e.target.value, 10) === state.currentQuestion?.answer) {
        handleAnswer(e.target.value);
      }
    });
  }
}

// Start application
document.addEventListener('DOMContentLoaded', init);
