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

async function seedAvenues() {
  return false; // Disabled seeding
}

function renderList(container, items, renderContentFn, allowDelete = true) {
  container.innerHTML = '';
  if (!items || items.length === 0) {
    container.innerHTML = '<p class="text-muted" style="text-align:center; padding:20px;">No items found.</p>';
    return;
  }
  items.forEach((item, index) => {
    const el = document.createElement('div');
    el.className = 'list-item';
    el.style.animationDelay = `${index * 0.05}s`; 
    
    let imageHtml = '';
    if (item.imageUrl) {
      imageHtml = `<img src="${escapeHtml(item.imageUrl)}" alt="Image" class="item-image" onerror="this.style.display='none'">`;
    } else if (item.image) { 
      imageHtml = `<img src="${escapeHtml(item.image)}" alt="Image" class="item-image" onerror="this.style.display='none'">`;
    }

    el.innerHTML = `
      <div class="item-content">
        ${imageHtml}
        <div class="item-details">
          ${renderContentFn(item)}
        </div>
      </div>
      <div class="item-actions">
        <button class="btn btn-ghost" data-action="edit" data-id="${item.id}">
          <i class="fas fa-edit"></i> Edit
        </button>
        ${allowDelete ? `<button class="btn btn-danger" data-action="delete" data-id="${item.id}"><i class="fas fa-trash"></i> Delete</button>` : ''}
      </div>
    `;
    container.appendChild(el);
  });
}

async function populateAvenueSelect(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  try {
    // Ensure avenues exist
    await seedAvenues();

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
        if (el) {
          el.textContent = snap.size;
          el.classList.remove('skeleton', 'skeleton-h3');
        }
      } catch (e) {
        console.error(`Error loading count for ${colName}`, e);
      }
    }
  }

  loadCounts();
  seedAvenues().then(added => {
    if (added) {
      console.log('Seeded missing avenues');
      loadCounts();
    }
  });

  // --- Stats Logic ---
  const statsForm = document.getElementById('statsForm');
  const statMembers = document.getElementById('statMembers');
  const statProjects = document.getElementById('statProjects');
  const statYears = document.getElementById('statYears');
  const statHours = document.getElementById('statHours');

  async function loadStats() {
    try {
      const snap = await getDocs(collection(db, 'settings'));
      const statsDoc = snap.docs.find(d => d.data().type === 'homeStats');
      
      if (statsDoc) {
        const data = statsDoc.data();
        if (statMembers) statMembers.value = data.members || '';
        if (statProjects) statProjects.value = data.projects || '';
        if (statYears) statYears.value = data.years || '';
        if (statHours) statHours.value = data.hours || '';
        statsForm.dataset.id = statsDoc.id; // Store ID for update
      }
    } catch (e) {
      console.error("Error loading stats", e);
    } finally {
      if (statMembers) statMembers.classList.remove('skeleton');
      if (statProjects) statProjects.classList.remove('skeleton');
      if (statYears) statYears.classList.remove('skeleton');
      if (statHours) statHours.classList.remove('skeleton');
    }
  }

  if (statsForm) {
    statsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        type: 'homeStats',
        members: statMembers.value,
        projects: statProjects.value,
        years: statYears.value,
        hours: statHours.value
      };

      try {
        const id = statsForm.dataset.id;
        if (id) {
          await updateDoc(doc(db, 'settings', id), data);
        } else {
          const ref = await addDoc(collection(db, 'settings'), data);
          statsForm.dataset.id = ref.id;
        }
        showToast("Statistics updated successfully");
      } catch (err) {
        console.error("Error saving stats", err);
        showToast("Error saving stats", "error");
      }
    });
    loadStats();
  }
}

// --- Blog Logic ---

