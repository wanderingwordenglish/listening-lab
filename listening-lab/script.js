const playButton = document.getElementById('playButton');
const answerGroup = document.getElementById('answerGroup');
const feedback = document.getElementById('feedback');
const feedbackWord = document.getElementById('feedbackWord');
const audioPlayer = document.getElementById('audioPlayer');
const progressEl = document.getElementById('progress');
const progressText = document.getElementById('progressText');
const nextBtn = document.getElementById('nextButton');
const subtitleEl = document.querySelector('.subtitle');

// load/save per-quiz state to localStorage so progress survives reloads
function loadStoredState() {
  try {
    const raw = localStorage.getItem('listeningLabState');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveStoredState() {
  try {
    localStorage.setItem('listeningLabState', JSON.stringify(quizzesState));
  } catch (e) {
    // ignore write errors
  }
}

// store state per quiz so progress is preserved when switching
let quizzesState = loadStoredState();

function getQuizState(quizName) {
  if (!quizzesState[quizName]) {
    quizzesState[quizName] = {
      questions: null, // remaining questions
      originalQuestions: null, // full original list for reset
      originalTotal: 0,
      currentQuestionIndex: null,
      firstSlide: true
    };
  }
  return quizzesState[quizName];
}

const successMessages = [
  'You did it 🎉', 'Nice work 👏', 'Great job! 🌟', 'Well done ✅', 'Awesome 😎',
  'Excellent! 💯', 'Fantastic ✨', 'Brilliant! 🧠', 'Way to go 🚀', 'You nailed it! 🎯'
];

// Available quiz configurations
const QUIZ_CONFIG = {
  'B vs. V': { questionsPath: 'data/quiz/b-v.json', recordingsFolder: 'B-V', subtitle: 'B vs. V' },
  'R vs. L': { questionsPath: 'data/quiz/r-l.json', recordingsFolder: 'R-L', subtitle: 'R vs. L' },
  'EE vs. IH': { questionsPath: 'data/quiz/ee-ih.json', recordingsFolder: 'EE-IH', subtitle: 'EE vs. IH' },
  'UU vs. OO': { questionsPath: 'data/quiz/uu-oo.json', recordingsFolder: 'UU-OO', subtitle: 'UU vs. OO' },
  'All Vowels': { questionsPath: 'data/quiz/all-vowels.json', recordingsFolder: '', subtitle: 'All Vowels' }
};

let currentQuiz = 'B vs. V';
let questions = [];
let currentQuestionIndex = null;
let selectedAnswer = null;
let correctAnswer = null;
let originalTotal = 0;
let firstSlide = true;

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function updateProgress() {
  if (!progressEl || !progressText) return;
  const remaining = questions ? questions.length : 0;
  const completed = originalTotal - remaining;
  const percent = originalTotal ? Math.round((completed / originalTotal) * 100) : 0;
  progressText.textContent = `Completed: ${completed} / ${originalTotal}`;
  progressEl.style.setProperty('--progress', `${percent}%`);
}

function renderQuestion(question) {
  if (!question) return;

  document.body.classList.toggle('all-vowels', currentQuiz === 'All Vowels');
  answerGroup.innerHTML = '';
  const choices = question.choices.slice();
  if (currentQuiz !== 'All Vowels') {
    shuffleArray(choices);
  }

  correctAnswer = question.correct.toLowerCase();
  selectedAnswer = null;

  choices.forEach((choice) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'answer-button';
    button.textContent = choice;
    button.dataset.choice = choice.toLowerCase();
    button.addEventListener('click', () => handleAnswerClick(button));
    answerGroup.appendChild(button);
  });

  nextBtn.disabled = true;

  if (firstSlide) {
    feedback.textContent = currentQuiz === 'All Vowels' ? 'Listen carefully & choose the vowel!' : 'Listen carefully & choose the word!';
    feedback.className = 'feedback correct';
    firstSlide = false;
  } else {
    feedback.textContent = '';
    feedback.className = 'feedback';
  }

  if (feedbackWord) {
    feedbackWord.textContent = '';
  }

  updateProgress();

  if (audioPlayer) {
    audioPlayer.src = encodeURI(`audio/words/${question.audio}`);
    audioPlayer.load();
  }
}

// --- Web Audio API sound effects (no external files) ---
let audioCtx = null;
function ensureAudioContext() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      audioCtx = null;
    }
  }
}

function playCorrectSound() {
  ensureAudioContext();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
  gain.connect(audioCtx.destination);

  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
  osc.connect(gain);
  osc.start(now);
  osc.stop(now + 0.36);
}

function playIncorrectSound() {
  ensureAudioContext();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.05, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
  gain.connect(audioCtx.destination);

  const osc = audioCtx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.18);
  const lfo = audioCtx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 8;
  const lfoGain = audioCtx.createGain();
  lfoGain.gain.value = 8;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);

  osc.connect(gain);
  lfo.start(now);
  osc.start(now);
  osc.stop(now + 0.42);
  lfo.stop(now + 0.42);
}

function finishAll() {
  feedback.textContent = 'Mission Accomplished! You did it! 🚀';
  feedback.className = 'feedback correct';
  playButton.disabled = true;
  answerGroup.querySelectorAll('button').forEach((btn) => {
    btn.disabled = true;
  });
  if (feedbackWord) {
    feedbackWord.textContent = '';
  }
  nextBtn.disabled = false;
  nextBtn.textContent = 'Reset';
  const state = getQuizState(currentQuiz);
  state.questions = [];
  state.firstSlide = false;
  saveStoredState();
}

