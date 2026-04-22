interface Question {
  id: string;
  chapterId: number;
  chapterName: string;
  question: string;
  options: [string, string, string, string];
  answer: number;
}

interface ChapterMeta {
  id: number;
  name: string;
  questionCount: number;
}

interface QuizData {
  chapters: ChapterMeta[];
  questions: Question[];
}

interface ShuffledQuestion extends Question {
  shuffledOptions: string[];
  shuffledAnswer: number;
}

interface QuizState {
  phase: 'setup' | 'answering' | 'results';
  selectedChapters: number[] | 'all';
  questionCount: number;
  questions: ShuffledQuestion[];
  currentIndex: number;
  answers: (number | null)[];
  answeredCurrent: boolean;
}

// --- Load embedded data ---
const dataEl = document.getElementById('quiz-data');
const quizData: QuizData = JSON.parse(dataEl!.textContent!);

// --- DOM refs ---
const setupPhase = document.getElementById('setup-phase')!;
const quizPhase = document.getElementById('quiz-phase')!;
const resultsPhase = document.getElementById('results-phase')!;
const chapterCards = document.querySelectorAll<HTMLButtonElement>('.chapter-card');
const questionCountInput = document.getElementById('question-count') as HTMLInputElement;
const maxCountSpan = document.getElementById('max-count')!;
const countHint = document.getElementById('count-hint')!;
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
const progressBar = document.getElementById('progress-bar')!;
const questionCounter = document.getElementById('question-counter')!;
const questionContainer = document.getElementById('question-container')!;
const quizFooter = document.getElementById('quiz-footer')!;
const resultsContainer = document.getElementById('results-container')!;
const backHomeBtn = document.getElementById('back-home-btn')!;

// --- State ---
const state: QuizState = {
  phase: 'setup',
  selectedChapters: [],
  questionCount: 10,
  questions: [],
  currentIndex: 0,
  answers: [],
  answeredCurrent: false,
};

// --- Utilities ---
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getAvailableCount(): number {
  if (state.selectedChapters === 'all') {
    return quizData.questions.length;
  }
  return quizData.questions.filter(q => state.selectedChapters.includes(q.chapterId)).length;
}

function switchPhase(phase: 'setup' | 'answering' | 'results') {
  state.phase = phase;
  setupPhase.classList.toggle('active', phase === 'setup');
  quizPhase.classList.toggle('active', phase === 'answering');
  resultsPhase.classList.toggle('active', phase === 'results');
}

// --- Setup Phase ---
chapterCards.forEach(card => {
  card.addEventListener('click', () => {
    const ch = card.dataset.chapter!;

    if (ch === 'all') {
      state.selectedChapters = 'all';
      chapterCards.forEach(c => c.classList.toggle('selected', c.dataset.chapter === 'all'));
    } else {
      const chId = parseInt(ch);
      if (state.selectedChapters === 'all') {
        state.selectedChapters = [];
      }
      card.classList.toggle('selected');
      const idx = state.selectedChapters.indexOf(chId);
      if (idx >= 0) {
        state.selectedChapters.splice(idx, 1);
      } else {
        state.selectedChapters.push(chId);
      }
      // Deselect "all" card
      chapterCards.forEach(c => {
        if (c.dataset.chapter === 'all') c.classList.remove('selected');
      });
    }

    updateSetupUI();
  });
});

function updateSetupUI() {
  const available = getAvailableCount();
  const hasSelection = state.selectedChapters === 'all' || state.selectedChapters.length > 0;

  maxCountSpan.textContent = String(available);
  questionCountInput.max = String(available);
  if (parseInt(questionCountInput.value) > available) {
    questionCountInput.value = String(Math.min(available, 10));
  }

  startBtn.disabled = !hasSelection;
  startBtn.textContent = hasSelection ? '開始測驗' : '選擇章節以開始';
}

startBtn.addEventListener('click', () => {
  const count = parseInt(questionCountInput.value) || 10;
  startQuiz(count);
});

backHomeBtn.addEventListener('click', () => {
  switchPhase('setup');
});

