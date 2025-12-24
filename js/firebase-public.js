import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, where, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

  async function loadHomeProjects() {
    const container = document.getElementById('homeProjectsGrid');
    const seeMoreBtn = document.getElementById('seeMoreBtn');
    if (!container) return;

    try {
      // Order by date desc
      const q = query(collection(db, 'projects'), orderBy('date', 'desc'), limit(4)); 
      const snap = await getDocs(q);

      if (snap.empty) {
        container.innerHTML = '<p>No projects to display.</p>';
        if (seeMoreBtn) seeMoreBtn.style.display = 'none';
        return;
      }

      container.innerHTML = '';
      let count = 0;
      snap.forEach(doc => {
        if (count >= 3) return; // Only show 3
        const p = doc.data();
        const dateObj = p.date ? new Date(p.date) : (p.createdAt ? new Date(p.createdAt) : new Date());
        const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        const html = `
          <div class="project-card" data-aos="fade-up">
            <div class="project-image">
              ${p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.title)}" style="width:100%; height:100%; object-fit:cover;">` : '<i class="fas fa-hands-helping"></i>'}
            </div>
            <div class="project-content">
              <h3>${escapeHtml(p.title)}</h3>
              <p>${escapeHtml(p.description || p.avenue)}</p>
              <div class="project-stats">
                <span class="project-stat">
                  <i class="fas fa-tag"></i>
                  ${escapeHtml(p.avenue)}
                </span>
                <span class="project-stat">
                  <i class="fas fa-calendar"></i>
                  ${dateStr}
                </span>
              </div>
            </div>
          </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
        count++;
      });

      if (seeMoreBtn) {
        if (snap.size > 3) {
          seeMoreBtn.style.display = 'inline-block';
        } else {
          seeMoreBtn.style.display = 'none';
        }
      }

    } catch (e) {
      console.error("Error loading home projects", e);
      // Fallback to createdAt if date fails (e.g. index missing)
      if (e.code === 'failed-precondition') {
         console.log("Index missing or field missing, trying createdAt");
         // ... could implement fallback logic here but keeping it simple for now
      }
    }
  }
  loadHomeProjects();
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
    const container = document.getElementById('projectsContainer');
    if (!container) return;

    try {
      const q = query(collection(db, 'projects'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        container.innerHTML = '<p>No projects yet.</p>';
        return;
      }

      container.innerHTML = '';
      
      // Group by Month Year
      const groups = {};
      const groupKeys = [];
      
      snap.forEach(doc => {
        const p = doc.data();
        const dateObj = p.date ? new Date(p.date) : (p.createdAt ? new Date(p.createdAt) : new Date());
        const monthYear = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        if (!groups[monthYear]) {
          groups[monthYear] = [];
          groupKeys.push(monthYear);
        }
        groups[monthYear].push(p);
      });

      groupKeys.forEach(key => {
        const projects = groups[key];
        
        const sectionHtml = `
          <div class="month-section" style="margin-bottom: 40px;">
            <h3 style="margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px;">${escapeHtml(key)}</h3>
            <div class="projects-grid">
              ${projects.map(p => {
                 const dateObj = p.date ? new Date(p.date) : (p.createdAt ? new Date(p.createdAt) : new Date());
                 const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                 return `
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
                      <span class="project-stat">
                        <i class="fas fa-calendar"></i>
                        ${dateStr}
                      </span>
                    </div>
                  </div>
                </div>
              `}).join('')}
            </div>
          </div>
        `;
        container.insertAdjacentHTML('beforeend', sectionHtml);
      });

    } catch (e) {
      console.error("Error loading projects", e);
    }
  }
  loadProjects();
}