function pickNextQuestion() {
  if (!questions || questions.length === 0) {
    finishAll();
    return;
  }
  currentQuestionIndex = Math.floor(Math.random() * questions.length);
  renderQuestion(questions[currentQuestionIndex]);
}

function handleAnswerClick(button) {
  selectedAnswer = button.dataset.choice;
  answerGroup.querySelectorAll('button').forEach((btn) => {
    btn.disabled = true;
    btn.classList.toggle('selected', btn === button);
  });

  const isCorrect = selectedAnswer === correctAnswer;
  const currentQuestion = questions[currentQuestionIndex];

  if (isCorrect) {
    button.classList.add('flash-correct', 'correct');
    feedback.textContent = successMessages[Math.floor(Math.random() * successMessages.length)];
    if (feedbackWord && currentQuiz === 'All Vowels' && currentQuestion) {
      feedbackWord.textContent = currentQuestion.audio.replace(/\.mp3$/i, '').toUpperCase();
    } else if (feedbackWord) {
      feedbackWord.textContent = '';
    }
    playCorrectSound();
    feedback.className = 'feedback correct';
    questions.splice(currentQuestionIndex, 1);
  } else {
    if (feedbackWord) {
      feedbackWord.textContent = '';
    }
    button.classList.add('flash-wrong', 'wrong');
    playIncorrectSound();
    feedback.textContent = '';
    feedback.className = 'feedback';
    const q = questions.splice(currentQuestionIndex, 1)[0];
    questions.push(q);
  }

  updateProgress();

  const state = getQuizState(currentQuiz);
  state.questions = questions;
  state.originalTotal = originalTotal;
  state.firstSlide = firstSlide;
  saveStoredState();

  nextBtn.disabled = false;
  if (questions.length === 0) {
    finishAll();
  }
}

nextBtn.addEventListener('click', async () => {
  const state = getQuizState(currentQuiz);
  // If quiz complete, Reset
  if (!questions || questions.length === 0) {
    if (state.originalQuestions && state.originalQuestions.length > 0) {
      state.questions = state.originalQuestions.slice();
      questions = state.questions;
      originalTotal = state.originalTotal || state.originalQuestions.length;
      state.firstSlide = true;
      firstSlide = true;
      playButton.disabled = false;
      nextBtn.textContent = 'Next';
      if (feedbackWord) {
        feedbackWord.textContent = '';
      }
      updateProgress();
      saveStoredState();
      pickNextQuestion();
    } else {
      feedback.textContent = 'No original questions to reset.';
      feedback.className = 'feedback wrong';
    }
    return;
  }

  pickNextQuestion();
  try {
    await audioPlayer.play();
  } catch (err) {
    console.warn('Autoplay blocked or failed', err);
  }
});

playButton.addEventListener('click', () => {
  if (!audioPlayer || !audioPlayer.src) {
    feedback.textContent = 'No audio available for this question.';
    feedback.className = 'feedback wrong';
    return;
  }
  audioPlayer.play().catch((err) => {
    console.error('Audio play failed', err);
    feedback.textContent = 'Audio playback failed.';
    feedback.className = 'feedback wrong';
  });
});

async function loadQuestions() {
  const cfg = QUIZ_CONFIG[currentQuiz] || QUIZ_CONFIG['B vs. V'];
  const state = getQuizState(currentQuiz);

  // If previously loaded, restore state
  if (state.questions && Array.isArray(state.questions)) {
    questions = state.questions;
    originalTotal = state.originalTotal || (state.originalQuestions ? state.originalQuestions.length : 0);
    firstSlide = state.firstSlide;
    updateProgress();
    if (!questions || questions.length === 0) {
      // quiz already completed
      finishAll();
    } else {
      // ensure Next button shows Next for unfinished quiz
      nextBtn.textContent = 'Next';
      pickNextQuestion();
    }
    return;
  }

  try {
    const res = await fetch(encodeURI(cfg.questionsPath));
    if (!res.ok) throw new Error('Failed to fetch ' + cfg.questionsPath);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      feedback.textContent = 'questions.json is empty or invalid.';
      feedback.className = 'feedback wrong';
      state.questions = [];
      state.originalQuestions = [];
      state.originalTotal = 0;
      return;
    }

    state.originalQuestions = data.slice();
    state.questions = data.slice();
    state.originalTotal = data.length;
    state.firstSlide = true;

    questions = state.questions;
    originalTotal = state.originalTotal;
    firstSlide = state.firstSlide;
    updateProgress();
    // newly loaded quiz should show Next
    nextBtn.textContent = 'Next';
    saveStoredState();
    pickNextQuestion();
  } catch (err) {
    console.error(err);
    feedback.textContent = 'Could not load questions.json';
    feedback.className = 'feedback wrong';
  }
}

// initialize: wire up quiz buttons
const quizButtons = document.querySelectorAll('.quiz-buttons .quiz-button');
quizButtons.forEach((btn) => {
  if (btn.dataset.quiz === currentQuiz) btn.classList.add('active');
  btn.addEventListener('click', () => {
    quizButtons.forEach((b) => b.classList.toggle('active', b === btn));
    currentQuiz = btn.dataset.quiz;
    if (subtitleEl) subtitleEl.textContent = QUIZ_CONFIG[currentQuiz]?.subtitle || currentQuiz;
    loadQuestions();
  });
});

loadQuestions();
