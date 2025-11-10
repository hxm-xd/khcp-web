(function(){
  const canvas = document.getElementById('heroParticles');
  if (!canvas) return;

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    // Respect reduced motion
    canvas.parentElement && canvas.parentElement.removeChild(canvas);
    return;
  }

  let ctx, width = 0, height = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  let particles = [];
  const NUM_PARTICLES_BASE = 60; // scaled with area
  const COLORS = [
    'rgba(210,33,99,0.35)',
    'rgba(255,107,213,0.28)',
    'rgba(255,255,255,0.10)'
  ];

  function boot(){
    ctx = canvas.getContext('2d');
    window.addEventListener('resize', debounce(resize, 150));
    resize();
    rafId = requestAnimationFrame(step);
  }

  function resize(){
    const rect = canvas.getBoundingClientRect();
    width = Math.floor(rect.width);
    height = Math.floor(rect.height);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initParticles();
  }

  function initParticles(){
    const area = width * height;
    const target = Math.max(20, Math.min(120, Math.floor(area / 16000)));
    const count = Math.min(target, NUM_PARTICLES_BASE);
    particles = new Array(count).fill(0).map(() => makeParticle());
  }

  function makeParticle(){
    const speed = 0.1 + Math.random() * 0.6;
    const radius = 20 + Math.random() * 90; // soft blobs
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() * 2 - 1) * speed,
      vy: (Math.random() * 2 - 1) * speed,
      r: radius,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.005 + Math.random() * 0.01
    };
  }

  function step(){
    ctx.clearRect(0,0,width,height);

    // subtle vignette
    const gradBg = ctx.createLinearGradient(0,0,width,height);
    gradBg.addColorStop(0, 'rgba(255,255,255,0.02)');
    gradBg.addColorStop(1, 'rgba(255,255,255,0.00)');
    ctx.fillStyle = gradBg;
    ctx.fillRect(0,0,width,height);

    ctx.globalCompositeOperation = 'lighter';

    for (let p of particles){
      p.x += p.vx;
      p.y += p.vy;
      p.wobble += p.wobbleSpeed;

      // gentle wobble to avoid straight lines
      const wx = Math.cos(p.wobble) * 0.6;
      const wy = Math.sin(p.wobble) * 0.6;

      // wrap around edges
      if (p.x - p.r > width) p.x = -p.r;
      if (p.x + p.r < 0) p.x = width + p.r;
      if (p.y - p.r > height) p.y = -p.r;
      if (p.y + p.r < 0) p.y = height + p.r;

      const g = ctx.createRadialGradient(p.x + wx, p.y + wy, 0, p.x, p.y, p.r);
      g.addColorStop(0, p.color);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    rafId = requestAnimationFrame(step);
  }

  let rafId = null;

  // Pause when tab hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    } else if (!rafId) {
      rafId = requestAnimationFrame(step);
    }
  });

  function debounce(fn, wait){
    let t; return function(){ clearTimeout(t); t = setTimeout(fn, wait); };
  }

  // Defer boot until app is ready (loading screen hidden)
  const loading = document.querySelector('.loading-screen');
  if (loading && !loading.classList.contains('hidden')) {
    document.addEventListener('app:ready', boot, { once: true });
  } else {
    boot();
  }
})();