if (page === 'blog.html') {
  const list = document.getElementById('postsList');
  const form = document.getElementById('postForm');
  const titleInput = document.getElementById('postTitle');
  const authorInput = document.getElementById('postAuthor');
  const excerptInput = document.getElementById('postExcerpt');
  const imageInput = document.getElementById('postImage');
  const contentInput = document.getElementById('postContent');
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

  let editId = null;
  let quill = null;

  if (document.getElementById('postContentEditor')) {
    if (window.Quill) {
      var Size = window.Quill.import('attributors/style/size');
      Size.whitelist = ['10px', '12px', '14px', '16px', '18px', '24px', '32px', '48px'];
      window.Quill.register(Size, true);
    }

    quill = new Quill('#postContentEditor', {
      theme: 'snow',
      modules: {
        toolbar: [
          [{ 'header': [1, 2, 3, false] }],
          [{ 'size': ['10px', '12px', '14px', '16px', '18px', '24px', '32px', '48px'] }],
          ['bold', 'italic', 'underline', 'strike'],
          ['blockquote', 'code-block'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          [{ 'color': [] }, { 'background': [] }],
          ['link', 'image'],
          ['clean']
        ]
      }
    });
  }

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
        author: authorInput ? authorInput.value : '',
        excerpt: excerptInput.value,
        imageUrl: imageInput ? imageInput.value : '',
        content: quill ? quill.root.innerHTML : (contentInput ? contentInput.value : ''),
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
        if (quill) quill.setText('');
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
        if(authorInput) authorInput.value = post.author || '';
        excerptInput.value = post.excerpt;
        if(imageInput) imageInput.value = post.imageUrl || '';
        if(contentInput) contentInput.value = post.content || '';
        if(quill) quill.root.innerHTML = post.content || '';
        
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
  const chairInput = document.getElementById('projectChair');
  const locationInput = document.getElementById('projectLocation');
  const beneficiariesInput = document.getElementById('projectBeneficiaries');
  const dateInput = document.getElementById('projectDate');
  const imageInput = document.getElementById('projectImage');
  const descInput = document.getElementById('projectDescription');
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

  let editId = null;
  let quill = null;

  if (document.getElementById('projectDescriptionEditor')) {
    if (window.Quill) {
      var Size = window.Quill.import('attributors/style/size');
      Size.whitelist = ['10px', '12px', '14px', '16px', '18px', '24px', '32px', '48px'];
      window.Quill.register(Size, true);
    }

    quill = new Quill('#projectDescriptionEditor', {
      theme: 'snow',
      modules: {
        toolbar: [
          [{ 'header': [1, 2, 3, false] }],
          [{ 'size': ['10px', '12px', '14px', '16px', '18px', '24px', '32px', '48px'] }],
          ['bold', 'italic', 'underline', 'strike'],
          ['blockquote', 'code-block'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          [{ 'color': [] }, { 'background': [] }],
          ['link', 'image'],
          ['clean']
        ]
      }
    });
  }

  populateAvenueSelect('projectAvenue');

  async function loadProjects() {
    try {
      const snap = await getDocs(collection(db, 'projects'));
      const projects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Sort by date desc
      projects.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

      renderList(list, projects, (p) => `
        <h4>${escapeHtml(p.title)}</h4>
        <div class="meta">
          ${escapeHtml(p.avenue || 'No Avenue')} • 
          ${p.date ? new Date(p.date).toLocaleDateString() : 'No Date'}
        </div>
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
        chair: chairInput ? chairInput.value : '',
        location: locationInput ? locationInput.value : '',
        beneficiaries: beneficiariesInput ? beneficiariesInput.value : '',
        title: titleInput.value,
        avenue: avenueInput.value,
        date: dateInput.value || new Date().toISOString().split('T')[0],
        imageUrl: imageInput ? imageInput.value : '',
        description: quill ? quill.root.innerHTML : (descInput ? descInput.value : ''),
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
        if (quill) quill.setText('');
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
        dateInput.value = project.date || '';
        if(chairInput) chairInput.value = project.chair || '';
        if(locationInput) locationInput.value = project.location || '';
        if(beneficiariesInput) beneficiariesInput.value = project.beneficiaries || '';
        if(imageInput) imageInput.value = project.imageUrl || '';
        if(descInput) descInput.value = project.description || '';
        if(quill) quill.root.innerHTML = project.description || '';
        
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
  const createBtn = document.getElementById('createAvenueBtn');

  let editId = null;

  const stat1Label = document.getElementById('stat1Label');
  const stat1Value = document.getElementById('stat1Value');
  const stat2Label = document.getElementById('stat2Label');
  const stat2Value = document.getElementById('stat2Value');

  if (createBtn) {
    createBtn.addEventListener('click', () => {
      editId = null;
      resetForm(form, submitBtn, 'Add Avenue');
      form.style.display = 'block';
      nameInput.readOnly = false;
      form.scrollIntoView({ behavior: 'smooth' });
    });
  }

  async function loadAvenues() {
    try {
      const snap = await getDocs(collection(db, 'avenues'));
      const avenues = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      renderList(list, avenues, (a) => `
        <h4>${escapeHtml(a.name)}</h4>
        <div class="meta">${escapeHtml(a.description || '')}</div>
      `, true); 
    } catch (e) {
      console.error("Error loading avenues", e);
      showToast("Error loading avenues", "error");
    }
  }

  if (form) {
    setupCancelButton(form, submitBtn, 'Add Avenue', () => { 
      editId = null; 
      form.style.display = 'none';
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const data = { 
        name: nameInput.value,
        imageUrl: imageInput ? imageInput.value : '',
        description: descInput ? descInput.value : '',
        stat1Label: stat1Label ? stat1Label.value : '',
        stat1Value: stat1Value ? stat1Value.value : '',
        stat2Label: stat2Label ? stat2Label.value : '',
        stat2Value: stat2Value ? stat2Value.value : ''
      };

      try {
        if (editId) {
          // Don't update name on edit to avoid breaking links if we want to be strict, 
          // but for flexibility let's allow it or keep it read-only in UI.
          // For now, we update everything.
          await updateDoc(doc(db, 'avenues', editId), data);
          showToast("Avenue updated");
        } else {
          await addDoc(collection(db, 'avenues'), data);
          showToast("Avenue created");
        }
        
        editId = resetForm(form, submitBtn, 'Add Avenue');
        form.style.display = 'none';
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
        nameInput.readOnly = true; // Prevent changing name of existing avenues to avoid breaking legacy links
        if(imageInput) imageInput.value = avenue.imageUrl || '';
        if(descInput) descInput.value = avenue.description || '';
        if(stat1Label) stat1Label.value = avenue.stat1Label || '';
        if(stat1Value) stat1Value.value = avenue.stat1Value || '';
        if(stat2Label) stat2Label.value = avenue.stat2Label || '';
        if(stat2Value) stat2Value.value = avenue.stat2Value || '';
        
        editId = id;
        submitBtn.textContent = 'Update Avenue';
        form.style.display = 'block'; // Show form
        form.querySelector('#cancelEdit').style.display = 'inline-block';
        form.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
  if(list) {
    loadAvenues();
    seedAvenues().then(added => {
      if (added) {
        console.log('Seeded missing avenues on avenues page');
        loadAvenues();
      }
    });
  }
}

// --- Directors Logic ---

if (page === 'directors.html') {
  const list = document.getElementById('directorsList');
  const form = document.getElementById('directorForm');
  const nameInput = document.getElementById('directorName');
  const avenueInput = document.getElementById('directorAvenue');
  const yearInput = document.getElementById('directorYear');
  const imageInput = document.getElementById('directorImage');
  const filterAvenue = document.getElementById('filterAvenue');
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

  let editId = null;

  populateAvenueSelect('directorAvenue');
  populateAvenueSelect('filterAvenue');

  async function loadDirectors() {
    try {
      const snap = await getDocs(collection(db, 'directors'));
      let directors = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      if (filterAvenue && filterAvenue.value !== 'all') {
        directors = directors.filter(d => d.avenue === filterAvenue.value);
      }

      // Sort by year desc, then name
      directors.sort((a, b) => (b.year || 0) - (a.year || 0));

      renderList(list, directors, (d) => `
        <h4>${escapeHtml(d.name)}</h4>
        <div class="meta">
          ${escapeHtml(d.avenue || '')} • ${escapeHtml(d.year || 'No Year')}
        </div>
      `);
    } catch (e) {
      console.error("Error loading directors", e);
      showToast("Error loading directors", "error");
    }
  }

  if (filterAvenue) {
    filterAvenue.addEventListener('change', loadDirectors);
  }

  if (form) {
    setupCancelButton(form, submitBtn, 'Add Director', () => { editId = null; });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        name: nameInput.value.trim(),
        avenue: avenueInput.value.trim(),
        year: yearInput ? yearInput.value : '',
        imageUrl: imageInput ? imageInput.value.trim() : ''
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
        if(yearInput) yearInput.value = director.year || '';
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
    } finally {
      if (nameInput) nameInput.classList.remove('skeleton');
      if (emailInput) emailInput.classList.remove('skeleton');
      if (statMembers) statMembers.classList.remove('skeleton');
      if (statProjects) statProjects.classList.remove('skeleton');
      if (statYears) statYears.classList.remove('skeleton');
      if (statHours) statHours.classList.remove('skeleton');
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

// --- Sidebar Toggle ---

try {
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 1024) {
        if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target) && sidebar.classList.contains('open')) {
          sidebar.classList.remove('open');
        }
      }
    });
  }
} catch (e) { console.error("Sidebar toggle error", e); }
// --- Messages Logic ---

let currentMessageId = null;

function openMessageModal(docSnapshot) {
  const data = docSnapshot.data();
  const date = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleString() : 'No Date';
  
  document.getElementById('modalSender').textContent = data.name || 'Unknown';
  document.getElementById('modalEmail').textContent = data.email || 'No Email';
  document.getElementById('modalDate').textContent = date;
  document.getElementById('modalMessage').textContent = data.message || '';
  
  currentMessageId = docSnapshot.id;
  
  const modal = document.getElementById('messageModal');
  if (modal) modal.classList.add('show');
}

function closeMessageModal() {
  const modal = document.getElementById('messageModal');
  if (modal) modal.classList.remove('show');
  currentMessageId = null;
}

async function deleteCurrentMessage() {
  if (!currentMessageId) return;
  
  if(confirm('Are you sure you want to delete this message?')) {
    try {
      await deleteDoc(doc(db, "messages", currentMessageId));
      showToast('Message deleted');
      closeMessageModal();
      loadMessages(); // Reload list
    } catch (error) {
      console.error("Error deleting message: ", error);
      showToast('Error deleting message', 'error');
    }
  }
}

async function loadMessages() {
  const list = document.getElementById('messagesList');
  if (!list) return;

  // Setup modal listeners once
  if (!window.modalListenersAttached) {
    const closeBtn = document.getElementById('closeModalBtn');
    const closeFooterBtn = document.getElementById('closeModalFooterBtn');
    const deleteBtn = document.getElementById('deleteMessageBtn');
    const modal = document.getElementById('messageModal');
    
    if (closeBtn) closeBtn.addEventListener('click', closeMessageModal);
    if (closeFooterBtn) closeFooterBtn.addEventListener('click', closeMessageModal);
    if (deleteBtn) deleteBtn.addEventListener('click', deleteCurrentMessage);
    
    // Close on click outside
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeMessageModal();
        });
    }
    
    window.modalListenersAttached = true;
  }

  list.innerHTML = '<p class="text-muted">Loading messages...</p>';

  try {
    const q = query(collection(db, "messages"), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    
    list.innerHTML = '';
    
    if (querySnapshot.empty) {
      list.innerHTML = '<p class="text-muted">No messages found.</p>';
      return;
    }

    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const date = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleString() : 'No Date';
      const rawPreview = data.message ? (data.message.substring(0, 100) + (data.message.length > 100 ? '...' : '')) : '';
      const preview = escapeHtml(rawPreview);
      
      const item = document.createElement('div');
      item.className = 'list-item';
      item.style.cursor = 'pointer';
      item.innerHTML = `
        <div class="item-content">
          <div class="item-header">
            <h4 class="item-title">${data.name || 'Unknown'} <span style="font-weight:normal; font-size: 0.9em; color: #666;">(${data.email || 'No Email'})</span></h4>
            <span class="item-date">${date}</span>
          </div>
          <p class="item-subtitle" style="margin-top: 0.5rem; color: #666;">${preview}</p>
        </div>
        <div class="item-actions">
           <button class="btn-icon view-btn" title="View">
            <i class="fas fa-eye"></i>
          </button>
        </div>
      `;
      
      item.addEventListener('click', () => openMessageModal(docSnapshot));

      list.appendChild(item);
    });
  } catch (error) {
    console.error("Error loading messages: ", error);
    list.innerHTML = '<p class="error-text">Error loading messages.</p>';
  }
}

if (page === 'messages.html') {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      loadMessages();
    } else {
      window.location.href = 'index.html';
    }
  });
}
