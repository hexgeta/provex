// Set current year in footer
document.getElementById('year').textContent = new Date().getFullYear();

// Animated Background
const canvas = document.getElementById('background-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;

// Set canvas size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Particle system
const particles = [];
const particleCount = 150;
const connectionDistance = 150;

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 1.5;
        this.vy = (Math.random() - 0.5) * 1.5;
        this.radius = 2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off edges
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
    }

    draw() {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Initialize particles
if (ctx) {
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
}

// Animation loop
function animate() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(particle => {
        particle.update();
        particle.draw();
    });

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < connectionDistance) {
                const opacity = 0.2 * (1 - distance / connectionDistance);
                ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }

    requestAnimationFrame(animate);
}

// Start animation
if (ctx) {
    animate();
}

// Fade in elements on scroll
const observerOptions = {
    threshold: 0.05,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            entry.target.classList.add('animated');
        }
    });
}, observerOptions);

// Apply fade-in to section titles first
const sectionTitles = document.querySelectorAll('.section-title:not(#faq .section-title)');
sectionTitles.forEach((el) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = `opacity 0.8s ease-out, transform 0.8s ease-out`;
    observer.observe(el);
});

// Apply fade-in to section descriptions
const sectionDescriptions = document.querySelectorAll('.section-description');
sectionDescriptions.forEach((el) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = `opacity 0.8s ease-out 0.1s, transform 0.8s ease-out 0.1s`;
    observer.observe(el);
});

// Apply row-based fade-in animation to cards (after titles)
const cardElements = document.querySelectorAll('.fade-in, .feature-card, .use-case-card, .comparison-card');

cardElements.forEach((el, index) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    
    // Calculate row (3 cards per row)
    const row = Math.floor(index / 3);
    const delay = 0.2 + (row * 0.15); // Start after titles (0.2s) + stagger by row
    
    el.style.transition = `opacity 0.8s ease-out ${delay}s, transform 0.8s ease-out ${delay}s`;
    
    observer.observe(el);
});

// Apply fade-in animation to sacrifice section elements
const sacrificeElements = document.querySelectorAll('.sacrifice-live-badge, .sacrifice-title, .sacrifice-box, .sacrifice-info-item, .process-step, .sacrifice-cta-button');

sacrificeElements.forEach((el, index) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    const delay = index * 0.1; // Stagger animation
    el.style.transition = `opacity 0.8s ease-out ${delay}s, transform 0.8s ease-out ${delay}s`;
    observer.observe(el);
});

// Apply fade-in animation to FAQ section (title first, then items)
const faqTitle = document.querySelector('#faq .section-title');
if (faqTitle) {
    faqTitle.style.opacity = '0';
    faqTitle.style.transform = 'translateY(20px)';
    faqTitle.style.transition = `opacity 0.8s ease-out, transform 0.8s ease-out`;
    observer.observe(faqTitle);
}

const faqElements = document.querySelectorAll('.faq-item');
faqElements.forEach((el) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = `opacity 0.8s ease-out 0.2s, transform 0.8s ease-out 0.2s`; // Delay after title
    observer.observe(el);
});

// FAQ Accordion
document.addEventListener('DOMContentLoaded', function() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', () => {
            // Close other open items
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                    otherItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
                }
            });
            
            // Toggle current item
            const isActive = item.classList.contains('active');
            item.classList.toggle('active');
            question.setAttribute('aria-expanded', !isActive);
        });
    });
});

// Mobile Hamburger Menu
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger');
    const mobileMenu = document.querySelector('.mobile-menu');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
    
    // Toggle menu
    hamburger.addEventListener('click', () => {
        const isActive = hamburger.classList.contains('active');
        hamburger.classList.toggle('active');
        mobileMenu.classList.toggle('active');
        hamburger.setAttribute('aria-expanded', !isActive);
        mobileMenu.setAttribute('aria-hidden', isActive);
        
        // Prevent body scroll when menu is open
        document.body.style.overflow = isActive ? '' : 'hidden';
    });
    
    // Close menu when clicking a link
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            mobileMenu.classList.remove('active');
            hamburger.setAttribute('aria-expanded', 'false');
            mobileMenu.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        });
    });
    
    // Close menu when clicking outside
    mobileMenu.addEventListener('click', (e) => {
        if (e.target === mobileMenu) {
            hamburger.classList.remove('active');
            mobileMenu.classList.remove('active');
            hamburger.setAttribute('aria-expanded', 'false');
            mobileMenu.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }
    });

    // Countdown Timer for Sacrifice End Date (Dec 3, 2025 00:00:00 UTC)
    function updateCountdown() {
        const endDate = new Date('2025-12-03T00:00:00Z').getTime();
        const now = new Date().getTime();
        const distance = endDate - now;

        if (distance < 0) {
            document.getElementById('sacrifice-timer').innerHTML = 'ENDED';
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        document.getElementById('timer-days').textContent = String(days).padStart(2, '0');
        document.getElementById('timer-hours').textContent = String(hours).padStart(2, '0');
        document.getElementById('timer-minutes').textContent = String(minutes).padStart(2, '0');
        document.getElementById('timer-seconds').textContent = String(seconds).padStart(2, '0');
    }

    // Update countdown every second
    updateCountdown();
    setInterval(updateCountdown, 1000);
});
