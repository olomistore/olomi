// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyA9yEJNn72EYB4ZZ5TDucZ94io8g0KHmGE",
    authDomain: "olomi-6c563.firebaseapp.com",
    projectId: "olomi-6c563",
    storageBucket: "olomi-6c563.firebasestorage.app",
    messagingSenderId: "1069285199882",
    appId: "1:1069285199882:web:302a2e021da182b2494ff3",
    measurementId: "G-C8BZ8BFRML"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);