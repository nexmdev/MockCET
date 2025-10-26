


const db = firebase.database();

// ======== Global Variables ========
let questions = [];
let currentQuestion = 0;
let userAnswers = [];
let timeLeft = 600; // seconds
let totalTime = timeLeft;
let timerInterval;
let quizSubmitted = false;
let selectedTest = '';

// ======== Fetch Questions ========
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        const urlParams = new URLSearchParams(window.location.search);
        selectedTest = urlParams.get('test');
        if (selectedTest) {
            db.ref('tests/' + selectedTest).once('value', snapshot => {
                if (snapshot.exists()) {
                    const test = snapshot.val();
                    document.getElementById('test-title').innerText = test.name;
                    questions = test.questions;
                    timeLeft = test.time * 60;
                    totalTime = timeLeft;
                    userAnswers = Array(questions.length).fill(-1);
                    displayQuestion(currentQuestion);
                    startTimer();
                    renderTracker();
                } else {
                    document.getElementById('quiz').innerText = "Test not found.";
                }
            });
        } else {
            document.getElementById('quiz').innerText = "No test selected.";
        }
    } else {
        window.location.href = 'login.html';
    }
});

// ======== Display Questions ========
/*function displayQuestions() {
  const quizDiv = document.getElementById('quiz');
  quizDiv.innerHTML = '';

  questions.forEach((q, index) => {
    const qDiv = document.createElement('div');
    qDiv.classList.add('question-block');

    const questionEl = document.createElement('div');
    questionEl.classList.add('question');
   questionEl.innerText = `${index + 1}. ${q.question}`;
    qDiv.appendChild(questionEl);

    const ul = document.createElement('ul');
    ul.classList.add('options');

    q.options.forEach((opt, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<input type="radio" name="q${index}" value="${i}"> ${opt}`;
      ul.appendChild(li);
    });

    qDiv.appendChild(ul);
    quizDiv.appendChild(qDiv);
  });
}*/
// ======== Display Single Question ========
function displayQuestion(index) {
  const quizDiv = document.getElementById('quiz');
  quizDiv.innerHTML = '';
  const q = questions[index];

  const questionEl = document.createElement('div');
  questionEl.classList.add('question');
  questionEl.innerText = `${index + 1}. ${q.question}`;
  quizDiv.appendChild(questionEl);

  const ul = document.createElement('ul');
  ul.classList.add('options');

  q.options.forEach((opt, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<input type="radio" name="q${index}" value="${i}" ${userAnswers[index]===i?'checked':''}> ${opt}`;
    ul.appendChild(li);
  });

  quizDiv.appendChild(ul);

  // Disable prev/next buttons at edges
  document.getElementById('prevBtn').disabled = (index===0);
  document.getElementById('nextBtn').disabled = (index===questions.length-1);
}

// ======== Timer ========
function startTimer() {
  const timerEl = document.getElementById('timer');
  const progressEl = document.getElementById('progress');
  timerInterval = setInterval(() => {
    timeLeft--;
    const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerEl.innerText = `Time: ${minutes}:${seconds.toString().padStart(2,'0')}`;
    progressEl.style.width = `${(timeLeft / totalTime) * 100}%`;
    if(timeLeft <= 0) {
      clearInterval(timerInterval);
      calculateResult();
    }
  }, 1000);
}

// ======== Submit Button ========
/*document.getElementById('submitBtn').addEventListener('click', () => {
  clearInterval(timerInterval);
  calculateResult();
});

// ======== Calculate Result ========
function calculateResult() {
  userAnswers = [];
  questions.forEach((q, index) => {
    const selected = document.querySelector(`input[name="q${index}"]:checked`);
    userAnswers.push(selected ? parseInt(selected.value) : -1);
  });

  let score = 0;
  questions.forEach((q, i) => {
    if(userAnswers[i] === q.answer) score++;
  });

document.getElementById('result').innerText = `Your Score: ${score} / ${questions.length}`;

  document.getElementById('submitBtn').disabled = true;
}*/
// ======== Navigation ========
document.getElementById('prevBtn').addEventListener('click', () => {
  saveAnswer();
  if(currentQuestion > 0) currentQuestion--;
  displayQuestion(currentQuestion);
});

document.getElementById('nextBtn').addEventListener('click', () => {
  saveAnswer();
  if(currentQuestion < questions.length-1) currentQuestion++;
  if(currentQuestion == questions.length-1) document.getElementById('submitBtn').style.display = 'block';
  displayQuestion(currentQuestion);
});
function autoScrollTracker() {
  const tracker = document.getElementById('questionTracker');
  const activeCircle = tracker.children[currentQuestion];

  if (activeCircle) {
    activeCircle.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest"
    });
  }
}
function renderTracker() {
  const tracker = document.getElementById('questionTracker');
  tracker.innerHTML = '';

  questions.forEach((q, index) => {
    const circle = document.createElement('div');
    circle.classList.add('q-num');
    circle.innerText = index + 1;

    // ✅ Mark answered (green)
    if (userAnswers[index] !== -1) {
      circle.classList.add('answered');
    }

    // Highlight the current question
    if (index === currentQuestion) {
        circle.classList.add('current');
    }



    // ❌ After submission – show wrong answers in red
    if (quizSubmitted) {
      if (userAnswers[index] !== q.answer) {
        circle.classList.remove('answered');
        circle.classList.add('wrong');
      }
    }

    // Click to jump to question
    circle.addEventListener('click', () => {
      if (!quizSubmitted) {
        saveAnswer();
        currentQuestion = index;
        displayQuestion(currentQuestion);
        renderTracker();
        autoScrollTracker();
      }
    });

    tracker.appendChild(circle);
  });

  autoScrollTracker();
}
// ======== Save Answer ========
function saveAnswer() {
  const selected = document.querySelector(`input[name="q${currentQuestion}"]:checked`);
  userAnswers[currentQuestion] = selected ? parseInt(selected.value) : -1;
  renderTracker();
}

// ======== Submit Quiz ========
document.getElementById('submitBtn').addEventListener('click', () => {
  saveAnswer();
  clearInterval(timerInterval);
  calculateResult();
});

// ======== Calculate and Show Result ========
function calculateResult() {
    quizSubmitted = true; // ✅ Activate wrong answer coloring
    clearInterval(timerInterval);
    let score = 0;
    questions.forEach((q, i) => {
        if (userAnswers[i] === q.answer) score++;
    });

    const resultData = {
        score: score,
        total: questions.length,
        percentage: (score / questions.length) * 100,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    const uid = firebase.auth().currentUser.uid;
    db.ref(`results/${uid}/${selectedTest}`).set(resultData)
        .then(() => {
            console.log('Result saved');
        })
        .catch(error => {
            console.error('Error saving result:', error);
        });

    // Display the results
    const quizDiv = document.getElementById('quiz');
    quizDiv.innerHTML = '';
    questions.forEach((q, i) => {
        const user = userAnswers[i];
        const questionEl = document.createElement('div');
        questionEl.classList.add('question');
        questionEl.innerText = `${i + 1}. ${q.question}`;
        quizDiv.appendChild(questionEl);

        const ul = document.createElement('ul');
        ul.classList.add('options');

        q.options.forEach((opt, j) => {
            const li = document.createElement('li');
            li.style.padding = "5px 10px";
            li.style.borderRadius = "5px";
            li.style.marginBottom = "5px";

            let text = opt;
            if (j === q.answer) {
                text += " ✅"; // correct answer
                li.style.backgroundColor = "#c8f7c5";
            }
            if (j === user && j !== q.answer) {
                text += " ❌"; // wrong selection
                li.style.backgroundColor = "#f7c5c5";
            }
            li.innerText = text;
            ul.appendChild(li);
        });

        quizDiv.appendChild(ul);
    });

    document.getElementById('result').innerText = `Your Score: ${score} / ${questions.length}`;
    document.getElementById('submitBtn').style.display = 'none';
    document.getElementById('prevBtn').style.display = 'none';
    document.getElementById('nextBtn').style.display = 'none';
    renderTracker();
}