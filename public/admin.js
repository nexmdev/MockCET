const db = firebase.database();
const auth = firebase.auth();

auth.onAuthStateChanged(user => {
    if (user) {
        if (user.email === 'admin@mockcet.com') {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('admin-content').style.display = 'block';
        } else {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('unauthorized').style.display = 'block';
        }
    } else {
        window.location.href = 'login.html';
    }
});

const questionsContainer = document.getElementById('questions-container');
const addQuestionButton = document.getElementById('add-question');
const saveTestButton = document.getElementById('save-test');
const testNameInput = document.getElementById('test-name');
const fileUploadInput = document.getElementById('file-upload');

let questionCount = 0;

addQuestionButton.addEventListener('click', () => {
    questionCount++;
    const questionDiv = document.createElement('div');
    questionDiv.innerHTML = `
        <hr>
        <h4>Question ${questionCount}</h4>
        <input type="text" placeholder="Question" id="q${questionCount}-text"><br>
        <input type="text" placeholder="Option 1" id="q${questionCount}-opt1"><br>
        <input type="text" placeholder="Option 2" id="q${questionCount}-opt2"><br>
        <input type="text" placeholder="Option 3" id="q${questionCount}-opt3"><br>
        <input type="text" placeholder="Option 4" id="q${questionCount}-opt4"><br>
        <input type="number" placeholder="Correct Answer (0-3)" id="q${questionCount}-ans"><br>
    `;
    questionsContainer.appendChild(questionDiv);
});

fileUploadInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        if (file.name.endsWith('.json')) {
            parseJson(content);
        } else if (file.name.endsWith('.csv')) {
            parseCsv(content);
        } else {
            alert('Unsupported file type. Please upload a CSV or JSON file.');
        }
    };
    reader.readAsText(file);
});

function parseJson(content) {
    try {
        const data = JSON.parse(content);
        populateTestData(data);
    } catch (error) {
        console.error('Error parsing JSON:', error);
        alert('Invalid JSON file.');
    }
}

function parseCsv(content) {
    const lines = content.split('\n');
    const questions = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
            const parts = line.split(',');
            if (parts.length === 6) {
                questions.push({
                    question: parts[0],
                    options: [parts[1], parts[2], parts[3], parts[4]],
                    answer: parseInt(parts[5])
                });
            }
        }
    }
    // For CSV, we don't have the test metadata, so we just populate the questions
    populateTestData({ questions: questions });
}

function populateTestData(data) {
    if (data.name) {
        testNameInput.value = data.name;
    }
    if (data.subject) {
        document.getElementById('test-subject').value = data.subject;
    }
    if (data.time) {
        document.getElementById('test-time').value = data.time;
    }

    if (data.questions) {
        questionsContainer.innerHTML = '';
        questionCount = 0;
        data.questions.forEach(q => {
            questionCount++;
            const questionDiv = document.createElement('div');
            questionDiv.innerHTML = `
                <hr>
                <h4>Question ${questionCount}</h4>
                <input type="text" placeholder="Question" id="q${questionCount}-text" value="${q.question}"><br>
                <input type="text" placeholder="Option 1" id="q${questionCount}-opt1" value="${q.options[0]}"><br>
                <input type="text" placeholder="Option 2" id="q${questionCount}-opt2" value="${q.options[1]}"><br>
                <input type="text" placeholder="Option 3" id="q${questionCount}-opt3" value="${q.options[2]}"><br>
                <input type="text" placeholder="Option 4" id="q${questionCount}-opt4" value="${q.options[3]}"><br>
                <input type="number" placeholder="Correct Answer (0-3)" id="q${questionCount}-ans" value="${q.answer}"><br>
            `;
            questionsContainer.appendChild(questionDiv);
        });
    }
}

saveTestButton.addEventListener('click', () => {
    const testName = testNameInput.value;
    const testSubject = document.getElementById('test-subject').value;
    const unitName = document.getElementById('unit-name').value;
    const testTime = document.getElementById('test-time').value;

    if (!testName || !testSubject || !unitName || !testTime) {
        alert('Please fill in all test details.');
        return;
    }

    const questions = [];
    for (let i = 1; i <= questionCount; i++) {
        const questionText = document.getElementById(`q${i}-text`).value;
        const options = [
            document.getElementById(`q${i}-opt1`).value,
            document.getElementById(`q${i}-opt2`).value,
            document.getElementById(`q${i}-opt3`).value,
            document.getElementById(`q${i}-opt4`).value
        ];
        const answer = parseInt(document.getElementById(`q${i}-ans`).value);

        if (questionText && options.every(opt => opt) && !isNaN(answer)) {
            questions.push({
                question: questionText,
                options: options,
                answer: answer
            });
        }
    }

    if (questions.length > 0) {
        const newTestKey = db.ref().child('allTests').push().key;

        const testMetaData = {
            test_name: testName,
            subject: testSubject,
            unit_name: unitName,
            info: {
                questions: questions.length,
                time: parseInt(testTime)
            },
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };

        const updates = {};
        updates['/allTests/' + newTestKey] = testMetaData;
        updates['/test/' + newTestKey] = questions;

        db.ref().update(updates)
            .then(() => {
                alert('Test saved successfully!');
                testNameInput.value = '';
                document.getElementById('test-subject').value = '';
                document.getElementById('unit-name').value = '';
                document.getElementById('test-time').value = '';
                questionsContainer.innerHTML = '';
                questionCount = 0;
            })
            .catch(error => {
                console.error('Error saving test:', error);
                alert('Error saving test.');
            });
    } else {
        alert('Please add at least one complete question.');
    }
});
