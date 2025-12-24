import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAR97VU9ug7TVOLpzY1Tz1NkOjbrzrfQWk",
  authDomain: "khcp-web.firebaseapp.com",
  databaseURL: "https://khcp-web-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "khcp-web",
  storageBucket: "khcp-web.firebasestorage.app",
  messagingSenderId: "712625942740",
  appId: "1:712625942740:web:9809ee4445944f56770b41",
  measurementId: "G-C6D073FEC2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const path = window.location.pathname;
const page = path.split('/').pop();

// Helper to escape HTML
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 1. Home Page & About Page Stats
if (page === 'index.html' || page === '' || page === 'about.html') {
  async function loadStats() {
    try {
      const snap = await getDocs(collection(db, 'settings'));
      const statsDoc = snap.docs.find(d => d.data().type === 'homeStats');
      
      if (statsDoc) {
        const data = statsDoc.data();
        const membersEl = document.getElementById('displayMembers');
        const projectsEl = document.getElementById('displayProjects');
        const yearsEl = document.getElementById('displayYears');
        const hoursEl = document.getElementById('displayHours');

        if (membersEl && data.members) membersEl.textContent = data.members;
        if (projectsEl && data.projects) projectsEl.textContent = data.projects;
        if (yearsEl && data.years) yearsEl.textContent = data.years;
        if (hoursEl && data.hours) hoursEl.textContent = data.hours;
      }
    } catch (e) {
      console.error("Error loading stats", e);
    }
  }
  loadStats();
}

// 2. Blog Page
if (page === 'blog.html') {
  async function loadBlog() {
    const container = document.querySelector('.projects-grid');
    if (!container) return;

    try {
      const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        container.innerHTML = '<p>No posts yet.</p>';
        return;
      }

      container.innerHTML = '';
      snap.forEach(doc => {
        const p = doc.data();
        const date = p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';
        
        const html = `
          <div class="project-card" data-aos="fade-up">
            <div class="project-image">
              ${p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.title)}" style="width:100%; height:100%; object-fit:cover;">` : '<i class="fas fa-pen-nib"></i>'}
            </div>
            <div class="project-content">
              <h3>${escapeHtml(p.title)}</h3>
              <p>${escapeHtml(p.excerpt)}</p>
              <div class="project-stats">
                <span class="project-stat">
                  <i class="fas fa-calendar"></i>
                  ${date}
                </span>
              </div>
            </div>
          </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
      });
    } catch (e) {
      console.error("Error loading blog", e);
    }
  }
  loadBlog();
}

// 3. Projects Page
if (page === 'projects.html') {
  async function loadProjects() {
    const container = document.querySelector('.projects-grid');
    if (!container) return;

    try {
      const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        container.innerHTML = '<p>No projects yet.</p>';
        return;
      }

      container.innerHTML = '';
      snap.forEach(doc => {
        const p = doc.data();
        
        const html = `
          <div class="project-card" data-aos="fade-up">
            <div class="project-image">
              ${p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.title)}" style="width:100%; height:100%; object-fit:cover;">` : '<i class="fas fa-project-diagram"></i>'}
            </div>
            <div class="project-content">
              <h3>${escapeHtml(p.title)}</h3>
              <p>${escapeHtml(p.description || p.avenue)}</p>
              <div class="project-stats">
                <span class="project-stat">
                  <i class="fas fa-tag"></i>
                  ${escapeHtml(p.avenue)}
                </span>
              </div>
            </div>
          </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
      });
    } catch (e) {
      console.error("Error loading projects", e);
    }
  }
  loadProjects();
}

// 4. Avenue Pages (Directors)
if (path.includes('/avenues/')) {
  async function loadDirectors() {
    const container = document.querySelector('.director-grid');
    if (!container) return;

    // Determine avenue from filename
    let avenueName = '';
    if (page.includes('community-service')) avenueName = 'Community Service';
    else if (page.includes('club-service')) avenueName = 'Club Service';
    else if (page.includes('professional-development')) avenueName = 'Professional Development';
    else if (page.includes('international-service')) avenueName = 'International Service';

    if (!avenueName) return;

    try {
      // We need to filter directors by avenue. 
      // Since we didn't set up complex queries in admin, we'll fetch all and filter client side or use simple where
      // Note: Firestore requires an index for some compound queries, but simple equality is fine.
      // However, the admin saved 'avenue' as a string.
      
      const q = query(collection(db, 'directors')); // Fetch all for now to be safe with exact string matching
      const snap = await getDocs(q);
      
      const directors = snap.docs
        .map(d => d.data())
        .filter(d => d.avenue === avenueName);

      if (directors.length === 0) {
        container.innerHTML = '<p>No directors listed yet.</p>';
        return;
      }

      container.innerHTML = '';
      
      // Group by year if we had a year field, but we don't. 
      // So we'll just list them.
      
      const html = `
        <div class="director-year" data-aos="fade-up">
          <h4 class="year">Current Directors</h4>
          <ul class="director-list">
            ${directors.map(d => `
              <li class="director">
                ${d.imageUrl ? `<img src="${escapeHtml(d.imageUrl)}" alt="${escapeHtml(d.name)}" style="width:50px; height:50px; border-radius:50%; object-fit:cover; margin-right:10px;">` : ''}
                <div>
                  <div class="director-name">${escapeHtml(d.name)}</div>
                  <div class="director-role">${escapeHtml(d.avenue)} Director</div>
                </div>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
      container.innerHTML = html;

    } catch (e) {
      console.error("Error loading directors", e);
    }
  }
  loadDirectors();
}
