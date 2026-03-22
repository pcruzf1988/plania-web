/* ============================================================
   PlanIA · main.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ── REVEAL ON SCROLL ──────────────────────────────────────
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target); // una sola vez
      }
    });
  }, { threshold: 0.08 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));


  // ── FAQ TOGGLE ────────────────────────────────────────────
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const isOpen = item.classList.contains('open');

      // Cerrar todos
      document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));

      // Abrir el clickeado (si no estaba abierto)
      if (!isOpen) item.classList.add('open');
    });
  });


  // ── SMOOTH SCROLL ─────────────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = 72; // alto del nav
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });


  // ── NAV: ACTIVE LINK ──────────────────────────────────────
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


  // ── STICKY NAV: SHADOW ON SCROLL ─────────────────────────
  const nav = document.querySelector('.nav');
  window.addEventListener('scroll', () => {
    nav.style.boxShadow = window.scrollY > 10
      ? '0 2px 20px rgba(30,26,22,.08)'
      : 'none';
  }, { passive: true });

});


// ── LIGHTBOX ──────────────────────────────────────────────────────────────────
document.querySelectorAll('.feat-img-wrap img').forEach(img => {
  img.addEventListener('click', e => {
    e.stopPropagation();
    openLightbox(img.src, img.alt);
  });
});

function openLightbox(src, alt) {
  // Crear overlay
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';

  const image = document.createElement('img');
  image.className = 'lightbox-img';
  image.src  = src;
  image.alt  = alt || '';
  image.addEventListener('click', e => e.stopPropagation());

  const close = document.createElement('button');
  close.className   = 'lightbox-close';
  close.innerHTML   = '×';
  close.title       = 'Cerrar';
  close.addEventListener('click', () => closeLightbox(overlay));

  const hint = document.createElement('div');
  hint.className   = 'lightbox-hint';
  hint.textContent = 'Clic o Esc para cerrar';

  overlay.appendChild(image);
  overlay.appendChild(close);
  overlay.appendChild(hint);
  document.body.appendChild(overlay);

  // Cerrar al hacer clic en el fondo
  overlay.addEventListener('click', () => closeLightbox(overlay));

  // Cerrar con Esc
  const onKey = e => { if (e.key === 'Escape') { closeLightbox(overlay); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);

  // Bloquear scroll del body
  document.body.style.overflow = 'hidden';
}

function closeLightbox(overlay) {
  overlay.style.opacity = '0';
  overlay.style.transition = 'opacity .2s';
  setTimeout(() => { overlay.remove(); document.body.style.overflow = ''; }, 200);
}