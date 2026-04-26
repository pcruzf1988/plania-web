/* ============================================================
   PlanIA · main.js — v4 Raycast Tech/SaaS
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

  document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-blur').forEach(el => {
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


  // ── HAMBURGER MENU ────────────────────────────────────────
  const burger = document.querySelector('.nav-burger');
  const mobileMenu = document.querySelector('.nav-mobile');

  if (burger && mobileMenu) {
    const closeMobileMenu = () => {
      burger.classList.remove('open');
      mobileMenu.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    };

    burger.addEventListener('click', () => {
      const isOpen = !burger.classList.contains('open');
      burger.classList.toggle('open', isOpen);
      mobileMenu.classList.toggle('open', isOpen);
      burger.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', closeMobileMenu);
    });

    window.addEventListener('scroll', () => {
      if (mobileMenu.classList.contains('open')) closeMobileMenu();
    }, { passive: true });
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
      const href = a.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
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

  // Nav scroll class + on-dark for hero
  const onScroll = () => {
    const heroEl = document.querySelector('.hero');
    const heroBottom = heroEl ? heroEl.getBoundingClientRect().bottom : 0;
    nav.classList.toggle('scrolled', window.scrollY > 10);
    nav.classList.toggle('on-dark', heroBottom > 66);
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

  // ── HERO CURSOR SPOTLIGHT ─────────────────────────────────
  const heroEl = document.querySelector('.hero');
  if (heroEl && window.matchMedia('(min-width: 769px)').matches) {
    heroEl.addEventListener('mousemove', (e) => {
      const rect = heroEl.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      heroEl.style.setProperty('--cursor-x', x + '%');
      heroEl.style.setProperty('--cursor-y', y + '%');
    });
  }

  // ── MAGNETIC BUTTONS ─────────────────────────────────────
  document.querySelectorAll('.btn-magnetic').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) * 0.25;
      const y = (e.clientY - rect.top - rect.height / 2) * 0.25;
      btn.style.transform = `translate(${x}px, ${y}px) translateY(-3px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
      btn.style.transition = 'transform 0.5s cubic-bezier(.16,1,.3,1)';
      setTimeout(() => { btn.style.transition = ''; }, 500);
    });
  });

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