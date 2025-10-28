const db = firebase.database();
const auth = firebase.auth();

auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in.
        const uid = user.uid;
        if (user.email === 'admin@mockcet.com') {
            displayAdminLink();
        }
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
    const testsRef = db.ref('allTests').orderByChild('createdAt');
    const resultsRef = db.ref('results/' + uid);

    Promise.all([testsRef.once('value'), resultsRef.once('value')]).then(([testsSnapshot, resultsSnapshot]) => {
        const physicsTab = document.getElementById('Physics');
        const chemistryTab = document.getElementById('Chemistry');
        const mathsTab = document.getElementById('Maths');

        physicsTab.innerHTML = '';
        chemistryTab.innerHTML = '';
        mathsTab.innerHTML = '';

        if (testsSnapshot.exists()) {
            const tests = testsSnapshot.val();
            const results = resultsSnapshot.exists() ? resultsSnapshot.val() : {};

            const sortedTests = Object.entries(tests).sort((a, b) => b[1].createdAt - a[1].createdAt);

            for (const [testId, test] of sortedTests) {
                const testResult = results[testId];
                const testElement = document.createElement('div');
                testElement.className = 'test-listing';
                testElement.innerHTML = `
                    <div class="test-card-subject-${test.subject.toLowerCase()}"></div>
                    <div class="test-card-content">
                        <h3>${test.test_name}</h3>
                        <p class="test-info">
                            <span title="Number of Questions">📝 ${test.info.questions}</span> |
                            <span title="Time">⏱️ ${test.info.time} min</span>
                        </p>
                        <p class="test-score">Score: ${testResult ? `${testResult.score}/${testResult.total}` : 'Unattempted'}</p>
                        <button onclick="startTest('${testId}')">Start Test</button>
                    </div>
                `;

                if (test.subject === 'Physics') {
                    physicsTab.appendChild(testElement);
                } else if (test.subject === 'Chemistry') {
                    chemistryTab.appendChild(testElement);
                } else if (test.subject === 'Maths') {
                    mathsTab.appendChild(testElement);
                }
            }
        } else {
            physicsTab.innerHTML = '<h2>No tests available.</h2>';
        }
    });
}

function startTest(testId) {
    window.location.href = `quiz.html?test=${testId}`;
}

function openTab(evt, subjectName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tab-link");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(subjectName).style.display = "block";
    evt.currentTarget.className += " active";
}
