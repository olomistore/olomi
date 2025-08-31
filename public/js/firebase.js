// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCiiWyMqDmF17aQBA-fwNo5ByotEsA7fn0",
  authDomain: "olomi-7816a.firebaseapp.com",
  databaseURL: "https://olomi-7816a-default-rtdb.firebaseio.com",
  projectId: "olomi-7816a",
  storageBucket: "olomi-7816a.firebasestorage.app",
  messagingSenderId: "562685499782",
  appId: "1:562685499782:web:28732864ca37c610c43407",
  measurementId: "G-WREW35G7PM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);