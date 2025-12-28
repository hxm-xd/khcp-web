import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, where, limit, doc, getDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import DOMPurify from "https://cdn.jsdelivr.net/npm/dompurify@3.0.6/+esm";

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
const page = path.split('/').pop().split('?')[0]; // Handle query params

// Setup loading coordination
let resolveAppReady;
if (page === 'avenue.html') {
    window.waitForApp = new Promise(resolve => {
        resolveAppReady = resolve;
    });
}

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

// Helper to strip HTML tags for excerpts
function stripHtml(html) {
  if (!html) return '';
  // Create a temporary element
  const tmp = document.createElement("DIV");
  // Inject the HTML
  tmp.innerHTML = html;
  // Retrieve the text content
  return tmp.textContent || tmp.innerText || "";
}

// Toast Notification Helper
window.showNotification = function(message, type = 'success') {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
};

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
      // Optional: showNotification("Failed to load stats", "error");
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
              ${p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.title)}">` : '<i class="fas fa-hands-helping"></i>'}
            </div>
            <div class="project-content">
              <h3>${escapeHtml(p.title)}</h3>
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
              <a href="/pages/project-details.html?id=${doc.id}" class="read-more-btn">Read More &rarr;</a>
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
      
      if (window.AOS) window.AOS.refresh();

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
              ${p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.title)}">` : '<i class="fas fa-pen-nib"></i>'}
            </div>
            <div class="project-content">
              <h3>${escapeHtml(p.title)}</h3>
              <div class="project-stats">
                <span class="project-stat">
                  <i class="fas fa-calendar"></i>
                  ${date}
                </span>
              </div>
              <a href="blog-details.html?id=${doc.id}" class="read-more-btn">Read More &rarr;</a>
            </div>
          </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
      });
      
      if (window.AOS) window.AOS.refresh();
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
        const p = { id: doc.id, ...doc.data() };
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
          <div class="month-section">
            <h3 class="month-heading">${escapeHtml(key)}</h3>
            <div class="projects-grid">
              ${projects.map(p => {
                 const dateObj = p.date ? new Date(p.date) : (p.createdAt ? new Date(p.createdAt) : new Date());
                 const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                 return `
                <div class="project-card" data-aos="fade-up">
                  <div class="project-image">
                    ${p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.title)}">` : '<i class="fas fa-project-diagram"></i>'}
                  </div>
                  <div class="project-content">
                    <h3>${escapeHtml(p.title)}</h3>
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
                    <a href="project-details.html?id=${p.id || ''}" class="read-more-btn">Read More &rarr;</a>
                  </div>
                </div>
              `}).join('')}
            </div>
          </div>
        `;
        container.insertAdjacentHTML('beforeend', sectionHtml);
      });
      
      if (window.AOS) window.AOS.refresh();

    } catch (e) {
      console.error("Error loading projects", e);
    }
  }
  loadProjects();
}

