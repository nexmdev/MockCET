window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container');

const phoneNumberInput = document.getElementById('phone-number');
const otpInput = document.getElementById('otp');
const sendOtpButton = document.getElementById('send-otp');
const verifyOtpButton = document.getElementById('verify-otp');

let confirmationResult;

sendOtpButton.addEventListener('click', () => {
    const phoneNumber = phoneNumberInput.value;
    firebase.auth().signInWithPhoneNumber(phoneNumber, window.recaptchaVerifier)
        .then((result) => {
            confirmationResult = result;
            console.log('OTP sent');
        })
        .catch((error) => {
            console.error('Error sending OTP:', error);
        });
});

verifyOtpButton.addEventListener('click', () => {
    const otp = otpInput.value;
    confirmationResult.confirm(otp)
        .then((result) => {
            // User signed in successfully.
            const user = result.user;
            const uid = user.uid;
            const phoneNumber = user.phoneNumber;

            // Check if user is new
            const userRef = firebase.database().ref('users/' + uid);
            userRef.once('value', (snapshot) => {
                if (snapshot.exists()) {
                    // User exists, redirect to main page
                    window.location.href = 'main.html';
                } else {
                    // New user, save details to database
                    userRef.set({
                        uid: uid,
                        phoneNumber: phoneNumber,
                        role: 'user'
                    }).then(() => {
                        window.location.href = 'main.html';
                    }).catch((error) => {
                        console.error('Error saving user data:', error);
                    });
                }
            });
        })
        .catch((error) => {
            console.error('Error verifying OTP:', error);
        });
});
