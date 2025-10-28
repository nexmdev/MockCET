document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const logoutBtn = document.getElementById('logout-btn');

    auth.onAuthStateChanged(user => {
        if (user) {
            logoutBtn.style.display = 'inline-block';
        } else {
            logoutBtn.style.display = 'none';
        }
    });

    logoutBtn.addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.href = 'login.html';
        }).catch((error) => {
            console.error('Sign out error', error);
        });
    });
});
