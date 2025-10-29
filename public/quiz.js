
const db = firebase.database();

// ======== Global Variables ========
let questions = [];
let currentQuestion = 0;
let userAnswers = [];
let timeLeft = 600; // Default, will be updated
let totalTime = timeLeft;
let timerInterval;
let quizSubmitted = false;
let selectedTestId = '';

// ======== Fetch Questions ========
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        const urlParams = new URLSearchParams(window.location.search);
        selectedTestId = urlParams.get('test');
        if (selectedTestId) {
            loadQuizData(selectedTestId);
        } else {
            document.getElementById('quiz-container').innerHTML = "<h1>No test selected.</h1>";
        }
    } else {
        window.location.href = 'login.html';
    }
});

function loadQuizData(testId) {
    const testMetaRef = db.ref('allTests/' + testId);
    const testQuestionsRef = db.ref('test/' + testId);

    Promise.all([testMetaRef.once('value'), testQuestionsRef.once('value')])
        .then(([metaSnapshot, questionsSnapshot]) => {
            if (metaSnapshot.exists() && questionsSnapshot.exists()) {
                const testMeta = metaSnapshot.val();
                questions = questionsSnapshot.val() || [];

                if (!questions || questions.length === 0) {
                    document.getElementById('quiz-container').innerHTML = "<h1>This test has no questions.</h1>";
                    return;
                }

                document.getElementById('test-title').innerText = testMeta.test_name || 'Practice Test';
                timeLeft = (testMeta.info && testMeta.info.time) ? testMeta.info.time * 60 : 600;
                totalTime = timeLeft;
                userAnswers = Array(questions.length).fill(null);

                displayQuestion(currentQuestion);
                renderTracker();
                startTimer();
            } else {
                document.getElementById('quiz-container').innerHTML = "<h1>Test not found.</h1>";
            }
        })
        .catch(error => {
            console.error("Error loading test data:", error);
            document.getElementById('quiz-container').innerHTML = "<h1>Error loading test. Please try again.</h1>";
        });
}


// ======== Display Single Question ========
function displayQuestion(index) {
    const questionContainer = document.getElementById('question-container');
    questionContainer.innerHTML = '';
    const q = questions[index];

    if (!q) return;

    const questionEl = document.createElement('div');
    questionEl.className = 'question';
    questionEl.innerHTML = `<p>${index + 1}. ${q.question}</p>`;

    const optionsUl = document.createElement('ul');
    optionsUl.className = 'options';

    q.options.forEach((option, i) => {
        const optionLi = document.createElement('li');
        optionLi.innerHTML = `
            <label>
                <input type="radio" name="question${index}" value="${i}" ${userAnswers[index] === i ? 'checked' : ''}>
                ${option}
            </label>
        `;
        optionsUl.appendChild(optionLi);
    });

    questionContainer.appendChild(questionEl);
    questionContainer.appendChild(optionsUl);

    updateNavigationButtons();
    renderTracker();
}

function updateNavigationButtons() {
    document.getElementById('prevBtn').disabled = (currentQuestion === 0);
    document.getElementById('nextBtn').disabled = (currentQuestion === questions.length - 1);
    document.getElementById('submitBtn').style.display = (currentQuestion === questions.length - 1) ? 'inline-block' : 'none';
}

// ======== Timer ========
function startTimer() {
    const timerEl = document.getElementById('timer');
    const progressEl = document.getElementById('progress-bar-inner');
    timerInterval = setInterval(() => {
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerEl.innerText = `Time Left: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        progressEl.style.width = `${(timeLeft / totalTime) * 100}%`;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            submitQuiz();
        }
    }, 1000);
}

// ======== Navigation ========
document.getElementById('prevBtn').addEventListener('click', () => {
    saveAnswer();
    if (currentQuestion > 0) {
        currentQuestion--;
        displayQuestion(currentQuestion);
    }
});

document.getElementById('nextBtn').addEventListener('click', () => {
    saveAnswer();
    if (currentQuestion < questions.length - 1) {
        currentQuestion++;
        displayQuestion(currentQuestion);
    }
});

// ======== Tracker ========
function renderTracker() {
    const tracker = document.getElementById('question-tracker');
    tracker.innerHTML = '';

    questions.forEach((q, index) => {
        const circle = document.createElement('div');
        circle.className = 'q-tracker-item';
        circle.innerText = index + 1;
        if (index === currentQuestion) {
            circle.classList.add('current');
        }
        if (userAnswers[index] !== null) {
            circle.classList.add('answered');
        }
        if (quizSubmitted) {
            if (userAnswers[index] !== q.answer) {
                 circle.classList.add('wrong');
            }
        }

        circle.addEventListener('click', () => {
            if (!quizSubmitted) {
                saveAnswer();
                currentQuestion = index;
                displayQuestion(currentQuestion);
            }
        });
        tracker.appendChild(circle);
    });
}

// ======== Save Answer ========
function saveAnswer() {
    const selected = document.querySelector(`input[name="question${currentQuestion}"]:checked`);
    if (selected) {
        userAnswers[currentQuestion] = parseInt(selected.value);
    }
}

// ======== Submit Quiz ========
document.getElementById('submitBtn').addEventListener('click', () => {
    saveAnswer();
    submitQuiz();
});

function submitQuiz() {
    quizSubmitted = true;
    clearInterval(timerInterval);

    let score = 0;
    userAnswers.forEach((answer, index) => {
        if (answer === questions[index].answer) {
            score++;
        }
    });

    const resultData = {
        score: score,
        total: questions.length,
        percentage: (score / questions.length) * 100,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    const uid = firebase.auth().currentUser.uid;
    db.ref(`results/${uid}/${selectedTestId}`).set(resultData)
        .then(() => {
            console.log('Result saved');
            displayResults(score);
        })
        .catch(error => {
            console.error('Error saving result:', error);
            // Still display results even if saving fails
            displayResults(score);
        });
}

// ======== Display Results ========
function displayResults(score) {
    const quizContainer = document.getElementById('quiz-container');
    quizContainer.innerHTML = `
        <div class="result-summary">
            <h2>Quiz Complete!</h2>
            <p>Your Score: ${score} / ${questions.length}</p>
        </div>
    `;

    questions.forEach((q, index) => {
        const resultEl = document.createElement('div');
        resultEl.className = 'result-question';
        let resultClass = '';
        let resultIndicator = '';

        if (userAnswers[index] === q.answer) {
            resultClass = 'correct';
            resultIndicator = '✔️';
        } else {
            resultClass = 'incorrect';
            resultIndicator = '❌';
        }

        let optionsHtml = q.options.map((option, i) => {
            let className = '';
            if (i === q.answer) className = 'correct-option';
            if (i === userAnswers[index] && i !== q.answer) className = 'incorrect-option';
            return `<li class="${className}">${option}</li>`;
        }).join('');

        resultEl.innerHTML = `
            <p class="question-title">${index + 1}. ${q.question} <span class="result-indicator ${resultClass}">${resultIndicator}</span></p>
            <ul class="result-options">${optionsHtml}</ul>
        `;
        quizContainer.appendChild(resultEl);
    });

    renderTracker(); // Re-render tracker to show incorrect answers
}