// --- Quiz Phase ---
function startQuiz(count: number) {
  let pool: Question[];
  if (state.selectedChapters === 'all') {
    pool = [...quizData.questions];
  } else {
    pool = quizData.questions.filter(q => state.selectedChapters.includes(q.chapterId));
  }

  pool = shuffle(pool).slice(0, count);

  state.questions = pool.map(q => {
    const indices = [0, 1, 2, 3];
    const shuffledIndices = shuffle(indices);
    const shuffledOptions = shuffledIndices.map(i => q.options[i]) as [string, string, string, string];
    const shuffledAnswer = shuffledIndices.indexOf(q.answer - 1) + 1;
    return { ...q, shuffledOptions, shuffledAnswer };
  });

  state.questionCount = state.questions.length;
  state.currentIndex = 0;
  state.answers = new Array(state.questionCount).fill(null);
  state.answeredCurrent = false;

  switchPhase('answering');
  renderQuestion();
}

function renderQuestion() {
  const q = state.questions[state.currentIndex];
  state.answeredCurrent = false;
  const labels = ['A', 'B', 'C', 'D'];

  questionCounter.textContent = `${state.currentIndex + 1} / ${state.questionCount}`;
  const progress = ((state.currentIndex) / state.questionCount) * 100;
  progressBar.style.width = `${progress}%`;

  questionContainer.innerHTML = `
    <div class="question-card">
      <div class="question-chapter">${q.chapterName}</div>
      <div class="question-text">${escapeHtml(q.question)}</div>
      <ul class="options-list">
        ${q.shuffledOptions.map((opt, i) => `
          <li>
            <button class="option-btn" data-index="${i + 1}">
              <span class="option-label">${labels[i]}</span>
              <span class="option-text">${escapeHtml(opt)}</span>
              <span class="option-icon"></span>
            </button>
          </li>
        `).join('')}
      </ul>
    </div>
  `;

  quizFooter.innerHTML = '';

  questionContainer.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (state.answeredCurrent) return;
      handleAnswer(parseInt((btn as HTMLElement).dataset.index!));
    });
  });
}

function handleAnswer(selected: number) {
  state.answeredCurrent = true;
  state.answers[state.currentIndex] = selected;

  const q = state.questions[state.currentIndex];
  const correct = q.shuffledAnswer;
  const isCorrect = selected === correct;

  const buttons = questionContainer.querySelectorAll('.option-btn');
  buttons.forEach(btn => {
    const idx = parseInt((btn as HTMLElement).dataset.index!);
    btn.setAttribute('disabled', '');

    if (idx === correct) {
      btn.classList.add('correct');
      btn.querySelector('.option-icon')!.innerHTML = svgCheck();
    }
    if (idx === selected && !isCorrect) {
      btn.classList.add('incorrect');
      btn.querySelector('.option-icon')!.innerHTML = svgX();
    }
  });

  const isLast = state.currentIndex >= state.questionCount - 1;
  quizFooter.innerHTML = `
    <button class="btn btn-primary" id="next-btn">
      ${isLast ? '查看成績' : '下一題'}
      ${svgArrowRight()}
    </button>
  `;

  document.getElementById('next-btn')!.addEventListener('click', () => {
    if (isLast) {
      showResults();
    } else {
      state.currentIndex++;
      renderQuestion();
    }
  });
}