// 4. Avenue Pages (Directors)
if (path.includes('/avenues/') || page.includes('service') || page.includes('development') || page === 'avenue.html') {
  async function loadDirectors() {
    // Wait for DOM if needed
    if (document.readyState === 'loading') {
      await new Promise(r => window.addEventListener('DOMContentLoaded', r));
    }

    const container = document.querySelector('.director-grid');
    if (!container) {
      // console.log("Director grid container not found");
      return;
    }

    // Determine avenue from filename or query param
    let avenueName = '';
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('name')) {
        avenueName = urlParams.get('name');
    } else if (page.includes('community-service')) avenueName = 'Community Service';
    else if (page.includes('club-service')) avenueName = 'Club Service';
    else if (page.includes('professional-development')) avenueName = 'Professional Development';
    else if (page.includes('international-service')) avenueName = 'International Service';
    else if (page.includes('sports-and-recreational-activities')) avenueName = 'Sports and Recreational Activities';
    else if (page.includes('membership-development')) avenueName = 'Membership Development';

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
                  ${d.imageUrl ? `<img src="${escapeHtml(d.imageUrl)}" alt="${escapeHtml(d.name)}" class="director-img">` : ''}
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
      
      if (window.AOS) window.AOS.refresh();

    } catch (e) {
      console.error("Error loading directors", e);
    }
  }
  loadDirectors();

  async function loadAvenueProjects() {
    const container = document.getElementById('avenueProjectsGrid');
    if (!container) return;

    // Determine avenue from filename or query param
    let avenueName = '';
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('name')) {
        avenueName = urlParams.get('name');
    } else if (page.includes('community-service')) avenueName = 'Community Service';
    else if (page.includes('club-service')) avenueName = 'Club Service';
    else if (page.includes('professional-development')) avenueName = 'Professional Development';
    else if (page.includes('international-service')) avenueName = 'International Service';
    else if (page.includes('sports-and-recreational-activities')) avenueName = 'Sports and Recreational Activities';
    else if (page.includes('membership-development')) avenueName = 'Membership Development';

    if (!avenueName) return;

    try {
      const q = query(collection(db, 'projects'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      
      // Filter client-side to handle potential case/whitespace issues
      const projects = snap.docs
        .map(d => d.data())
        .filter(p => p.avenue && p.avenue.trim().toLowerCase() === avenueName.toLowerCase());

      if (projects.length === 0) {
        container.innerHTML = '<p>No projects listed for this avenue yet.</p>';
        return;
      }

      container.innerHTML = '';
      projects.forEach(p => {
        const dateObj = p.date ? new Date(p.date) : (p.createdAt ? new Date(p.createdAt) : new Date());
        const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        const html = `
          <div class="project-card" data-aos="fade-up">
            <div class="project-image">
              ${p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.title)}">` : '<i class="fas fa-project-diagram"></i>'}
            </div>
            <div class="project-content">
              <h3>${escapeHtml(p.title)}</h3>
              <div class="project-stats">
                <span class="project-stat">
                  <i class="fas fa-calendar"></i>
                  ${dateStr}
                </span>
              </div>
              <a href="project-details.html?id=${p.id || ''}" class="read-more-btn">Read More &rarr;</a>
            </div>
          </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
      });
      
      if (window.AOS) window.AOS.refresh();

    } catch (e) {
      console.error("Error loading avenue projects", e);
    }
  }
  loadAvenueProjects();

  async function loadAvenueDetails() {
    // Determine avenue from filename or query param
    let avenueName = '';
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('name')) {
        avenueName = urlParams.get('name');
    } else if (page.includes('community-service')) avenueName = 'Community Service';
    else if (page.includes('club-service')) avenueName = 'Club Service';
    else if (page.includes('professional-development')) avenueName = 'Professional Development';
    else if (page.includes('international-service')) avenueName = 'International Service';
    else if (page.includes('sports-and-recreational-activities')) avenueName = 'Sports and Recreational Activities';
    else if (page.includes('membership-development')) avenueName = 'Membership Development';

    if (!avenueName) return;

    // Update Title
    const titleEl = document.getElementById('avenueTitle');
    if (titleEl) {
        titleEl.textContent = avenueName;
        titleEl.classList.remove('skeleton', 'skeleton-title');
    }
    
    // Update Breadcrumb if exists
    const breadcrumbEl = document.querySelector('.breadcrumb-item.active');
    if (breadcrumbEl) {
        breadcrumbEl.textContent = avenueName;
    }

    try {
      const q = query(collection(db, 'avenues'), where('name', '==', avenueName));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const data = snap.docs[0].data();
        
        // Update Hero Image
        const heroEl = document.getElementById('avenueHero');
        const heroContent = document.querySelector('.avenue-hero-content');
        
        const showContent = () => {
            if (heroContent) heroContent.classList.add('loaded');
            if (resolveAppReady) resolveAppReady();
        };

        if (heroEl && data.imageUrl) {
            const img = new Image();
            img.onload = () => {
                heroEl.style.backgroundImage = `url('${escapeHtml(data.imageUrl)}')`;
                showContent();
            };
            img.onerror = showContent; // Proceed even if image fails
            img.src = data.imageUrl;
        } else {
            if (heroEl) {
                // Default gradient or fallback image if needed
                heroEl.style.background = 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)';
            }
            showContent();
        }

        // Update Icon
        const iconEl = document.getElementById('avenueIcon');
        if (iconEl && data.icon) {
            iconEl.className = escapeHtml(data.icon);
        } else if (iconEl) {
            iconEl.className = 'fas fa-star'; // Default
        }

        // Update Title
        const titleEl = document.getElementById('avenueTitle');
        if (titleEl) {
          titleEl.textContent = data.name;
          titleEl.classList.remove('skeleton', 'skeleton-title');
          document.title = `${data.name} | Rotaract Club of Kandy Hill Capital`;
        }

        // Update Description
        const descEl = document.getElementById('avenueDescription');
        if (descEl && data.description) {
          descEl.textContent = data.description;
          // Remove skeleton children if any (by replacing content)
        }

        // Update Stats
        const s1Label = document.getElementById('stat1Label');
        const s1Value = document.getElementById('stat1Value');
        const s2Label = document.getElementById('stat2Label');
        const s2Value = document.getElementById('stat2Value');

        if (s1Label && data.stat1Label) s1Label.textContent = data.stat1Label;
        if (s1Value && data.stat1Value) {
            s1Value.textContent = data.stat1Value;
            // Remove skeleton class if applied to parent or self
        }
        if (s2Label && data.stat2Label) s2Label.textContent = data.stat2Label;
        if (s2Value && data.stat2Value) {
            s2Value.textContent = data.stat2Value;
        }
      } else {
          // No data found, resolve anyway to remove loader
          if (resolveAppReady) resolveAppReady();
      }
    } catch (e) {
      console.error("Error loading avenue details", e);
      if (resolveAppReady) resolveAppReady();
    }
  }
  loadAvenueDetails();
}

