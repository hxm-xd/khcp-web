// Mobile Navigation Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

// Initialize AOS
AOS.init({
    duration: 1000,
    once: true,
    offset: 100
});

// Prevent user scrolling while the loading screen is active. We'll add
// the `loading-active` class immediately so the CSS rule above can take effect
// before the load event removes it.
try {
    document.documentElement.classList.add('loading-active');
} catch (e) {
    // ignore in older browsers
}

// Determine base path for images based on current location
// We check if we are in the 'pages' directory to set the correct relative path
let imgBasePath = 'images/';
if (window.location.pathname.includes('/pages/avenues/')) {
    imgBasePath = '../../images/';
} else if (window.location.pathname.includes('/pages/')) {
    imgBasePath = '../images/';
}

// Hero images used by the background carousel. We'll attempt to preload
// these so the visible background is ready before we remove the loader.
const HERO_IMAGES = [
    imgBasePath + 'Kandy1.jpeg',
    imgBasePath + 'Kandy2.jpg',
    imgBasePath + 'Kandy3.jpg'
];

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function preloadImages(urls, timeout = 1200) {
    return new Promise((resolve) => {
        if (!urls || !urls.length) return resolve();
        let settled = 0;
        const images = [];

        const maybeResolve = () => {
            settled++;
            if (settled >= urls.length) {
                clearTimeout(timer);
                resolve();
            }
        };

        urls.forEach(u => {
            const img = new Image();
            img.onload = maybeResolve;
            img.onerror = maybeResolve; // treat errors as "finished" to avoid blocking
            img.src = u;
            images.push(img);
        });

        // Fallback: resolve after timeout even if some images didn't finish
        const timer = setTimeout(() => resolve(), timeout);
    });
}

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking on a link (but don't close when the click
// is the Avenues dropdown trigger itself — that should toggle the submenu)
document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
        // Always close the mobile nav when a link is clicked
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offsetTop = target.offsetTop - 80;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// Navbar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Form handling with enhanced validation
const contactForm = document.querySelector('.contact-form form');

if (contactForm) {
    const formInputs = contactForm.querySelectorAll('input, textarea');
    
    // Add real-time validation feedback
    formInputs.forEach(input => {
        input.addEventListener('blur', (e) => validateField(e.target));
        input.addEventListener('input', (e) => clearValidation(e.target));
    });
    
    /* 
    // Disabled to allow Firebase handling in firebase-public.js
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = this.querySelector('input[type="text"]');
        const email = this.querySelector('input[type="email"]');
        const message = this.querySelector('textarea');
        
        // Clear previous validation states
        clearAllValidation();
        
        // Validate all fields
        let isValid = true;
        if (!validateField(name)) isValid = false;
        if (!validateField(email)) isValid = false;
        if (!validateField(message)) isValid = false;
        
        if (!isValid) {
            showNotification('Please fix the errors above.', 'error');
            return;
        }
        
        // Simulate form submission
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        
        setTimeout(() => {
            showNotification('Thank you! Your message has been sent successfully.', 'success');
            this.reset();
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
        }, 2000);
    });
    */
}

// Enhanced field validation
function validateField(field) {
    const value = field.value.trim();
    let isValid = true;
    
    // Remove existing validation classes
    field.classList.remove('success', 'error');
    
    if (field.type === 'email') {
        if (!value) {
            showFieldError(field, 'Email is required');
            isValid = false;
        } else if (!isValidEmail(value)) {
            showFieldError(field, 'Please enter a valid email address');
            isValid = false;
        } else {
            showFieldSuccess(field);
        }
    } else if (field.tagName === 'TEXTAREA') {
        if (!value) {
            showFieldError(field, 'Message is required');
            isValid = false;
        } else if (value.length < 10) {
            showFieldError(field, 'Message must be at least 10 characters long');
            isValid = false;
        } else {
            showFieldSuccess(field);
        }
    } else {
        if (!value) {
            showFieldError(field, 'This field is required');
            isValid = false;
        } else if (value.length < 2) {
            showFieldError(field, 'This field must be at least 2 characters long');
            isValid = false;
        } else {
            showFieldSuccess(field);
        }
    }
    
    return isValid;
}

function showFieldError(field, message) {
    field.classList.add('error');
    
    // Remove existing error message
    const existingError = field.parentNode.querySelector('.error-message');
    if (existingError) existingError.remove();
    
    // Add error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = 'color: #ef4444; font-size: 0.875rem; margin-top: 0.5rem; font-weight: 500;';
    field.parentNode.appendChild(errorDiv);
}

function showFieldSuccess(field) {
    field.classList.add('success');
    
    // Remove existing error message
    const existingError = field.parentNode.querySelector('.error-message');
    if (existingError) existingError.remove();
}

function clearValidation(field) {
    field.classList.remove('success', 'error');
    const errorMessage = field.parentNode.querySelector('.error-message');
    if (errorMessage) errorMessage.remove();
}

function clearAllValidation() {
    formInputs.forEach(input => {
        input.classList.remove('success', 'error');
        const errorMessage = input.parentNode.querySelector('.error-message');
        if (errorMessage) errorMessage.remove();
    });
}

// Email validation function
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) existingNotification.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        color: white;
        font-weight: 600;
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 300px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    `;
    
    // Set background color based on type
    if (type === 'success') {
        notification.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    } else if (type === 'error') {
        notification.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
    } else {
        notification.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
    }
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// Counter animation for statistics
function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');
    
    counters.forEach(counter => {
        const target = parseInt(counter.textContent.replace(/\D/g, ''));
        const increment = target / 50;
        let current = 0;
        
        const updateCounter = () => {
            if (current < target) {
                current += increment;
                counter.textContent = Math.ceil(current) + '+';
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = target + '+';
            }
        };
        
        updateCounter();
    });
}

// Trigger counter animation when stats section is visible
const statsSection = document.querySelector('.about-stats');
if (statsSection) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    observer.observe(statsSection);
}

// Scroll to top functionality
function createScrollToTopButton() {
    const scrollBtn = document.createElement('button');
    scrollBtn.className = 'scroll-to-top';
    scrollBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
    scrollBtn.setAttribute('aria-label', 'Scroll to top');
    
    scrollBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    document.body.appendChild(scrollBtn);
    
    // Show/hide button based on scroll position
    window.addEventListener('scroll', () => {
        if (window.scrollY > 500) {
            scrollBtn.classList.add('visible');
        } else {
            scrollBtn.classList.remove('visible');
        }
    });
}

// Intersection Observer for animations
function setupAnimations() {
    const animatedElements = document.querySelectorAll('.project-card, .contact-item, .stat-item');
    
    const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        animationObserver.observe(el);
    });
}

// Enhanced mobile menu functionality
function enhanceMobileMenu() {
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
            // also close any open dropdowns
            document.querySelectorAll('.nav-menu .has-dropdown.open').forEach(d => d.classList.remove('open'));
        }
    });
    
    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
            document.querySelectorAll('.nav-menu .has-dropdown.open').forEach(d => d.classList.remove('open'));
        }
    });

    // Keyboard accessibility for desktop only; no mobile dropdown behavior
    document.querySelectorAll('.nav-menu .has-dropdown > a').forEach(trigger => {
        trigger.addEventListener('keydown', function(e) {
            if (window.innerWidth > 768 && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                e.stopPropagation();
                const parent = this.parentElement;
                const willOpen = !parent.classList.contains('open');
                parent.classList.toggle('open', willOpen);
                this.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
            }
        });
    });

    // Add a short hover delay so users can move the pointer into the dropdown
    // without it closing immediately. Use a WeakMap to store timers per element.
    const hoverTimers = new WeakMap();
    document.querySelectorAll('.nav-menu .has-dropdown').forEach(item => {
        item.addEventListener('mouseenter', () => {
            const t = hoverTimers.get(item);
            if (t) { clearTimeout(t); hoverTimers.delete(item); }
            item.classList.add('open');
            const a = item.querySelector(':scope > a'); if (a) a.setAttribute('aria-expanded', 'true');
        });
        item.addEventListener('mouseleave', () => {
            const timer = setTimeout(() => {
                item.classList.remove('open');
                const a = item.querySelector(':scope > a'); if (a) a.setAttribute('aria-expanded', 'false');
                hoverTimers.delete(item);
            }, 240); // 240ms grace period
            hoverTimers.set(item, timer);
        });
    });
}

// Deferred initialization to run after loading screen hides
function startHeroCarousel() {
    const heroBgCarousel = document.querySelector('.hero-bg-carousel');
    if (!heroBgCarousel) return;
    
    // Use the pre-defined HERO_IMAGES array which has correct paths
    const images = HERO_IMAGES;
    
    let current = 0;
    images.forEach((src, idx) => {
        const img = document.createElement('img');
        img.src = src;
        img.className = 'carousel-image' + (idx === 0 ? ' active' : '');
        heroBgCarousel.appendChild(img);
    });
    const imgEls = heroBgCarousel.querySelectorAll('.carousel-image');
    setInterval(() => {
        imgEls[current].classList.remove('active');
        current = (current + 1) % images.length;
        imgEls[current].classList.add('active');
    }, 4000);
}

function initAppEnhancements() {
    startHeroCarousel();
    createScrollToTopButton();
    setupAnimations();
    enhanceMobileMenu();
    interceptInternalLinks();

    // Button tap feedback
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (this.classList.contains('btn-primary') || this.classList.contains('btn-secondary')) {
                this.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 150);
            }
        });
    });

    // Project card hover effects
    document.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
}

// Intercept internal link clicks to show the rotary-gear loader and play a
// short exit animation before navigating. This improves perceived speed and
// provides a smooth transition between pages.
function interceptInternalLinks() {
    document.querySelectorAll('a[href]').forEach(a => {
        const href = a.getAttribute('href');
        if (!href) return;
        // ignore same-page anchors, mailto/tel, and javascript:void
        if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;

        // try to resolve url and ensure it's same-origin
        let url;
        try { url = new URL(a.href, location.href); } catch (e) { return; }
        if (url.origin !== location.origin) return; // external link, skip

        // Skip links that open in new tab or have download attribute
        if (a.target && a.target !== '_self') return;
        if (a.hasAttribute('download')) return;

        a.addEventListener('click', function(e) {
            // allow user modifier-clicks to open in new tab
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

            e.preventDefault();

            const loadingScreen = document.querySelector('.loading-screen');
            if (loadingScreen) {
                // Make it visible and mark as exiting so CSS keeps it shown
                loadingScreen.classList.remove('hidden');
                loadingScreen.classList.add('exiting');
                loadingScreen.style.display = 'flex';
                loadingScreen.setAttribute('aria-hidden', 'false');
            }

            // Add a page-exit class to trigger page fade/scale (CSS targets :root.page-exit ...)
            try { document.documentElement.classList.add('page-exit'); } catch (e) {}

            // Small delay to allow the animation to play, then navigate
            const NAV_DELAY = 520; // ms (should be slightly longer than CSS fade)
            setTimeout(() => {
                // Remove the page-exit to avoid persisting state if navigation is prevented
                try { document.documentElement.classList.remove('page-exit'); } catch (e) {}
                window.location.href = url.href;
            }, NAV_DELAY);
        });
    });
}

// Hide loading screen on window load, then init app and notify listeners
window.addEventListener('load', () => {
    const loadingScreen = document.querySelector('.loading-screen');
    if (loadingScreen) {
        // Keep the loader visible while we preload important background assets
        // and wait at least a short minimum time. This gives the background
        // visuals time to appear before we hide the loader.
        const MIN_VISIBLE = 350; // ms minimum loader time
        const IMAGES_FALLBACK = 1400; // ms max wait for image preload
        const TRANSITION_FALLBACK = 1400; // ms max wait for transitionend

        // Start preloading immediately and also enforce a minimum visible time.
        const preloadPromise = preloadImages(HERO_IMAGES, IMAGES_FALLBACK);
        const minDelayPromise = delay(MIN_VISIBLE);

        Promise.all([preloadPromise, minDelayPromise]).then(() => {
            // start fade
            loadingScreen.classList.add('hidden');

            let finished = false;

            const finishHide = () => {
                if (finished) return;
                finished = true;
                try {
                    loadingScreen.style.display = 'none';
                    loadingScreen.setAttribute('aria-hidden', 'true');
                    // restore scrolling
                    try { document.documentElement.classList.remove('loading-active'); } catch(e) {}
                } catch (e) {
                    // ignore
                }
                // Allow heading and hero animations to run now that the background
                // is visible.
                try { document.documentElement.classList.add('animations-ready'); } catch(e) {}
                // Dispatch a global event to signal app readiness
                document.dispatchEvent(new CustomEvent('app:ready'));
                initAppEnhancements();
            };

            // Wait for the CSS transition (1s) to complete
            setTimeout(finishHide, 1000);
        });
    } else {
        // No loading screen present; initialize immediately
        try { document.documentElement.classList.add('animations-ready'); } catch(e) {}
        document.dispatchEvent(new CustomEvent('app:ready'));
        initAppEnhancements();
    }
});

// Performance optimization: Debounce scroll events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Apply debouncing to scroll events
const debouncedScrollHandler = debounce(() => {
    // Handle scroll-based effects here
}, 16);

window.addEventListener('scroll', debouncedScrollHandler);

console.log('Rotaract Club Website - Enhanced JavaScript loaded successfully!');
