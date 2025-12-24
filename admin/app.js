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

// --- UI Helpers ---

function showToast(message, type = 'success') {
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
}

function resetForm(form, submitBtn, defaultText = 'Add') {
  form.reset();
  submitBtn.textContent = defaultText;
  const cancelBtn = form.querySelector('#cancelEdit');
  if (cancelBtn) cancelBtn.style.display = 'none';
  return null; // to reset editId
}

function setupCancelButton(form, submitBtn, defaultText, resetCallback) {
  const cancelBtn = form.querySelector('#cancelEdit');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      resetCallback();
      resetForm(form, submitBtn, defaultText);
    });
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderList(container, items, renderContentFn) {
  container.innerHTML = '';
  if (!items || items.length === 0) {
    container.innerHTML = '<p class="muted" style="text-align:center; padding:20px;">No items found.</p>';
    return;
  }
  items.forEach((item, index) => {
    const el = document.createElement('div');
    el.className = 'item';
    el.style.animationDelay = `${index * 0.05}s`; // Staggered animation
    
    // Common structure: Image (optional) + Content + Actions
    let imageHtml = '';
    if (item.imageUrl) {
      imageHtml = `<img src="${escapeHtml(item.imageUrl)}" alt="Image" onerror="this.style.display='none'">`;
    } else if (item.image) { // handle inconsistent naming if any
      imageHtml = `<img src="${escapeHtml(item.image)}" alt="Image" onerror="this.style.display='none'">`;
    }

    el.innerHTML = `
      <div class="item-flex" style="width:100%">
        ${imageHtml}
        <div class="content">
          ${renderContentFn(item)}
        </div>
        <div class="actions">
          <button class="btn ghost" data-action="edit" data-id="${item.id}">Edit</button>
          <button class="btn danger" data-action="delete" data-id="${item.id}">Delete</button>
        </div>
      </div>
    `;
    container.appendChild(el);
  });
}

async function populateAvenueSelect(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  try {
    const snap = await getDocs(collection(db, 'avenues'));
    const avenues = snap.docs.map(d => d.data().name).sort();
    
    // Keep the first option (placeholder)
    const firstOption = select.options[0];
    select.innerHTML = '';
    select.appendChild(firstOption);

    avenues.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
  } catch (e) {
    console.error("Error populating avenues", e);
  }
}

// --- Auth Logic ---

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

// --- Dashboard Logic ---

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
        loadCounts();
      }
    } catch (e) {
      console.error("Error seeding avenues", e);
    }
  }

  loadCounts();
  seedAvenues();
}

// --- Blog Logic ---

if (page === 'blog.html') {
  const list = document.getElementById('postsList');
  const form = document.getElementById('postForm');
  const titleInput = document.getElementById('postTitle');
  const excerptInput = document.getElementById('postExcerpt');
  const imageInput = document.getElementById('postImage');
  const contentInput = document.getElementById('postContent');
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

  let editId = null;

  async function loadPosts() {
    try {
      const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      renderList(list, posts, (p) => `
        <h4>${escapeHtml(p.title)}</h4>
        <div class="meta">${escapeHtml(p.excerpt || '')}</div>
      `);
    } catch (e) {
      console.error("Error loading posts", e);
      showToast("Error loading posts", "error");
    }
  }

  if (form) {
    setupCancelButton(form, submitBtn, 'Add Post', () => { editId = null; });

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
          showToast("Post updated successfully");
        } else {
          await addDoc(collection(db, 'posts'), data);
          showToast("Post created successfully");
        }
        editId = resetForm(form, submitBtn, 'Add Post');
        loadPosts();
      } catch (err) {
        console.error("Error saving post", err);
        showToast("Error saving post: " + err.message, "error");
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
          showToast("Post deleted");
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
        submitBtn.textContent = 'Update Post';
        form.querySelector('#cancelEdit').style.display = 'inline-block';
        form.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  loadPosts();
}

// --- Projects Logic ---

if (page === 'projects.html') {
  const list = document.getElementById('projectsList');
  const form = document.getElementById('projectForm');
  const titleInput = document.getElementById('projectTitle');
  const avenueInput = document.getElementById('projectAvenue');
  const imageInput = document.getElementById('projectImage');
  const descInput = document.getElementById('projectDescription');
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

  let editId = null;

  populateAvenueSelect('projectAvenue');

  async function loadProjects() {
    try {
      const snap = await getDocs(collection(db, 'projects'));
      const projects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      renderList(list, projects, (p) => `
        <h4>${escapeHtml(p.title)}</h4>
        <div class="meta">${escapeHtml(p.avenue || 'No Avenue')}</div>
      `);
    } catch (e) {
      console.error("Error loading projects", e);
      showToast("Error loading projects", "error");
    }
  }

  if (form) {
    setupCancelButton(form, submitBtn, 'Add Project', () => { editId = null; });

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
          showToast("Project updated");
        } else {
          await addDoc(collection(db, 'projects'), data);
          showToast("Project added");
        }
        editId = resetForm(form, submitBtn, 'Add Project');
        loadProjects();
      } catch (err) {
        console.error("Error saving project", err);
        showToast("Error saving project", "error");
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
          showToast("Project deleted");
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
        submitBtn.textContent = 'Update Project';
        form.querySelector('#cancelEdit').style.display = 'inline-block';
        form.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  loadProjects();
}

// --- Avenues Logic ---

