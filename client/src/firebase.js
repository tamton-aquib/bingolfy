
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Exposing this isnt a problem, rules are set in firebase console.
const firebaseConfig = {
    apiKey: "AIzaSyAYUKlcBjuGH9Oqbf-5bKrFfHuvRTBnrBs",
    authDomain: "tttt-6f1fb.firebaseapp.com",
    projectId: "tttt-6f1fb",
    storageBucket: "tttt-6f1fb.appspot.com",
    messagingSenderId: "1041865285632",
    appId: "1:1041865285632:web:0a4f433b9a946f8d4a38e5",
    measurementId: "G-6MP9F58SR1"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