// 5. Dynamic Navbar Avenues
async function loadNavbarAvenues() {
  const dropdown = document.querySelector('.nav-menu .dropdown');
  if (!dropdown) return;

  try {
    // const snap = await getDocs(collection(db, 'avenues'));
    let avenues = [];
    
    // if (!snap.empty) {
    //   avenues = snap.docs.map(d => d.data());
    // }

    // Use static pages only
    const defaults = [
      { name: 'Community Service', link: 'avenue.html?name=Community%20Service' },
      { name: 'Club Service', link: 'avenue.html?name=Club%20Service' },
      { name: 'Professional Development', link: 'avenue.html?name=Professional%20Development' },
      { name: 'International Service', link: 'avenue.html?name=International%20Service' },
      { name: 'Sports and Recreational Activities', link: 'avenue.html?name=Sports%20and%20Recreational%20Activities' },
      { name: 'Membership Development', link: 'avenue.html?name=Membership%20Development' }
    ];

    defaults.forEach(def => {
      // Check for existence using normalized names to avoid duplicates
      const exists = avenues.some(a => 
        a.name && a.name.trim().toLowerCase() === def.name.trim().toLowerCase()
      );
      if (!exists) {
        avenues.push(def);
      }
    });
    
    // Remove any duplicates that might exist in the DB itself
    const uniqueAvenues = [];
    const seenNames = new Set();
    avenues.forEach(a => {
        if (!a.name) return;
        const normalized = a.name.trim().toLowerCase();
        if (!seenNames.has(normalized)) {
            seenNames.add(normalized);
            uniqueAvenues.push(a);
        }
    });
    avenues = uniqueAvenues;

    // Sort avenues to ensure consistent order
    // Order: Club, Community, International, Professional
    const order = ['Club Service', 'Community Service', 'International Service', 'Professional Development', 'Sports and Recreational Activities', 'Membership Development'];
    avenues.sort((a, b) => {
      const idxA = order.indexOf(a.name);
      const idxB = order.indexOf(b.name);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.name.localeCompare(b.name);
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
        // Handle legacy links or new dynamic links
        if (a.link.includes('avenues/')) {
             // Legacy link stored in DB? Convert to dynamic if possible or keep as is (but files are gone)
             // Better to just use the name to construct the new link if it looks like a legacy link
             href = (prefix === 'pages/' ? '' : prefix) + 'avenue.html?name=' + encodeURIComponent(a.name);
        } else {
             href = prefix + a.link;
        }
      } else {
        // Dynamic link for new avenues
        href = `${prefix}avenue.html?name=${encodeURIComponent(a.name)}`;
      }
      
      const li = document.createElement('li');
      li.innerHTML = `<a href="${href}">${escapeHtml(a.name)}</a>`;
      dropdown.appendChild(li);
    });

  } catch (e) {
    console.error("Error loading navbar avenues", e);
  }
}

