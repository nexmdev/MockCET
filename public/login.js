const auth = firebase.auth();

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('login-btn');

loginButton.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Signed in
            window.location.href = 'main.html';
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error('Login failed:', errorCode, errorMessage);
            alert('Login failed: ' + errorMessage);
        });
});
