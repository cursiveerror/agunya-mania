const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width, height;
let time = 0;
let globalScale = 1;

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    globalScale = Math.min(1.0, width / 800);
}
window.addEventListener('resize', resize);
resize();

const mouse = { x: width / 2, y: height / 2, moved: false };
window.addEventListener('mouseout', () => { mouse.moved = false; });
window.addEventListener('touchstart', (e) => {
    if(e.touches.length > 0) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
        mouse.moved = true;
    }
}, { passive: false });
window.addEventListener('touchmove', (e) => {
    if(e.touches.length > 0) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
        mouse.moved = true;
        if (e.cancelable) e.preventDefault();
    }
}, { passive: false });
window.addEventListener('touchend', () => { mouse.moved = false; });
window.addEventListener('touchcancel', () => { mouse.moved = false; });
window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.moved = true;
});

const agunyaImages = [];
const imageSrcs = ['assets/agunya1.png', 'assets/agunya2.png', 'assets/agunya3.png'];

imageSrcs.forEach(src => {
    const img = new Image();
    img.src = src;
    agunyaImages.push(img);
});

function getOffscreenPosition() {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.max(width, height) / 2 + 200;
    const cx = width / 2;
    const cy = height / 2;
    return {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius
    };
}

// Spark effect on consume (Simple & Fast)
class Spark {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 3;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1.0;
        this.size = Math.random() * 3 + 1;
        this.hue = Math.random() * 60 + 260; 
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.9;
        this.vy *= 0.9;
        this.life -= 0.05;
    }
    draw() {
        if (this.life <= 0) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, 100%, 70%, ${this.life})`;
        ctx.fill();
    }
}
const sparks = [];
function createExplosion(x, y) {
    for (let i = 0; i < 8; i++) {
        sparks.push(new Spark(x, y));
    }
}

// Background particles (Motion blur style)
class Particle {
    constructor() {
        this.reset();
        this.x = Math.random() * width;
        this.y = Math.random() * height;
    }
    reset() {
        const pos = getOffscreenPosition();
        this.x = pos.x;
        this.y = pos.y;
        this.size = Math.random() * 2.5 + 1;
        this.vy = 0;
        this.vx = 0;
        this.alpha = Math.random() * 0.5 + 0.2;
        this.hue = Math.random() * 60 + 240;
    }
    update() {
        const cx = width / 2;
        const cy = height / 2;
        
        let dxCenter = cx - this.x;
        let dyCenter = cy - this.y;
        let distCenter = Math.sqrt(dxCenter * dxCenter + dyCenter * dyCenter);
        
        if (distCenter > 0) {
            const angleToCenter = Math.atan2(dyCenter, dxCenter);
            // Tight spiral inwards
            const spiralAngle = angleToCenter + 0.4; 
            const gravity = 2000 / (distCenter + 50);
            
            this.vx += Math.cos(spiralAngle) * gravity * 0.05;
            this.vy += Math.sin(spiralAngle) * gravity * 0.05;
        }

        this.x += this.vx;
        this.y += this.vy;
        // More friction so they fall in instead of orbiting endlessly
        this.vx *= 0.94;
        this.vy *= 0.94;

        // Disappear as soon as they hit the black hole horizon
        if (distCenter < 80 * globalScale) {
            this.reset();
        }
    }
    draw() {
        ctx.beginPath();
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const angle = Math.atan2(this.vy, this.vx);
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);
        
        ctx.ellipse(0, 0, this.size + speed * 0.5, this.size, 0, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, 100%, 70%, ${this.alpha})`;
        ctx.fill();
        ctx.restore();
    }
}

const particles = Array.from({ length: 200 }, () => new Particle()); 

class Agunya {
    constructor(isInitial = false) {
        this.reset(isInitial);
    }

    reset(isInitial = false) {
        this.z = Math.random() * 0.8 + 0.2; 
        this.size = (this.z * 150 + 50) * globalScale; 
        
        if (isInitial) {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
        } else {
            const pos = getOffscreenPosition();
            this.x = pos.x;
            this.y = pos.y;
        }
        
        this.vx = 0;
        this.vy = 0;
        
        this.rotation = Math.random() * Math.PI * 2;
        this.baseRotationSpeed = (Math.random() - 0.5) * 0.06;
        this.rotationSpeed = this.baseRotationSpeed;
        
        this.imgIndex = Math.floor(Math.random() * agunyaImages.length);
        
        this.wobbleSpeed = Math.random() * 0.04 + 0.01;
        this.wobblePhase = Math.random() * Math.PI * 2;
        
        this.trail = [];
        this.maxTrail = 10; // Store a longer history so we can space out the ghost trails
    }