// 8. Avenues List Page
if (page === 'avenues.html') {
  async function loadAvenuesList() {
    const container = document.querySelector('.avenues-grid');
    if (!container) return;

    // Add Skeleton Loading
    container.innerHTML = '';
    for(let i=0; i<4; i++) {
        container.innerHTML += `
        <div class="avenue-item skeleton-item" style="height: 250px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <div class="skeleton skeleton-block" style="width: 70px; height: 70px; border-radius: 50%; margin-bottom: 1.2rem;"></div>
            <div class="skeleton skeleton-title" style="width: 60%; height: 1.5rem; margin-bottom: 0.7rem;"></div>
            <div class="skeleton skeleton-text" style="width: 80%;"></div>
            <div class="skeleton skeleton-text" style="width: 60%;"></div>
        </div>`;
    }

    try {
      const snap = await getDocs(collection(db, 'avenues'));
      let avenues = [];
      if (!snap.empty) {
        avenues = snap.docs.map(d => d.data());
      }

      // Defaults if empty
      const defaults = [
        { name: 'Club Service', description: 'Fostering fellowship among members and strengthening the functioning of the club.', icon: 'fas fa-users' },
        { name: 'Community Service', description: 'Addressing the needs of the local community through impactful projects and initiatives.', icon: 'fas fa-hands-helping' },
        { name: 'International Service', description: 'Promoting international understanding and goodwill through global projects and partnerships.', icon: 'fas fa-globe' },
        { name: 'Professional Development', description: 'Enhancing the skills and leadership abilities of members for personal and professional growth.', icon: 'fas fa-briefcase' },
        { name: 'Sports and Recreational Activities', description: 'Promoting physical well-being and team spirit through sports and recreational events.', icon: 'fas fa-running' },
        { name: 'Membership Development', description: 'Focusing on the recruitment and retention of members to ensure the club\'s growth and sustainability.', icon: 'fas fa-user-plus' }
      ];

      // Merge defaults if not present
      defaults.forEach(def => {
        const exists = avenues.some(a => 
            a.name && a.name.trim().toLowerCase() === def.name.trim().toLowerCase()
        );
        if (!exists) {
          avenues.push(def);
        }
      });

      // Remove any duplicates that might exist in the DB itself
      const uniqueAvenues = [];
      const seenNames = new Set();
      avenues.forEach(a => {
          if (!a.name) return;
          const normalized = a.name.trim().toLowerCase();
          if (!seenNames.has(normalized)) {
              seenNames.add(normalized);
              uniqueAvenues.push(a);
          }
      });
      avenues = uniqueAvenues;

      // Sort
      const order = ['Club Service', 'Community Service', 'International Service', 'Professional Development', 'Sports and Recreational Activities', 'Membership Development'];
      avenues.sort((a, b) => {
         const nameA = a.name ? a.name.trim() : '';
         const nameB = b.name ? b.name.trim() : '';
         let idxA = order.indexOf(nameA);
         let idxB = order.indexOf(nameB);
         if (idxA === -1) idxA = 99;
         if (idxB === -1) idxB = 99;
         return idxA - idxB;
      });

      container.innerHTML = '';
      let delay = 0;
      avenues.forEach(a => {
        const link = `avenue.html?name=${encodeURIComponent(a.name)}`;
        const icon = a.icon || 'fas fa-star';
        
        const html = `
          <div class="avenue-item" data-aos="fade-up" data-aos-delay="${delay}">
            <div class="avenue-icon"><i class="${escapeHtml(icon)}"></i></div>
            <div class="avenue-label">
              <a href="${link}">${escapeHtml(a.name)}</a>
            </div>
            <p>${escapeHtml(a.description || '')}</p>
          </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
        delay += 100;
      });

    } catch (e) {
      console.error("Error loading avenues list", e);
      container.innerHTML = '<p>Error loading avenues.</p>';
    }
  }
  loadAvenuesList();
}

// 6. Project Details Page
if (page === 'project-details.html') {
  async function loadProjectDetails() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const container = document.getElementById('detailContainer');

    if (!id) {
      container.innerHTML = '<p>Project not found.</p><a href="projects.html" class="back-btn">&larr; Back to Projects</a>';
      return;
    }

    try {
      const docRef = doc(db, 'projects', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const p = docSnap.data();
        const dateObj = p.date ? new Date(p.date) : (p.createdAt ? new Date(p.createdAt) : new Date());
        const dateStr = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        container.innerHTML = `
          <div class="detail-header" data-aos="fade-up">
            <h1 class="detail-title">${escapeHtml(p.title)}</h1>
            <div class="detail-meta">
              <span><i class="fas fa-tag"></i> ${escapeHtml(p.avenue)}</span>
              <span><i class="fas fa-calendar"></i> ${dateStr}</span>
              ${p.chair ? `<span><i class="fas fa-user"></i> ${escapeHtml(p.chair)}</span>` : ''}
              ${p.location ? `<span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(p.location)}</span>` : ''}
              ${p.beneficiaries ? `<span><i class="fas fa-users"></i> ${escapeHtml(p.beneficiaries)}</span>` : ''}
            </div>
          </div>
          
          ${p.imageUrl ? `
          <div data-aos="fade-up" data-aos-delay="100">
            <img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.title)}" class="detail-image">
          </div>` : ''}

          <div class="detail-content" data-aos="fade-up" data-aos-delay="200">
            ${p.description ? `<div class="rich-text">${DOMPurify.sanitize(p.description)}</div>` : ''}
            ${p.content ? `<div class="rich-text">${DOMPurify.sanitize(p.content)}</div>` : ''} 
          </div>

          <div style="text-align: center; margin-top: 3rem;">
            <a href="projects.html" class="back-btn">&larr; Back to Projects</a>
          </div>
        `;
      } else {
        container.innerHTML = '<p>Project not found.</p><a href="projects.html" class="back-btn">&larr; Back to Projects</a>';
      }
    } catch (e) {
      console.error("Error loading project details", e);
      container.innerHTML = '<p>Error loading project details.</p><a href="projects.html" class="back-btn">&larr; Back to Projects</a>';
    }
  }
  loadProjectDetails();
}

// 7. Blog Details Page
if (page === 'blog-details.html') {
  async function loadBlogDetails() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const container = document.getElementById('detailContainer');

    if (!id) {
      container.innerHTML = '<p>Post not found.</p><a href="blog.html" class="back-btn">&larr; Back to Blog</a>';
      return;
    }

    try {
      const docRef = doc(db, 'posts', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const p = docSnap.data();
        const dateObj = p.createdAt ? new Date(p.createdAt) : new Date();
        const dateStr = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        container.innerHTML = `
          <div class="detail-header" data-aos="fade-up">
            <h1 class="detail-title">${escapeHtml(p.title)}</h1>
            <div class="detail-meta">
              <span><i class="fas fa-calendar"></i> ${dateStr}</span>
              ${p.author ? `<span><i class="fas fa-user"></i> ${escapeHtml(p.author)}</span>` : ''}
            </div>
          </div>
          
          ${p.imageUrl ? `
          <div data-aos="fade-up" data-aos-delay="100">
            <img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.title)}" class="detail-image">
          </div>` : ''}

          <div class="detail-content" data-aos="fade-up" data-aos-delay="200">
            ${p.content ? `<div class="rich-text">${DOMPurify.sanitize(p.content)}</div>` : `<p>${escapeHtml(p.excerpt || '')}</p>`}
          </div>

          <div style="text-align: center; margin-top: 3rem;">
            <a href="blog.html" class="back-btn">&larr; Back to Blog</a>
          </div>
        `;
      } else {
        container.innerHTML = '<p>Post not found.</p><a href="blog.html" class="back-btn">&larr; Back to Blog</a>';
      }
    } catch (e) {
      console.error("Error loading blog details", e);
      container.innerHTML = '<p>Error loading blog details.</p><a href="blog.html" class="back-btn">&larr; Back to Blog</a>';
    }
  }
  loadBlogDetails();
}

// 9. Avenues List Page
if (page === 'avenues.html' && !path.includes('/admin/')) {
  async function loadAvenuesList() {
    const container = document.querySelector('.avenues-grid');
    if (!container) return;

    try {
      // const snap = await getDocs(collection(db, 'avenues'));
      let avenues = [];
      // if (!snap.empty) {
      //   avenues = snap.docs.map(d => d.data());
      // }

      // Use static pages only
      const defaults = [
        { name: 'Community Service', link: 'avenues/community-service.html', description: 'Addressing the needs of the local community through impactful projects and initiatives.', icon: 'fa-hands-helping' },
        { name: 'Club Service', link: 'avenues/club-service.html', description: 'Fostering fellowship among members and strengthening the functioning of the club.', icon: 'fa-users' },
        { name: 'Professional Development', link: 'avenues/professional-development.html', description: 'Enhancing the skills and leadership abilities of members for personal and professional growth.', icon: 'fa-briefcase' },
        { name: 'International Service', link: 'avenues/international-service.html', description: 'Promoting international understanding and goodwill through global projects and partnerships.', icon: 'fa-globe' }
      ];

      avenues = defaults;

      // Sort avenues
      const order = ['Club Service', 'Community Service', 'International Service', 'Professional Development'];
      avenues.sort((a, b) => {
        const idxA = order.indexOf(a.name);
        const idxB = order.indexOf(b.name);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.name.localeCompare(b.name);
      });

      container.innerHTML = '';
      avenues.forEach((a, index) => {
        let href = '#';
        if (a.link) {
           href = a.link;
        } else {
           href = `avenue.html?name=${encodeURIComponent(a.name)}`;
        }

        // Default icon if not present
        const iconClass = a.icon || 'fa-star';

        const html = `
          <div class="avenue-item" data-aos="fade-up" data-aos-delay="${index * 100}">
            <div class="avenue-icon"><i class="fas ${iconClass}"></i></div>
            <div class="avenue-label">
              <a href="${href}">${escapeHtml(a.name)}</a>
            </div>
            <p>
              ${escapeHtml(a.description || '')}
            </p>
          </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
      });

    } catch (e) {
      console.error("Error loading avenues list", e);
    }
  }
  loadAvenuesList();
}

