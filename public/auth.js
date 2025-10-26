// Auth check logic will go here
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        window.location.href = 'main.html';
    } else {
        window.location.href = 'login.html';
    }
});