// --- Results Phase ---
function showResults() {
  switchPhase('results');

  let correctCount = 0;
  state.answers.forEach((ans, i) => {
    if (ans === state.questions[i].shuffledAnswer) correctCount++;
  });

  const percentage = Math.round((correctCount / state.questionCount) * 100);
  let grade: string, gradeClass: string, scoreClass: string;

  if (percentage === 100) { grade = '完美'; gradeClass = 'badge-success'; scoreClass = 'perfect'; }
  else if (percentage >= 80) { grade = '優秀'; gradeClass = 'badge-primary'; scoreClass = 'good'; }
  else if (percentage >= 60) { grade = '及格'; gradeClass = 'badge-neutral'; scoreClass = 'ok'; }
  else { grade = '需要加強'; gradeClass = 'badge-error'; scoreClass = 'poor'; }

  const labels = ['A', 'B', 'C', 'D'];

  resultsContainer.innerHTML = `
    <div class="card results-summary">
      <div style="margin-bottom: var(--space-3);">
        ${svgTrophy('icon-lg')}
      </div>
      <div class="results-score ${scoreClass}">${percentage}%</div>
      <div class="results-detail">${correctCount} / ${state.questionCount} 題正確</div>
      <span class="results-badge ${gradeClass}">${grade}</span>
    </div>

    <div class="review-list">
      ${state.questions.map((q, i) => {
        const userAns = state.answers[i];
        const correctAns = q.shuffledAnswer;
        const wasCorrect = userAns === correctAns;
        return `
          <div class="review-item ${wasCorrect ? 'was-correct' : 'was-wrong'}">
            <div class="review-meta">
              ${wasCorrect ? svgCheckSmall() + ' 正確' : svgXSmall() + ' 錯誤'}
              &nbsp;&middot;&nbsp; ${q.chapterName}
              &nbsp;&middot;&nbsp; 第 ${i + 1} 題
            </div>
            <div class="review-question">${escapeHtml(q.question)}</div>
            <ul class="review-options">
              ${q.shuffledOptions.map((opt, oi) => {
                const idx = oi + 1;
                let cls = '';
                if (idx === correctAns) cls = 'is-correct';
                if (idx === userAns && !wasCorrect) cls = 'is-wrong';
                const icon = idx === correctAns ? svgCheckSmall() : (idx === userAns && !wasCorrect ? svgXSmall() : '');
                return `<li class="review-option ${cls}">${icon} ${labels[oi]}. ${escapeHtml(opt)}</li>`;
              }).join('')}
            </ul>
          </div>
        `;
      }).join('')}
    </div>

    <div class="results-actions">
      <button class="btn btn-secondary" id="retry-btn">
        ${svgRotate()} 重新測驗
      </button>
      <button class="btn btn-primary" id="new-btn">
        ${svgHome()} 新測驗
      </button>
    </div>
  `;

  document.getElementById('retry-btn')!.addEventListener('click', () => {
    startQuiz(state.questionCount);
  });

  document.getElementById('new-btn')!.addEventListener('click', () => {
    state.selectedChapters = [];
    chapterCards.forEach(c => c.classList.remove('selected'));
    updateSetupUI();
    switchPhase('setup');
  });
}

// --- SVG Icon helpers ---
function svgCheck() {
  return `<svg class="icon" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.15"/><path d="M6.5 10.5L8.5 12.5L13.5 7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function svgX() {
  return `<svg class="icon" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.15"/><path d="M7 7L13 13M13 7L7 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
}
function svgCheckSmall() {
  return `<svg width="14" height="14" viewBox="0 0 20 20" fill="none" style="vertical-align:middle"><path d="M4 10.5L8 14.5L16 5.5" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function svgXSmall() {
  return `<svg width="14" height="14" viewBox="0 0 20 20" fill="none" style="vertical-align:middle"><path d="M5 5L15 15M15 5L5 15" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round"/></svg>`;
}
function svgArrowRight() {
  return `<svg class="icon" viewBox="0 0 20 20" fill="none"><path d="M4 10H16M16 10L11 5M16 10L11 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function svgRotate() {
  return `<svg class="icon" viewBox="0 0 20 20" fill="none"><path d="M3 10C3 6.13 6.13 3 10 3C13.17 3 15.84 5.1 16.67 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M17 10C17 13.87 13.87 17 10 17C6.83 17 4.16 14.9 3.33 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M16.67 8H13.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
}
function svgHome() {
  return `<svg class="icon" viewBox="0 0 20 20" fill="none"><path d="M3 10L10 3L17 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 8.5V16H8V12H12V16H15V8.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function svgTrophy(cls = 'icon') {
  return `<svg class="${cls}" viewBox="0 0 20 20" fill="none"><path d="M6 3H14V9C14 11.21 12.21 13 10 13C7.79 13 6 11.21 6 9V3Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 5H3.5C3.5 5 3 7 3.5 8.5C4 10 6 10 6 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M14 5H16.5C16.5 5 17 7 16.5 8.5C16 10 14 10 14 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M10 13V17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M7 17H13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
