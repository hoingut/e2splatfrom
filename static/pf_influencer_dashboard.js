
import { auth, db } from './firebaseConfig.js';
import {
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  getDocs
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

// ===============================
// 🔥 DOM Elements
// ===============================
const userNameEl = document.getElementById('userName');
const userBalanceEl = document.getElementById('userBalance');
const totalWorksEl = document.getElementById('totalWorks');
const pendingWorksEl = document.getElementById('pendingWorks');
const completedWorksEl = document.getElementById('completedWorks');
const monthlyEarningsEl = document.getElementById('monthlyEarnings');
const recentActivitiesEl = document.getElementById('recentActivities');
const logoutBtn = document.getElementById('logoutBtn');

// ===============================
// 🔐 Auth State Check
// ===============================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    await loadInfluencerData(user.uid);
  } else {
    window.location.href = '/login.html';
  }
});

// ===============================
// 🧠 Load Influencer Data
// ===============================
async function loadInfluencerData(uid) {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      alert('User not found!');
      signOut(auth);
      return;
    }

    const userData = userSnap.data();

    if (userData.role !== 'influencer') {
      alert('Access denied!');
      signOut(auth);
      return;
    }

    // 🟢 Show basic user info
    userNameEl.textContent = userData.name || 'Influencer';

    // 💰 Real-time balance update
    onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        userBalanceEl.textContent = data.balance ? `${data.balance} ৳` : '0 ৳';
      }
    });

    // 📊 Load work stats & chart
    loadWorkStats(uid);

    // 📝 Load recent activities
    loadRecentActivities(uid);

  } catch (error) {
    console.error('❌ Error loading influencer data:', error);
  }
}

// ===============================
// 📊 Load Work Stats + Chart
// ===============================
async function loadWorkStats(uid) {
  try {
    const worksRef = collection(db, 'works');
    const q = query(worksRef, where('influencerId', '==', uid));
    const snap = await getDocs(q);

    let total = 0;
    let pending = 0;
    let completed = 0;
    let monthlyEarnings = 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    snap.forEach((doc) => {
      const work = doc.data();
      total++;
      if (work.status === 'pending') pending++;
      if (work.status === 'completed') completed++;
      const workDate = work.completedAt?.toDate?.();
      if (work.status === 'completed' && workDate) {
        if (
          workDate.getMonth() === currentMonth &&
          workDate.getFullYear() === currentYear
        ) {
          monthlyEarnings += work.earningAmount || 0;
        }
      }
    });

    totalWorksEl.textContent = total;
    pendingWorksEl.textContent = pending;
    completedWorksEl.textContent = completed;
    monthlyEarningsEl.textContent = `${monthlyEarnings} ৳`;

    // 📈 Draw Chart.js Chart
    drawChart(pending, completed);

  } catch (error) {
    console.error('❌ Error loading work stats:', error);
  }
}

// ===============================
// 📈 Chart.js Pie Chart
// ===============================
function drawChart(pending, completed) {
  const ctx = document.getElementById('workChart').getContext('2d');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Pending', 'Completed'],
      datasets: [
        {
          data: [pending, completed],
          backgroundColor: ['#f59e0b', '#10b981'],
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

// ===============================
// 📝 Load Recent Activities
// ===============================
function loadRecentActivities(uid) {
  const worksRef = collection(db, 'works');
  const q = query(worksRef, where('influencerId', '==', uid));

  onSnapshot(q, (snapshot) => {
    recentActivitiesEl.innerHTML = '';
    let works = [];
    snapshot.forEach((doc) => {
      works.push({ id: doc.id, ...doc.data() });
    });

    // Sort by createdAt desc
    works.sort((a, b) => {
      const dA = a.createdAt?.toDate?.() || new Date(0);
      const dB = b.createdAt?.toDate?.() || new Date(0);
      return dB - dA;
    });

    works.slice(0, 5).forEach((work) => {
      const date = work.createdAt?.toDate?.()?.toLocaleString() || '';
      const li = document.createElement('li');
      li.className = 'border-b py-2';
      li.innerHTML = `
        <div class="flex justify-between items-center">
          <span class="font-medium">${work.title || 'Untitled Task'}</span>
          <span class="text-sm text-gray-500">${date}</span>
        </div>
        <p class="text-sm text-gray-600">${work.status}</p>
      `;
      recentActivitiesEl.appendChild(li);
    });
  });
}

// ===============================
// 🚪 Logout
// ===============================
logoutBtn?.addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = '/login.html';
});
