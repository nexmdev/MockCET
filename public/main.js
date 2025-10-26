const db = firebase.database();
const auth = firebase.auth();

auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in.
        const uid = user.uid;
        db.ref('users/' + uid).once('value', snapshot => {
            if (snapshot.exists()) {
                const userRole = snapshot.val().role;
                if (userRole === 'admin') {
                    displayAdminLink();
                }
            }
        });
        loadTests(uid);
    } else {
        // No user is signed in.
        window.location.href = 'login.html';
    }
});

function displayAdminLink() {
    const adminLinkContainer = document.getElementById('admin-link-container');
    const adminLink = document.createElement('a');
    adminLink.href = 'admin.html';
    adminLink.innerText = 'Go to Admin Panel';
    adminLinkContainer.appendChild(adminLink);
}

function loadTests(uid) {
    const testListDiv = document.getElementById('test-list');
    testListDiv.innerHTML = '<h2>Loading tests...</h2>';

    const testsRef = db.ref('tests');
    const resultsRef = db.ref('results/' + uid);

    Promise.all([testsRef.once('value'), resultsRef.once('value')]).then(([testsSnapshot, resultsSnapshot]) => {
        if (testsSnapshot.exists()) {
            const tests = testsSnapshot.val();
            const results = resultsSnapshot.exists() ? resultsSnapshot.val() : {};
            const categorizedTests = {};

            // Categorize tests
            for (const testName in tests) {
                const test = tests[testName];
                if (!categorizedTests[test.subject]) {
                    categorizedTests[test.subject] = [];
                }
                categorizedTests[test.subject].push({ ...test, testName });
            }

            testListDiv.innerHTML = '';
            for (const subject in categorizedTests) {
                const subjectHeader = document.createElement('h2');
                subjectHeader.innerText = subject;
                testListDiv.appendChild(subjectHeader);

                categorizedTests[subject].forEach(test => {
                    const testResult = results[test.testName];
                    const testElement = document.createElement('div');
                    testElement.innerHTML = `
                        <h3>${test.name}</h3>
                        <p>Marks: ${test.marks}</p>
                        <p>Time: ${test.time} minutes</p>
                        <p>Last Score: ${testResult ? `${testResult.score}/${testResult.total} on ${new Date(testResult.timestamp).toLocaleDateString()}` : 'Not Attempted'}</p>
                        <button onclick="startTest('${test.testName}')">Start Test</button>
                    `;
                    testListDiv.appendChild(testElement);
                });
            }
        } else {
            testListDiv.innerHTML = '<h2>No tests available.</h2>';
        }
    });
}

function startTest(testName) {
    window.location.href = `quiz.html?test=${testName}`;
}
