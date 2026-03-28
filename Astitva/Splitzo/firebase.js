// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAXzcHqj9zZDPHnT9ZfOrMSLgH7rBwgWCg",
    authDomain: "splitzo-3b1eb.firebaseapp.com",
    projectId: "splitzo-3b1eb",
    storageBucket: "splitzo-3b1eb.firebasestorage.app",
    messagingSenderId: "716738420628",
    appId: "1:716738420628:web:b95f6ace097c6cbe06f981",
    measurementId: "G-SEWERVE4LX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);