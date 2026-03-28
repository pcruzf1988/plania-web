/* ============================================================
   PlanIA · main.js — v3 Modern Warmth
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ── STAGGERED REVEAL ──────────────────────────────────────
  const staggerGroups = [
    '.stats-band .container',
    '.pricing-grid',
    '.workflow-steps',
    '.for-who .container',
    '.faq-section'
  ];

  staggerGroups.forEach(selector => {
    const group = document.querySelector(selector);
    if (!group) return;
    const children = group.querySelectorAll(':scope > .reveal');
    children.forEach((el, i) => {
      el.setAttribute('data-delay', Math.min(i + 1, 5));
    });
  });

  // Observer for all reveal types
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' });

  document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
    revealObserver.observe(el);
  });


  // ── ANIMATED STAT COUNTERS ────────────────────────────────
  const statNums = document.querySelectorAll('.stat-num');
  let statsAnimated = false;

  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !statsAnimated) {
        statsAnimated = true;
        animateStats();
        statsObserver.disconnect();
      }
    });
  }, { threshold: 0.25 });

  const statsBand = document.querySelector('.stats-band');
  if (statsBand) statsObserver.observe(statsBand);

  function animateStats() {
    statNums.forEach((el, i) => {
      const text = el.textContent.trim();
      const suffix = text.replace(/[\d.]/g, '');
      const num = parseFloat(text);
      if (isNaN(num)) return;

      const duration = 1600;
      const delayMs = i * 150;
      let started = false;
      const startTime = performance.now();

      el.textContent = '0' + suffix;

      function step(now) {
        const elapsed = now - startTime - delayMs;
        if (elapsed < 0) { requestAnimationFrame(step); return; }

        const progress = Math.min(elapsed / duration, 1);
        // Ease out expo
        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const current = Math.round(eased * num);

        el.textContent = current + suffix;

        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }


  // ── FAQ TOGGLE ────────────────────────────────────────────
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const isOpen = item.classList.contains('open');

      // Close all
      document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));

      // Open clicked (if not already)
      if (!isOpen) item.classList.add('open');
    });
  });


  // ── SMOOTH SCROLL ─────────────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = 72;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });


  // ── NAV: ACTIVE LINK + SCROLL STATE ───────────────────────
  const nav = document.querySelector('.nav');
  const sections = document.querySelectorAll('section[id], div[id]');
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach(s => sectionObserver.observe(s));

  // Nav scroll class
  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 10);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();


  // ── HERO SCREENSHOT PARALLAX (subtle) ─────────────────────
  const heroShot = document.querySelector('.hero-screenshot');
  if (heroShot && window.matchMedia('(min-width: 769px)').matches) {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const rect = heroShot.getBoundingClientRect();
          const viewH = window.innerHeight;
          if (rect.top < viewH && rect.bottom > 0) {
            const progress = (viewH - rect.top) / (viewH + rect.height);
            const y = (progress - 0.5) * -14;
            heroShot.style.transform = `translateY(${y}px)`;
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

});


// ── LIGHTBOX ────────────────────────────────────────────────
document.querySelectorAll('.feat-img-wrap img').forEach(img => {
  img.addEventListener('click', e => {
    e.stopPropagation();
    openLightbox(img.src, img.alt);
  });
});

function openLightbox(src, alt) {
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';

  const image = document.createElement('img');
  image.className = 'lightbox-img';
  image.src  = src;
  image.alt  = alt || '';
  image.addEventListener('click', e => e.stopPropagation());

  const close = document.createElement('button');
  close.className = 'lightbox-close';
  close.innerHTML = '×';
  close.title     = 'Cerrar';
  close.addEventListener('click', () => closeLightbox(overlay));

  const hint = document.createElement('div');
  hint.className   = 'lightbox-hint';
  hint.textContent = 'Clic o Esc para cerrar';

  overlay.appendChild(image);
  overlay.appendChild(close);
  overlay.appendChild(hint);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', () => closeLightbox(overlay));

  const onKey = e => {
    if (e.key === 'Escape') {
      closeLightbox(overlay);
      document.removeEventListener('keydown', onKey);
    }
  };
  document.addEventListener('keydown', onKey);

  document.body.style.overflow = 'hidden';
}

function closeLightbox(overlay) {
  overlay.style.opacity = '0';
  overlay.style.transition = 'opacity .25s';
  setTimeout(() => {
    overlay.remove();
    document.body.style.overflow = '';
  }, 250);
}