// 4. Avenue Pages (Directors)
if (path.includes('/avenues/') || page.includes('service') || page.includes('development')) {
  async function loadDirectors() {
    // Wait for DOM if needed
    if (document.readyState === 'loading') {
      await new Promise(r => window.addEventListener('DOMContentLoaded', r));
    }

    const container = document.querySelector('.director-grid');
    if (!container) {
      console.log("Director grid container not found");
      return;
    }

    // Determine avenue from filename
    let avenueName = '';
    if (page.includes('community-service')) avenueName = 'Community Service';
    else if (page.includes('club-service')) avenueName = 'Club Service';
    else if (page.includes('professional-development')) avenueName = 'Professional Development';
    else if (page.includes('international-service')) avenueName = 'International Service';

    console.log("Loading directors for:", avenueName);

    if (!avenueName) return;

    try {
      const q = query(collection(db, 'directors')); 
      const snap = await getDocs(q);
      
      // Filter with normalization to handle potential whitespace or case issues
      const directors = snap.docs
        .map(d => d.data())
        .filter(d => {
          if (!d.avenue) return false;
          return d.avenue.trim().toLowerCase() === avenueName.toLowerCase();
        });

      console.log("Found directors:", directors.length);

      if (directors.length === 0) {
        container.innerHTML = '<p>No directors listed yet.</p>';
        return;
      }

      // Group by year
      const groups = {};
      const years = [];

      directors.forEach(d => {
        const y = d.year || 'Current';
        if (!groups[y]) {
          groups[y] = [];
          years.push(y);
        }
        groups[y].push(d);
      });

      // Sort years desc
      years.sort((a, b) => {
        if (a === 'Current') return -1;
        if (b === 'Current') return 1;
        return b - a;
      });

      container.innerHTML = '';
      
      years.forEach(year => {
        const list = groups[year];
        const html = `
          <div class="director-year" data-aos="fade-up">
            <h4 class="year">${escapeHtml(year)}</h4>
            <ul class="director-list">
              ${list.map(d => `
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
        container.insertAdjacentHTML('beforeend', html);
      });

    } catch (e) {
      console.error("Error loading directors", e);
    }
  }
  loadDirectors();

  async function loadAvenueDetails() {
    // Determine avenue from filename
    let avenueName = '';
    if (page.includes('community-service')) avenueName = 'Community Service';
    else if (page.includes('club-service')) avenueName = 'Club Service';
    else if (page.includes('professional-development')) avenueName = 'Professional Development';
    else if (page.includes('international-service')) avenueName = 'International Service';

    if (!avenueName) return;

    try {
      const q = query(collection(db, 'avenues'), where('name', '==', avenueName));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const data = snap.docs[0].data();
        
        // Update Description
        const descEl = document.getElementById('avenueDescription');
        if (descEl && data.description) {
          descEl.textContent = data.description;
        }

        // Update Stats
        const s1Label = document.getElementById('stat1Label');
        const s1Value = document.getElementById('stat1Value');
        const s2Label = document.getElementById('stat2Label');
        const s2Value = document.getElementById('stat2Value');

        if (s1Label && data.stat1Label) s1Label.textContent = data.stat1Label;
        if (s1Value && data.stat1Value) s1Value.textContent = data.stat1Value;
        if (s2Label && data.stat2Label) s2Label.textContent = data.stat2Label;
        if (s2Value && data.stat2Value) s2Value.textContent = data.stat2Value;
      }
    } catch (e) {
      console.error("Error loading avenue details", e);
    }
  }
  loadAvenueDetails();
}

// 5. Dynamic Navbar Avenues
async function loadNavbarAvenues() {
  const dropdown = document.querySelector('.nav-menu .dropdown');
  if (!dropdown) return;

  try {
    const snap = await getDocs(collection(db, 'avenues'));
    let avenues = [];
    
    if (!snap.empty) {
      avenues = snap.docs.map(d => d.data());
    }

    // Ensure default avenues are present if DB is empty or missing them
    const defaults = [
      { name: 'Community Service', link: 'avenues/community-service.html' },
      { name: 'Club Service', link: 'avenues/club-service.html' },
      { name: 'Professional Development', link: 'avenues/professional-development.html' },
      { name: 'International Service', link: 'avenues/international-service.html' }
    ];

    defaults.forEach(def => {
      if (!avenues.find(a => a.name === def.name)) {
        avenues.push(def);
      }
    });
    
    // Sort avenues to ensure consistent order
    // Order: Club, Community, International, Professional
    const order = ['Club Service', 'Community Service', 'International Service', 'Professional Development'];
    avenues.sort((a, b) => {
      return order.indexOf(a.name) - order.indexOf(b.name);
    });

    // Determine prefix based on current location
    let prefix = '';
    if (path.endsWith('index.html') || path === '/') {
      prefix = 'pages/'; 
    } else if (path.includes('/avenues/')) {
      prefix = '../'; 
    } else if (path.includes('/pages/')) {
      prefix = '';
    }

    dropdown.innerHTML = '';
    avenues.forEach(a => {
      let href = '#';
      if (a.link) {
        // Fix link if it already contains 'avenues/' and we are in 'pages/'
        // a.link is like 'avenues/community-service.html'
        
        if (prefix === '../') {
           href = prefix + a.link;
        } else if (prefix === '') {
           href = a.link;
        } else {
           href = prefix + a.link;
        }
      }
      
      const li = document.createElement('li');
      li.innerHTML = `<a href="${href}">${escapeHtml(a.name)}</a>`;
      dropdown.appendChild(li);
    });

  } catch (e) {
    console.error("Error loading navbar avenues", e);
  }
}
loadNavbarAvenues();
