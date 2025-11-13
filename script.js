// Set current year in footer
document.getElementById('year').textContent = new Date().getFullYear();

// Animated Background
const canvas = document.getElementById('background-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;

// Mouse position for parallax
let mouseX = 0;
let mouseY = 0;
let targetMouseX = 0;
let targetMouseY = 0;

// Track mouse movement
document.addEventListener('mousemove', (e) => {
    targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;  // -1 to 1
    targetMouseY = (e.clientY / window.innerHeight) * 2 - 1; // -1 to 1
});

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
        this.baseX = Math.random() * canvas.width;
        this.baseY = Math.random() * canvas.height;
        this.x = this.baseX;
        this.y = this.baseY;
        this.vx = (Math.random() - 0.5) * 2.5;
        this.vy = (Math.random() - 0.5) * 2.5;
        this.radius = 3;
        this.depth = Math.random() * 0.5 + 0.5; // 0.5 to 1 (closer = more parallax)
    }

    update() {
        // Smooth mouse following
        mouseX += (targetMouseX - mouseX) * 0.05;
        mouseY += (targetMouseY - mouseY) * 0.05;

        // Regular movement
        this.baseX += this.vx;
        this.baseY += this.vy;

        // Parallax offset based on mouse position and depth
        const parallaxX = mouseX * 50 * this.depth;
        const parallaxY = mouseY * 50 * this.depth;

        this.x = this.baseX + parallaxX;
        this.y = this.baseY + parallaxY;

        // Bounce off edges
        if (this.baseX < 0 || this.baseX > canvas.width) this.vx *= -1;
        if (this.baseY < 0 || this.baseY > canvas.height) this.vy *= -1;
    }

    draw() {
        const opacity = 0.6 + (this.depth * 0.4); // Closer particles are brighter
        ctx.fillStyle = `rgba(99, 102, 241, ${opacity})`;
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
                // Average depth for connection opacity
                const avgDepth = (particles[i].depth + particles[j].depth) / 2;
                const baseOpacity = 0.3 * (1 - distance / connectionDistance);
                const depthOpacity = baseOpacity * avgDepth;
                
                ctx.strokeStyle = `rgba(99, 102, 241, ${depthOpacity})`;
                ctx.lineWidth = 1.5;
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

// Apply staggered fade-in animation to all elements
document.querySelectorAll('.fade-in, .feature-card, .use-case-card, .comparison-card, .section-title, .section-description').forEach((el, index) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    
    // Add slight stagger delay for cards in the same section
    const delay = (index % 6) * 0.1; // Stagger by 0.1s for cards in same grid
    el.style.transition = `opacity 0.8s ease-out ${delay}s, transform 0.8s ease-out ${delay}s`;
    
    observer.observe(el);
});