loadNavbarAvenues();

document.addEventListener('DOMContentLoaded', loadNavbarAvenues);


// 8. Contact Form Handling
const contactForm = document.querySelector('.contact-form form');
if (contactForm) {
  console.log("Contact form found, attaching listener");
  contactForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    console.log("Form submitted");
    
    const nameInput = this.querySelector('input[type="text"]');
    const emailInput = this.querySelector('input[type="email"]');
    const messageInput = this.querySelector('textarea');
    const submitBtn = this.querySelector('button[type="submit"]');
    
    if (!nameInput || !emailInput || !messageInput) {
        console.error("Form inputs not found");
        return;
    }
    
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const message = messageInput.value.trim();
    
    if (!name || !email || !message) {
      if (window.showNotification) window.showNotification('Please fill in all fields.', 'error');
      else alert('Please fill in all fields.');
      return;
    }
    
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;
    
    try {
      await addDoc(collection(db, 'messages'), {
        name,
        email,
        message,
        timestamp: new Date(),
        read: false
      });
      
      if (window.showNotification) window.showNotification('Message sent successfully!', 'success');
      else alert('Message sent successfully!');
      
      this.reset();
    } catch (e) {
      console.error('Error sending message', e);
      if (window.showNotification) window.showNotification('Error sending message. Please try again.', 'error');
      else alert('Error sending message. Please try again.');
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
}

