import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const auth = getAuth(app);
const db = getFirestore(app);

const page = window.location.pathname.split('/').pop();

// Auth State Observer
onAuthStateChanged(auth, (user) => {
  if (user) {
    if (page === 'index.html' || page === '') {
      window.location.href = 'dashboard.html';
    }
  } else {
    if (page !== 'index.html' && page !== '') {
      window.location.href = 'index.html';
    }
  }
});

// Logout
document.addEventListener('click', async (e) => {
  if (e.target && e.target.id === 'logoutBtn') {
    e.preventDefault();
    try {
      await signOut(auth);
      window.location.href = 'index.html';
    } catch (error) {
      console.error("Logout failed", error);
    }
  }
});

// Login Page Logic
if (page === 'index.html' || page === '') {
  const form = document.getElementById('loginForm');
  const err = document.getElementById('loginError');
  const toggle = document.getElementById('togglePassword');
  const passInput = document.getElementById('password');

  if (toggle && passInput) {
    toggle.addEventListener('click', () => {
      if (passInput.type === 'password') {
        passInput.type = 'text';
        toggle.textContent = 'Hide';
      } else {
        passInput.type = 'password';
        toggle.textContent = 'Show';
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      try {
        await signInWithEmailAndPassword(auth, email, password);
        // Redirect handled by onAuthStateChanged
      } catch (error) {
        if (err) {
          err.style.display = 'block';
          err.textContent = 'Invalid email or password.';
        }
        console.error("Login error", error);
      }
    });
  }
}

// Generic List Renderer
function renderList(container, items, renderItem) {
  container.innerHTML = '';
  if (!items || items.length === 0) {
    container.innerHTML = '<p class="muted">No items yet.</p>';
    return;
  }
  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = renderItem(item);
    container.appendChild(el);
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

// Dashboard Logic
if (page === 'dashboard.html') {
  async function loadCounts() {
    const collections = ['posts', 'avenues', 'directors', 'projects'];
    for (const colName of collections) {
      try {
        const snap = await getDocs(collection(db, colName));
        const el = document.getElementById(`count${colName.charAt(0).toUpperCase() + colName.slice(1)}`);
        if (el) el.textContent = snap.size;
      } catch (e) {
        console.error(`Error loading count for ${colName}`, e);
      }
    }
  }

  async function seedAvenues() {
    try {
      const snap = await getDocs(collection(db, 'avenues'));
      if (snap.empty) {
        const defaults = [
          { name: 'Community Service', link: 'avenues/community-service.html' },
          { name: 'Club Service', link: 'avenues/club-service.html' },
          { name: 'Professional Development', link: 'avenues/professional-development.html' },
          { name: 'International Service', link: 'avenues/international-service.html' }
        ];
        for (const a of defaults) {
          await addDoc(collection(db, 'avenues'), a);
        }
        console.log('Seeded avenues');
        loadCounts(); // reload counts
      }
    } catch (e) {
      console.error("Error seeding avenues", e);
    }
  }

  loadCounts();
  seedAvenues();
}

// Blog Logic
if (page === 'blog.html') {
  const list = document.getElementById('postsList');
  const form = document.getElementById('postForm');
  const titleInput = document.getElementById('postTitle');
  const excerptInput = document.getElementById('postExcerpt');
  const imageInput = document.getElementById('postImage'); // New input
  const contentInput = document.getElementById('postContent'); // New input

  let editId = null;

  async function loadPosts() {
    try {
      const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      renderList(list, posts, (p) => `
        <div>
          <strong>${escapeHtml(p.title)}</strong>
          <div class="meta">${escapeHtml(p.excerpt || '')}</div>
          ${p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}" style="max-height:50px; margin-top:5px;">` : ''}
        </div>
        <div>
          <button class="btn" data-action="edit" data-id="${p.id}">Edit</button>
          <button class="btn" data-action="delete" data-id="${p.id}">Delete</button>
        </div>
      `);
    } catch (e) {
      console.error("Error loading posts", e);
    }
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        title: titleInput.value,
        excerpt: excerptInput.value,
        imageUrl: imageInput ? imageInput.value : '',
        content: contentInput ? contentInput.value : '',
        createdAt: Date.now()
      };

      try {
        if (editId) {
          await updateDoc(doc(db, 'posts', editId), data);
          editId = null;
          form.querySelector('button[type="submit"]').textContent = 'Add Post';
        } else {
          await addDoc(collection(db, 'posts'), data);
        }
        form.reset();
        loadPosts();
      } catch (err) {
        console.error("Error saving post", err);
        alert("Error saving post: " + err.message);
      }
    });
  }

  if (list) {
    list.addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const id = btn.dataset.id;
      const action = btn.dataset.action;

      if (action === 'delete') {
        if (confirm('Delete this post?')) {
          await deleteDoc(doc(db, 'posts', id));
          loadPosts();
        }
      } else if (action === 'edit') {
        const snap = await getDocs(collection(db, 'posts'));
        const post = snap.docs.find(d => d.id === id).data();
        
        titleInput.value = post.title;
        excerptInput.value = post.excerpt;
        if(imageInput) imageInput.value = post.imageUrl || '';
        if(contentInput) contentInput.value = post.content || '';
        
        editId = id;
        form.querySelector('button[type="submit"]').textContent = 'Update Post';
      }
    });
  }

  loadPosts();
}

// Projects Logic
if (page === 'projects.html') {
  const list = document.getElementById('projectsList');
  const form = document.getElementById('projectForm');
  const titleInput = document.getElementById('projectTitle');
  const avenueInput = document.getElementById('projectAvenue');
  const imageInput = document.getElementById('projectImage'); // New input
  const descInput = document.getElementById('projectDescription'); // New input

  let editId = null;

  async function loadProjects() {
    try {
      const snap = await getDocs(collection(db, 'projects'));
      const projects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      renderList(list, projects, (p) => `
        <div>
          <strong>${escapeHtml(p.title)}</strong>
          <div class="meta">${escapeHtml(p.avenue || '')}</div>
          ${p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}" style="max-height:50px; margin-top:5px;">` : ''}
        </div>
        <div>
          <button class="btn" data-action="edit" data-id="${p.id}">Edit</button>
          <button class="btn" data-action="delete" data-id="${p.id}">Delete</button>
        </div>
      `);
    } catch (e) {
      console.error("Error loading projects", e);
    }
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        title: titleInput.value,
        avenue: avenueInput.value,
        imageUrl: imageInput ? imageInput.value : '',
        description: descInput ? descInput.value : '',
        createdAt: Date.now()
      };

      try {
        if (editId) {
          await updateDoc(doc(db, 'projects', editId), data);
          editId = null;
          form.querySelector('button[type="submit"]').textContent = 'Add Project';
        } else {
          await addDoc(collection(db, 'projects'), data);
        }
        form.reset();
        loadProjects();
      } catch (err) {
        console.error("Error saving project", err);
        alert("Error saving project: " + err.message);
      }
    });
  }

  if (list) {
    list.addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const id = btn.dataset.id;
      const action = btn.dataset.action;

      if (action === 'delete') {
        if (confirm('Delete this project?')) {
          await deleteDoc(doc(db, 'projects', id));
          loadProjects();
        }
      } else if (action === 'edit') {
        const snap = await getDocs(collection(db, 'projects'));
        const project = snap.docs.find(d => d.id === id).data();
        
        titleInput.value = project.title;
        avenueInput.value = project.avenue;
        if(imageInput) imageInput.value = project.imageUrl || '';
        if(descInput) descInput.value = project.description || '';
        
        editId = id;
        form.querySelector('button[type="submit"]').textContent = 'Update Project';
      }
    });
  }

  loadProjects();
}

// Avenues Logic
if (page === 'avenues.html') {
  const list = document.getElementById('avenuesList');
  const form = document.getElementById('avenueForm');
  const nameInput = document.getElementById('avenueName');

  let editId = null;

  async function loadAvenues() {
    try {
      const snap = await getDocs(collection(db, 'avenues'));
      const avenues = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      renderList(list, avenues, (a) => `
        <div><strong>${escapeHtml(a.name)}</strong></div>
        <div>
          <button class="btn" data-action="edit" data-id="${a.id}">Edit</button>
          <button class="btn" data-action="delete" data-id="${a.id}">Delete</button>
        </div>
      `);
    } catch (e) {
      console.error("Error loading avenues", e);
    }
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = { name: nameInput.value };

      try {
        if (editId) {
          await updateDoc(doc(db, 'avenues', editId), data);
          editId = null;
          form.querySelector('button[type="submit"]').textContent = 'Add Avenue';
        } else {
          await addDoc(collection(db, 'avenues'), data);
        }
        form.reset();
        loadAvenues();
      } catch (err) {
        console.error("Error saving avenue", err);
      }
    });
  }

  if (list) {
    list.addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const id = btn.dataset.id;
      const action = btn.dataset.action;

      if (action === 'delete') {
        if (confirm('Delete this avenue?')) {
          await deleteDoc(doc(db, 'avenues', id));
          loadAvenues();
        }
      } else if (action === 'edit') {
        const snap = await getDocs(collection(db, 'avenues'));
        const avenue = snap.docs.find(d => d.id === id).data();
        nameInput.value = avenue.name;
        editId = id;
        form.querySelector('button[type="submit"]').textContent = 'Update Avenue';
      }
    });
  }
  if(list) loadAvenues();
}

// Directors Logic
if (page === 'directors.html') {
  const list = document.getElementById('directorsList');
  const form = document.getElementById('directorForm');
  const nameInput = document.getElementById('directorName');
  const avenueInput = document.getElementById('directorAvenue');
  const imageInput = document.getElementById('directorImage'); // New input

  let editId = null;

  async function loadDirectors() {
    try {
      const snap = await getDocs(collection(db, 'directors'));
      const directors = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      renderList(list, directors, (d) => `
        <div>
          <strong>${escapeHtml(d.name)}</strong>
          <div class="meta">${escapeHtml(d.avenue || '')}</div>
          ${d.imageUrl ? `<img src="${escapeHtml(d.imageUrl)}" style="max-height:50px; margin-top:5px;">` : ''}
        </div>
        <div>
          <button class="btn" data-action="edit" data-id="${d.id}">Edit</button>
          <button class="btn" data-action="delete" data-id="${d.id}">Delete</button>
        </div>
      `);
    } catch (e) {
      console.error("Error loading directors", e);
    }
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        name: nameInput.value,
        avenue: avenueInput.value,
        imageUrl: imageInput ? imageInput.value : ''
      };

      try {
        if (editId) {
          await updateDoc(doc(db, 'directors', editId), data);
          editId = null;
          form.querySelector('button[type="submit"]').textContent = 'Add Director';
        } else {
          await addDoc(collection(db, 'directors'), data);
        }
        form.reset();
        loadDirectors();
      } catch (err) {
        console.error("Error saving director", err);
      }
    });
  }

  if (list) {
    list.addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const id = btn.dataset.id;
      const action = btn.dataset.action;

      if (action === 'delete') {
        if (confirm('Delete this director?')) {
          await deleteDoc(doc(db, 'directors', id));
          loadDirectors();
        }
      } else if (action === 'edit') {
        const snap = await getDocs(collection(db, 'directors'));
        const director = snap.docs.find(d => d.id === id).data();
        nameInput.value = director.name;
        avenueInput.value = director.avenue;
        if(imageInput) imageInput.value = director.imageUrl || '';
        editId = id;
        form.querySelector('button[type="submit"]').textContent = 'Update Director';
      }
    });
  }
  if(list) loadDirectors();
}

// Profile Logic
if (page === 'profile.html') {
  const nameInput = document.getElementById('adminName');
  const emailInput = document.getElementById('adminEmail');
  
  // Stats inputs
  const statMembers = document.getElementById('statMembers');
  const statProjects = document.getElementById('statProjects');
  const statYears = document.getElementById('statYears');
  const statHours = document.getElementById('statHours');

  async function loadProfileAndStats() {
    try {
      // Load Profile
      const profileSnap = await getDocs(query(collection(db, 'settings'), orderBy('type'))); // simple query
      // Actually let's just fetch all settings and filter in memory since it's small
      const settingsSnap = await getDocs(collection(db, 'settings'));
      
      const profileDoc = settingsSnap.docs.find(d => d.data().type === 'profile');
      if (profileDoc) {
        const data = profileDoc.data();
        nameInput.value = data.name || '';
        emailInput.value = data.email || '';
        nameInput.dataset.id = profileDoc.id;
      }

      const statsDoc = settingsSnap.docs.find(d => d.data().type === 'homeStats');
      if (statsDoc) {
        const data = statsDoc.data();
        if(statMembers) statMembers.value = data.members || '';
        if(statProjects) statProjects.value = data.projects || '';
        if(statYears) statYears.value = data.years || '';
        if(statHours) statHours.value = data.hours || '';
        if(statMembers) statMembers.dataset.id = statsDoc.id;
      }
    } catch (e) {
      console.error("Error loading settings", e);
    }
  }

  document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const id = nameInput.dataset.id;
      const data = { type: 'profile', name: nameInput.value, email: emailInput.value };
      
      if (id) {
        await updateDoc(doc(db, 'settings', id), data);
      } else {
        const ref = await addDoc(collection(db, 'settings'), data);
        nameInput.dataset.id = ref.id;
      }
      alert('Profile saved!');
    } catch (err) {
      console.error("Error saving profile", err);
      alert("Error saving profile");
    }
  });

  const statsForm = document.getElementById('statsForm');
  if (statsForm) {
    statsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const id = statMembers.dataset.id;
        const data = { 
          type: 'homeStats', 
          members: statMembers.value,
          projects: statProjects.value,
          years: statYears.value,
          hours: statHours.value
        };
        
        if (id) {
          await updateDoc(doc(db, 'settings', id), data);
        } else {
          const ref = await addDoc(collection(db, 'settings'), data);
          statMembers.dataset.id = ref.id;
        }
        alert('Stats saved!');
      } catch (err) {
        console.error("Error saving stats", err);
        alert("Error saving stats");
      }
    });
  }
  
  loadProfileAndStats();
}

// Analytics Logic
if (page === 'analytics.html') {
  async function loadAnalytics() {
    try {
      const postsSnap = await getDocs(collection(db, 'posts'));
      const avenuesSnap = await getDocs(collection(db, 'avenues'));
      const directorsSnap = await getDocs(collection(db, 'directors'));
      const projectsSnap = await getDocs(collection(db, 'projects'));

      const postsCount = postsSnap.size;
      const avenuesCount = avenuesSnap.size;
      const directorsCount = directorsSnap.size;
      const projectsCount = projectsSnap.size;

      // counts chart
      const countsCtx = document.getElementById('countsChart').getContext('2d');
      new Chart(countsCtx, {
        type: 'bar',
        data: {
          labels: ['Posts','Avenues','Directors','Projects'],
          datasets:[{label:'Counts',data:[postsCount,avenuesCount,directorsCount,projectsCount],backgroundColor:['#D22163','#ff6bd5','#f9a8d4','#fbcfe8']}]
        }, options:{responsive:true}
      });

      // distribution dummy chart (avenues distribution)
      // For real distribution, we'd need to count projects per avenue.
      // Let's try to do that if we have time, but for now random is fine as per original code, 
      // or better: count projects per avenue.
      
      const projects = projectsSnap.docs.map(d => d.data());
      const avenues = avenuesSnap.docs.map(d => d.data());
      
      const avenueCounts = avenues.map(a => {
        return projects.filter(p => p.avenue === a.name).length;
      });

      const distCtx = document.getElementById('distributionChart').getContext('2d');
      new Chart(distCtx, { 
        type:'pie', 
        data:{ 
          labels: avenues.map(a=>a.name), 
          datasets:[{
            data: avenueCounts, 
            backgroundColor: avenues.map((_,i)=>['#D22163','#ff6bd5','#f9a8d4','#fbcfe8'][i%4])
          }] 
        }, 
        options:{responsive:true} 
      });

    } catch (e) {
      console.error("Error loading analytics", e);
    }
  }
  loadAnalytics();
}

// Admin mobile hamburger/menu behavior (applies across admin pages)
try{
  const adminHamburger = document.getElementById('adminHamburger');
  const adminHeader = document.querySelector('.admin-header');
  const adminNavLinks = adminHeader ? adminHeader.querySelectorAll('nav a') : [];
  if(adminHamburger){
    adminHamburger.addEventListener('click', function(e){
      const open = document.body.classList.toggle('admin-nav-open');
      adminHamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
      // animate hamburger into X
      adminHamburger.classList.toggle('open', open);
    });

    // Close menu when clicking outside header
    document.addEventListener('click', function(e){ if(!e.target.closest('.admin-header') && document.body.classList.contains('admin-nav-open')){ document.body.classList.remove('admin-nav-open'); adminHamburger.setAttribute('aria-expanded','false'); } });

    // Close when pressing Escape
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && document.body.classList.contains('admin-nav-open')){ document.body.classList.remove('admin-nav-open'); adminHamburger.setAttribute('aria-expanded','false'); } });

    // Close when a nav link is clicked (mobile)
    Array.from(adminNavLinks).forEach(a=> a.addEventListener('click', function(){ if(window.innerWidth <= 900){ document.body.classList.remove('admin-nav-open'); adminHamburger.setAttribute('aria-expanded','false'); } }));
  }
}catch(e){ /* no-op if header missing */ }