if (page === 'avenues.html') {
  const list = document.getElementById('avenuesList');
  const form = document.getElementById('avenueForm');
  const nameInput = document.getElementById('avenueName');
  const imageInput = document.getElementById('avenueImage');
  const descInput = document.getElementById('avenueDescription');
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

  let editId = null;

  async function loadAvenues() {
    try {
      const snap = await getDocs(collection(db, 'avenues'));
      const avenues = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      renderList(list, avenues, (a) => `
        <h4>${escapeHtml(a.name)}</h4>
        <div class="meta">${escapeHtml(a.description || '')}</div>
      `);
    } catch (e) {
      console.error("Error loading avenues", e);
      showToast("Error loading avenues", "error");
    }
  }

  if (form) {
    setupCancelButton(form, submitBtn, 'Add Avenue', () => { editId = null; });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = { 
        name: nameInput.value,
        imageUrl: imageInput ? imageInput.value : '',
        description: descInput ? descInput.value : ''
      };

      try {
        if (editId) {
          await updateDoc(doc(db, 'avenues', editId), data);
          showToast("Avenue updated");
        } else {
          await addDoc(collection(db, 'avenues'), data);
          showToast("Avenue added");
        }
        editId = resetForm(form, submitBtn, 'Add Avenue');
        loadAvenues();
      } catch (err) {
        console.error("Error saving avenue", err);
        showToast("Error saving avenue", "error");
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
          showToast("Avenue deleted");
          loadAvenues();
        }
      } else if (action === 'edit') {
        const snap = await getDocs(collection(db, 'avenues'));
        const avenue = snap.docs.find(d => d.id === id).data();
        nameInput.value = avenue.name;
        if(imageInput) imageInput.value = avenue.imageUrl || '';
        if(descInput) descInput.value = avenue.description || '';
        
        editId = id;
        submitBtn.textContent = 'Update Avenue';
        form.querySelector('#cancelEdit').style.display = 'inline-block';
        form.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
  if(list) loadAvenues();
}

// --- Directors Logic ---

if (page === 'directors.html') {
  const list = document.getElementById('directorsList');
  const form = document.getElementById('directorForm');
  const nameInput = document.getElementById('directorName');
  const avenueInput = document.getElementById('directorAvenue');
  const imageInput = document.getElementById('directorImage');
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

  let editId = null;

  populateAvenueSelect('directorAvenue');

  async function loadDirectors() {
    try {
      const snap = await getDocs(collection(db, 'directors'));
      const directors = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      renderList(list, directors, (d) => `
        <h4>${escapeHtml(d.name)}</h4>
        <div class="meta">${escapeHtml(d.avenue || '')}</div>
      `);
    } catch (e) {
      console.error("Error loading directors", e);
      showToast("Error loading directors", "error");
    }
  }

  if (form) {
    setupCancelButton(form, submitBtn, 'Add Director', () => { editId = null; });

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
          showToast("Director updated");
        } else {
          await addDoc(collection(db, 'directors'), data);
          showToast("Director added");
        }
        editId = resetForm(form, submitBtn, 'Add Director');
        loadDirectors();
      } catch (err) {
        console.error("Error saving director", err);
        showToast("Error saving director", "error");
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
          showToast("Director deleted");
          loadDirectors();
        }
      } else if (action === 'edit') {
        const snap = await getDocs(collection(db, 'directors'));
        const director = snap.docs.find(d => d.id === id).data();
        nameInput.value = director.name;
        avenueInput.value = director.avenue;
        if(imageInput) imageInput.value = director.imageUrl || '';
        editId = id;
        submitBtn.textContent = 'Update Director';
        form.querySelector('#cancelEdit').style.display = 'inline-block';
        form.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
  if(list) loadDirectors();
}

// --- Profile Logic ---

if (page === 'profile.html') {
  const nameInput = document.getElementById('adminName');
  const emailInput = document.getElementById('adminEmail');
  
  const statMembers = document.getElementById('statMembers');
  const statProjects = document.getElementById('statProjects');
  const statYears = document.getElementById('statYears');
  const statHours = document.getElementById('statHours');

  async function loadProfileAndStats() {
    try {
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
      showToast("Error loading settings", "error");
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
      showToast('Profile saved!');
    } catch (err) {
      console.error("Error saving profile", err);
      showToast("Error saving profile", "error");
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
        showToast('Stats saved!');
      } catch (err) {
        console.error("Error saving stats", err);
        showToast("Error saving stats", "error");
      }
    });
  }
  
  loadProfileAndStats();
}

// --- Analytics Logic ---

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

      const countsCtx = document.getElementById('countsChart').getContext('2d');
      new Chart(countsCtx, {
        type: 'bar',
        data: {
          labels: ['Posts','Avenues','Directors','Projects'],
          datasets:[{label:'Counts',data:[postsCount,avenuesCount,directorsCount,projectsCount],backgroundColor:['#D22163','#ff6bd5','#f9a8d4','#fbcfe8']}]
        }, options:{responsive:true}
      });

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

// --- Mobile Menu ---

try{
  const adminHamburger = document.getElementById('adminHamburger');
  const adminHeader = document.querySelector('.admin-header');
  const adminNavLinks = adminHeader ? adminHeader.querySelectorAll('nav a') : [];
  if(adminHamburger){
    adminHamburger.addEventListener('click', function(e){
      const open = document.body.classList.toggle('admin-nav-open');
      adminHamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
      adminHamburger.classList.toggle('open', open);
    });

    document.addEventListener('click', function(e){ if(!e.target.closest('.admin-header') && document.body.classList.contains('admin-nav-open')){ document.body.classList.remove('admin-nav-open'); adminHamburger.setAttribute('aria-expanded','false'); } });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && document.body.classList.contains('admin-nav-open')){ document.body.classList.remove('admin-nav-open'); adminHamburger.setAttribute('aria-expanded','false'); } });
    Array.from(adminNavLinks).forEach(a=> a.addEventListener('click', function(){ if(window.innerWidth <= 900){ document.body.classList.remove('admin-nav-open'); adminHamburger.setAttribute('aria-expanded','false'); } }));
  }
}catch(e){ }