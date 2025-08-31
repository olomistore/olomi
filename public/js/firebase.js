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
  appId: "1:562685499782:web:23616d2db4738093c43407",
  measurementId: "G-2FSC9P97MX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);