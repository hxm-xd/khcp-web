// Simple admin frontend script: mock auth and localStorage-backed CRUD
(function(){
  const page = window.location.pathname.split('/').pop();

  function getLS(key){ try{ return JSON.parse(localStorage.getItem(key) || 'null'); }catch(e){return null} }
  function setLS(key,val){ localStorage.setItem(key, JSON.stringify(val)); }

  // Protect pages: if not logged in, redirect to login
  function isLogged(){ return !!getLS('adminAuth'); }
  function requireAuth(){ if(page !== 'index.html' && !isLogged()){ window.location.href = 'index.html'; } }

  // Seed sample data if missing
  function seed(){
    if(!getLS('admin_posts')){
      setLS('admin_posts', [
        {id: Date.now(), title: 'Welcome to KHCP', excerpt:'Intro post'}
      ]);
    }
    if(!getLS('admin_avenues')) setLS('admin_avenues', [{id:1,name:'Community Service'},{id:2,name:'Professional Development'}]);
    if(!getLS('admin_directors')) setLS('admin_directors', [{id:1,name:'Alice',avenue:'Community Service'}]);
    if(!getLS('admin_projects')) setLS('admin_projects', [{id:1,title:'Tree Planting',avenue:'Environmental'}]);
    if(!getLS('adminProfile')) setLS('adminProfile',{name:'Admin',email:'admin@example.com'});
  }

  // Generic list rendering helpers
  function renderList(container, items, renderItem){
    container.innerHTML = '';
    if(!items || items.length===0){ container.innerHTML = '<p class="muted">No items yet.</p>'; return; }
    items.forEach(it=>{ const el = document.createElement('div'); el.className='item'; el.innerHTML = renderItem(it); container.appendChild(el); });
  }

  // Logout hookup
  document.addEventListener('click', function(e){ if(e.target && e.target.id==='logoutBtn'){ localStorage.removeItem('adminAuth'); window.location.href='index.html'; } });

  // Login page
  if(page === 'index.html' || page === ''){
    seed();
    const form = document.getElementById('loginForm');
    form && form.addEventListener('submit', function(evt){
      evt.preventDefault();
      const email = document.getElementById('email').value || 'admin@example.com';
      const name = email.split('@')[0] || 'Admin';
      setLS('adminAuth',{name:name,email:email});
      window.location.href = 'dashboard.html';
    });
    return;
  }

  // All other admin pages require auth
  requireAuth(); seed();

  // Dashboard counts
  if(page === 'dashboard.html'){
    const posts = getLS('admin_posts')||[];
    const avenues = getLS('admin_avenues')||[];
    const directors = getLS('admin_directors')||[];
    const projects = getLS('admin_projects')||[];
    document.getElementById('countPosts').textContent = posts.length;
    document.getElementById('countAvenues').textContent = avenues.length;
    document.getElementById('countDirectors').textContent = directors.length;
    document.getElementById('countProjects').textContent = projects.length;
    return;
  }

  // BLOG page
  if(page === 'blog.html'){
    const list = document.getElementById('postsList');
    const form = document.getElementById('postForm');
    const title = document.getElementById('postTitle');
    const excerpt = document.getElementById('postExcerpt');

    function refresh(){ renderList(list, getLS('admin_posts')||[], (p)=>{
      return `<div><strong>${escapeHtml(p.title)}</strong><div class="meta">${escapeHtml(p.excerpt||'')}</div></div>
        <div>
          <button class="btn" data-action="edit" data-id="${p.id}">Edit</button>
          <button class="btn" data-action="delete" data-id="${p.id}">Delete</button>
        </div>`;
    }); }

    form && form.addEventListener('submit', function(e){ e.preventDefault(); const posts = getLS('admin_posts')||[]; const existing = posts.find(x=>x.title===title.value);
      if(existing){ existing.excerpt = excerpt.value; } else { posts.unshift({id:Date.now(),title:title.value,excerpt:excerpt.value}); }
      setLS('admin_posts', posts); title.value=''; excerpt.value=''; refresh();
    });

    list && list.addEventListener('click', function(e){ const btn = e.target.closest('button'); if(!btn) return; const action = btn.dataset.action; const id = Number(btn.dataset.id); let posts = getLS('admin_posts')||[]; if(action==='delete'){ posts = posts.filter(p=>p.id!==id); setLS('admin_posts', posts); refresh(); }
      if(action==='edit'){ const p = posts.find(x=>x.id===id); if(p){ title.value = p.title; excerpt.value = p.excerpt; }
    }});

    refresh(); return;
  }

  // AVENUES
  if(page === 'avenues.html'){
    const list = document.getElementById('avenuesList');
    const form = document.getElementById('avenueForm');
    const name = document.getElementById('avenueName');
    function refresh(){ renderList(list, getLS('admin_avenues')||[], a=>`<div><strong>${escapeHtml(a.name)}</strong></div><div><button class="btn" data-action="delete" data-id="${a.id}">Delete</button></div>`); }
    form && form.addEventListener('submit', function(e){ e.preventDefault(); const arr = getLS('admin_avenues')||[]; arr.unshift({id:Date.now(),name:name.value}); setLS('admin_avenues', arr); name.value=''; refresh(); });
    list && list.addEventListener('click', e=>{ const btn = e.target.closest('button'); if(!btn) return; const id=Number(btn.dataset.id); let arr=getLS('admin_avenues')||[]; if(btn.dataset.action==='delete'){ arr=arr.filter(x=>x.id!==id); setLS('admin_avenues',arr); refresh(); } });
    refresh(); return;
  }

  // DIRECTORS
  if(page === 'directors.html'){
    const list = document.getElementById('directorsList');
    const form = document.getElementById('directorForm');
    const name = document.getElementById('directorName');
    const avenue = document.getElementById('directorAvenue');
    function refresh(){ renderList(list, getLS('admin_directors')||[], d=>`<div><strong>${escapeHtml(d.name)}</strong><div class="meta">${escapeHtml(d.avenue||'')}</div></div><div><button class="btn" data-action="delete" data-id="${d.id}">Delete</button></div>`); }
    form && form.addEventListener('submit', e=>{ e.preventDefault(); const arr=getLS('admin_directors')||[]; arr.unshift({id:Date.now(),name:name.value,avenue:avenue.value}); setLS('admin_directors',arr); name.value=''; avenue.value=''; refresh(); });
    list && list.addEventListener('click', e=>{ const btn = e.target.closest('button'); if(!btn) return; const id=Number(btn.dataset.id); let arr=getLS('admin_directors')||[]; if(btn.dataset.action==='delete'){ arr=arr.filter(x=>x.id!==id); setLS('admin_directors',arr); refresh(); } });
    refresh(); return;
  }

  // PROJECTS
  if(page === 'projects.html'){
    const list = document.getElementById('projectsList');
    const form = document.getElementById('projectForm');
    const title = document.getElementById('projectTitle');
    const avenue = document.getElementById('projectAvenue');
    function refresh(){ renderList(list, getLS('admin_projects')||[], p=>`<div><strong>${escapeHtml(p.title)}</strong><div class="meta">${escapeHtml(p.avenue||'')}</div></div><div><button class="btn" data-action="delete" data-id="${p.id}">Delete</button></div>`); }
    form && form.addEventListener('submit', e=>{ e.preventDefault(); const arr=getLS('admin_projects')||[]; arr.unshift({id:Date.now(),title:title.value,avenue:avenue.value}); setLS('admin_projects',arr); title.value=''; avenue.value=''; refresh(); });
    list && list.addEventListener('click', e=>{ const btn = e.target.closest('button'); if(!btn) return; const id=Number(btn.dataset.id); let arr=getLS('admin_projects')||[]; if(btn.dataset.action==='delete'){ arr=arr.filter(x=>x.id!==id); setLS('admin_projects',arr); refresh(); } });
    refresh(); return;
  }

  // PROFILE
  if(page === 'profile.html'){
    const prof = getLS('adminProfile')||{};
    const name = document.getElementById('adminName');
    const email = document.getElementById('adminEmail');
    const pass = document.getElementById('adminPassword');
    name.value = prof.name || '';
    email.value = prof.email || '';
    document.getElementById('profileForm').addEventListener('submit', e=>{ e.preventDefault(); setLS('adminProfile',{name:name.value,email:email.value}); alert('Profile saved locally'); });
    return;
  }

  // ANALYTICS
  if(page === 'analytics.html'){
    const posts = getLS('admin_posts')||[];
    const avenues = getLS('admin_avenues')||[];
    const directors = getLS('admin_directors')||[];
    const projects = getLS('admin_projects')||[];

    // counts chart
    const countsCtx = document.getElementById('countsChart').getContext('2d');
    new Chart(countsCtx, {
      type: 'bar',
      data: {
        labels: ['Posts','Avenues','Directors','Projects'],
        datasets:[{label:'Counts',data:[posts.length,avenues.length,directors.length,projects.length],backgroundColor:['#D22163','#ff6bd5','#f9a8d4','#fbcfe8']}]
      }, options:{responsive:true}
    });

    // distribution dummy chart (avenues distribution)
    const distCtx = document.getElementById('distributionChart').getContext('2d');
    new Chart(distCtx, { type:'pie', data:{ labels:avenues.map(a=>a.name), datasets:[{data:avenues.map(()=>Math.floor(Math.random()*10)+1), backgroundColor:avenues.map((_,i)=>['#D22163','#ff6bd5','#f9a8d4','#fbcfe8'][i%4])}] }, options:{responsive:true} });
    return;
  }

  // Utility: very small HTML escaper
  function escapeHtml(s){ return String(s||'').replace(/[&<>\"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

})();
