// dashboard.js
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const dashboardEl = document.getElementById('dashboard');
const loadingEl = document.getElementById('loading');
const userNameEl = document.getElementById('userName');
const userEmailEl = document.getElementById('userEmail');
const userBalanceEl = document.getElementById('userBalance');
const worksDoneEl = document.getElementById('worksDone');
const worksPendingEl = document.getElementById('worksPending');
const logoutBtn = document.getElementById('logoutBtn');

onAuthStateChanged(auth, (user) => {
  if (user) {
    const userDocRef = doc(db, 'users', user.uid);
    onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        userNameEl.textContent = data.name || 'User';
        userEmailEl.textContent = user.email;
        userBalanceEl.textContent = `৳${(data.balance || 0).toFixed(2)}`;
        worksDoneEl.textContent = data.worksDone || 0;
        worksPendingEl.textContent = data.worksPending || 0;

        loadingEl.classList.add('hidden');
        dashboardEl.classList.remove('hidden');
      } else {
        loadingEl.innerHTML = `<p class="text-red-500">No user data found.</p>`;
      }
    });
  } else {
    window.location.href = '/login.html'; // redirect to your login page
  }
});

// Logout
logoutBtn.addEventListener('click', () => {
  signOut(auth).catch(err => console.error('Logout error:', err));
});