    update() {
        this.trail.unshift({x: this.x, y: this.y, rot: this.rotation});
        if (this.trail.length > this.maxTrail) this.trail.pop();

        const cx = width / 2;
        const cy = height / 2;

        let dxCenter = cx - this.x;
        let dyCenter = cy - this.y;
        let distCenter = Math.sqrt(dxCenter * dxCenter + dyCenter * dyCenter);

        if (distCenter > 0) {
            const angleToCenter = Math.atan2(dyCenter, dxCenter);
            const spiralAngle = angleToCenter + Math.PI * 0.05;
            const attraction = 0.1 * this.z + (300 / (distCenter + 100)) * 0.05; 
            this.vx += Math.cos(spiralAngle) * attraction;
            this.vy += Math.sin(spiralAngle) * attraction;
        }

        this.x += this.vx;
        this.y += this.vy;
        
        this.x += Math.sin(time * this.wobbleSpeed + this.wobblePhase) * 1.5 * this.z;
        this.y += Math.cos(time * this.wobbleSpeed + this.wobblePhase) * 1.5 * this.z;

        this.rotation += this.rotationSpeed;

        if (mouse.moved) {
            this.x -= (mouse.x - cx) * 0.003 * this.z;
            this.y -= (mouse.y - cy) * 0.003 * this.z;
            
            const dx = this.x - mouse.x;
            const dy = this.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const interactionRadius = 300 * globalScale; 

            if (dist < interactionRadius) {
                const force = Math.pow((interactionRadius - dist) / interactionRadius, 1.2);
                this.vx += (dx / dist) * force * 4.0 * this.z;
                this.vy += (dy / dist) * force * 4.0 * this.z;
                this.rotationSpeed += (dx / dist) * force * 0.03;
            }
        }

        this.vx *= 0.96;
        this.vy *= 0.96;
        this.rotationSpeed = this.rotationSpeed * 0.92 + this.baseRotationSpeed * 0.08;

        if (distCenter < 100 * globalScale) {
            createExplosion(this.x, this.y);
            this.reset(false);
        }
        
        const maxRadius = Math.max(width, height) / 2 + 800;
        if (distCenter > maxRadius) {
             this.reset(false);
        }
    }

    draw() {
        const img = agunyaImages[this.imgIndex];
        if (!img.complete || img.naturalWidth === 0) return;

        const ratio = img.naturalWidth / img.naturalHeight;
        let w = this.size;
        let h = this.size;
        if (ratio > 1) h = this.size / ratio;
        else w = this.size * ratio;

        // Multiple lightweight ghost trails spaced out for visibility
        for(let i = 2; i < this.trail.length; i+=3) { 
            const pt = this.trail[i];
            const alpha = 0.5 * (1 - i / this.maxTrail) * this.z;
            ctx.save();
            ctx.translate(pt.x, pt.y);
            ctx.rotate(pt.rot);
            ctx.globalAlpha = alpha;
            ctx.drawImage(img, -w / 2, -h / 2, w, h);
            ctx.restore();
        }

        // Main Image
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();
    }
}

const agunyas = Array.from({ length: 70 }, () => new Agunya(true));
agunyas.sort((a, b) => a.z - b.z);

// Middle-ground Black Hole: Beautiful but fast
function drawBalancedBlackHole(cx, cy, bhScale) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(bhScale, bhScale);
    
    // Gradient glow (cheap)
    const outerGlow = ctx.createRadialGradient(0, 0, 90, 0, 0, 350);
    outerGlow.addColorStop(0, 'rgba(180, 50, 255, 0.6)');
    outerGlow.addColorStop(0.5, 'rgba(50, 0, 150, 0.2)');
    outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(0, 0, 350, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(time * 0.005);

    // Accretion disk (4 solid ellipses, varied opacity)
    ctx.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        const wobble = Math.sin(time * 0.04 + i) * 12;
        ctx.ellipse(0, 0, 210 + i * 35 + wobble, 70 + i * 12, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(200, ${100 + i*40}, 255, ${0.5 - i*0.1})`;
        ctx.stroke();
    }

    // Photon sphere
    ctx.beginPath();
    ctx.arc(0, 0, 102, 0, Math.PI * 2);
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(255, 150, 255, 0.7)';
    ctx.stroke();
    
    // Additive glow on the inner edge (cheap enough for one element)
    ctx.globalCompositeOperation = 'screen';
    ctx.beginPath();
    ctx.arc(0, 0, 100, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';

    // Event Horizon
    ctx.beginPath();
    ctx.arc(0, 0, 98, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();

    // Foreground accretion disk (3 semi-ellipses)
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const wobble = Math.sin(time * 0.04 + i) * 12;
        ctx.ellipse(0, 0, 210 + i * 35 + wobble, 70 + i * 12, 0, 0, Math.PI); 
        ctx.lineWidth = 5;
        ctx.strokeStyle = `rgba(255, ${150 + i*30}, 255, ${0.7 - i*0.15})`;
        ctx.stroke();
    }

    ctx.restore();
}

function animate() {
    time += 1;
    
    ctx.fillStyle = 'rgba(10, 0, 20, 0.7)'; 
    ctx.fillRect(0, 0, width, height);

    particles.forEach(p => {
        p.update();
        p.draw();
    });

    agunyas.forEach(a => {
        a.update();
        a.draw();
    });

    const cx = width / 2;
    const cy = height / 2;
    const bhScale = Math.min(1.0, width / 1000);
    
    drawBalancedBlackHole(cx, cy, bhScale);

    // Draw sparks
    for (let i = sparks.length - 1; i >= 0; i--) {
        sparks[i].update();
        sparks[i].draw();
        if (sparks[i].life <= 0) sparks.splice(i, 1);
    }

    requestAnimationFrame(animate);
}

animate();
