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
  
  // Optimization: Detect mobile
  const isMobile = window.innerWidth < 768;
  const NUM_PARTICLES_BASE = isMobile ? 20 : 60; 
  
  const COLORS = [
    'rgba(210,33,99,0.35)',
    'rgba(255,107,213,0.28)',
    'rgba(255,255,255,0.10)'
  ];

  // Pre-render sprites for performance
  const sprites = {};
  
  function createSprites() {
    const size = 200; // Max size for sprite
    const half = size / 2;
    
    COLORS.forEach(color => {
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const x = c.getContext('2d');
        
        const g = x.createRadialGradient(half, half, 0, half, half, half);
        g.addColorStop(0, color);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        
        x.fillStyle = g;
        x.beginPath();
        x.arc(half, half, half, 0, Math.PI * 2);
        x.fill();
        
        sprites[color] = c;
    });
  }

  function boot(){
    createSprites();
    ctx = canvas.getContext('2d', { alpha: true }); // Optimize for alpha
    window.addEventListener('resize', debounce(resize, 150));
    resize();
    rafId = requestAnimationFrame(step);
  }

  let bgGradient = null;

  function resize(){
    const rect = canvas.getBoundingClientRect();
    width = Math.floor(rect.width);
    height = Math.floor(rect.height);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    
    // Cache background gradient
    bgGradient = ctx.createLinearGradient(0,0,width,height);
    bgGradient.addColorStop(0, 'rgba(255,255,255,0.02)');
    bgGradient.addColorStop(1, 'rgba(255,255,255,0.00)');
    
    initParticles();
  }

  function initParticles(){
    const area = width * height;
    // Reduce density on mobile
    const divisor = isMobile ? 25000 : 16000;
    const target = Math.max(10, Math.min(120, Math.floor(area / divisor)));
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

    // Use cached gradient
    if (bgGradient) {
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0,0,width,height);
    }

    // Only use lighter composite on desktop for performance
    if (!isMobile) {
        ctx.globalCompositeOperation = 'lighter';
    }

    for (let p of particles){
      p.x += p.vx;
      p.y += p.vy;
      p.wobble += p.wobbleSpeed;

      // gentle wobble
      const wx = Math.cos(p.wobble) * 0.6;
      const wy = Math.sin(p.wobble) * 0.6;

      // wrap around edges
      if (p.x - p.r > width) p.x = -p.r;
      if (p.x + p.r < 0) p.x = width + p.r;
      if (p.y - p.r > height) p.y = -p.r;
      if (p.y + p.r < 0) p.y = height + p.r;

      // Draw using pre-rendered sprite
      const sprite = sprites[p.color];
      if (sprite) {
          // Draw image is much faster than createRadialGradient
          // Center the sprite at p.x, p.y with radius p.r
          const size = p.r * 2;
          ctx.drawImage(sprite, p.x + wx - p.r, p.y + wy - p.r, size, size);
      }
    }

    if (!isMobile) {
        ctx.globalCompositeOperation = 'source-over';
    }
    
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
