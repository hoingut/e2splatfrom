

  // https://firebase.google.com/docs/web/setup#// Import the functions you need from the SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";




  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyD3F8gSkk6J9ChGRVB3_8DQP7FpBCl2T-w",
    authDomain: "anyshop-1f435.firebaseapp.com",
    projectId: "anyshop-1f435",
    storageBucket: "anyshop-1f435.firebasestorage.app",
    messagingSenderId: "710084687311",
    appId: "1:710084687311:web:5320f0c91b4fb3fe35ceba"
  };


// Initialize Firebase
const app = initializeApp(firebaseConfig);


// Export the services you'll need in other files
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();


// Export firestore functions that will be used across the app
export {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
