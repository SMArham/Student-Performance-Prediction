/**
 * tour.js - Interactive "Discover App" Onboarding & Feature Walkthrough Tour
 * Provides a guided step-by-step interactive walkthrough across the platform.
 */

(function () {
  'use strict';

  const TOUR_SLIDES = [
    {
      badge: 'Step 1 of 4 • Machine Learning Engine',
      title: 'AI Performance Prediction',
      icon: '🧠',
      tagline: 'Predict academic outcomes with precision',
      description: 'Our calibrated Machine Learning model evaluates multi-dimensional student factors—including study hours, historical exam grades, attendance consistency, and sleep habits—to compute predicted test scores, confidence intervals, and risk indicators in real time.',
      highlights: [
        'Real-time Ridge & Random Forest ML scoring',
        'Subject-wise grade predictions & risk tier alerts',
        'Personalized AI improvement recommendations'
      ],
      actionText: 'Next: Performance Trajectory ➔'
    },
    {
      badge: 'Step 2 of 4 • Unified Visualizer',
      title: 'Growth Trajectory & Score Lift',
      icon: '📈',
      tagline: 'See where you stand and how much you can grow',
      description: 'Explore your score trajectory from historical baseline assessments up to your target AI prediction. Toggle effortlessly between continuous smooth line graphs and breakdown bar charts to monitor your upward performance lift.',
      highlights: [
        'Single continuous upward trajectory curve',
        'Instant Line vs. Bar chart view switcher',
        'Automatic +% Score Lift & growth computation'
      ],
      actionText: 'Next: Student Records & CRUD ➔'
    },
    {
      badge: 'Step 3 of 4 • Student Management',
      title: 'Comprehensive Records & CRUD',
      icon: '👥',
      tagline: 'Manage profiles, evaluations, and checkpoints',
      description: 'Easily view, add, update, and manage student performance checkpoints. Access detailed diagnostic breakdowns, inspect historical assessment milestones, or edit individual records with zero hassle.',
      highlights: [
        'Full CRUD capabilities: View, Add, Edit & Delete',
        'Instant single-student diagnostic inspection',
        'Cloud-synced evaluation history ledger'
      ],
      actionText: 'Next: Reports & Export ➔'
    },
    {
      badge: 'Step 4 of 4 • Export & Insights',
      title: 'Reports & Academic Analytics',
      icon: '📑',
      tagline: 'Export reports and share actionable insights',
      description: 'Generate polished diagnostic reports, filter records by date or subject, and export academic insights for students, parents, and educators with a single click.',
      highlights: [
        'One-click PDF & print-ready academic reports',
        'Advanced date, subject, and status filters',
        'Secure multi-device cloud synchronization'
      ],
      actionText: '🚀 Get Started & Explore!'
    }
  ];

  let currentSlide = 0;

  function initTour() {
    injectTourStyles();
    injectTourModal();
    injectNavbarDiscoverButton();
  }

  function injectTourStyles() {
    if (document.getElementById('discover-tour-styles')) return;

    const style = document.createElement('style');
    style.id = 'discover-tour-styles';
    style.textContent = `
      .tour-nav-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        font-size: 12.5px;
        font-weight: 700;
        color: #ffffff;
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(168, 85, 247, 0.25));
        border: 1px solid rgba(168, 85, 247, 0.5);
        border-radius: 9999px;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 0 12px rgba(168, 85, 247, 0.25);
        text-decoration: none;
      }
      .tour-nav-btn:hover {
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.45), rgba(168, 85, 247, 0.45));
        border-color: rgba(168, 85, 247, 0.85);
        box-shadow: 0 0 18px rgba(168, 85, 247, 0.45);
        transform: translateY(-1px);
        color: #ffffff;
      }
      .tour-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(8, 12, 22, 0.85);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        z-index: 99999;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: tourFadeIn 0.25s ease forwards;
      }
      @keyframes tourFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .tour-modal-card {
        background: #0f172a;
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 20px;
        max-width: 580px;
        width: 100%;
        box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(99, 102, 241, 0.15);
        overflow: hidden;
        position: relative;
        animation: tourScaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      @keyframes tourScaleUp {
        from { opacity: 0; transform: scale(0.92) translateY(10px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
      .tour-header-banner {
        background: linear-gradient(135deg, #1e1b4b 0%, #311042 50%, #0f172a 100%);
        padding: 28px 28px 20px;
        border-bottom: 1px solid rgba(148, 163, 184, 0.15);
        position: relative;
      }
      .tour-close-btn {
        position: absolute;
        top: 18px;
        right: 18px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #94a3b8;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 16px;
        transition: all 0.2s ease;
      }
      .tour-close-btn:hover {
        background: rgba(239, 68, 68, 0.25);
        color: #f87171;
        border-color: rgba(239, 68, 68, 0.5);
      }
      .tour-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(99, 102, 241, 0.2);
        border: 1px solid rgba(99, 102, 241, 0.4);
        color: #818cf8;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        padding: 4px 10px;
        border-radius: 9999px;
        margin-bottom: 12px;
      }
      .tour-title-row {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .tour-icon-box {
        font-size: 32px;
        line-height: 1;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        width: 54px;
        height: 54px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .tour-slide-title {
        font-size: 20px;
        font-weight: 800;
        color: #ffffff;
        margin: 0;
        line-height: 1.25;
      }
      .tour-slide-tagline {
        font-size: 13px;
        color: #94a3b8;
        margin: 3px 0 0;
      }
      .tour-body {
        padding: 24px 28px;
      }
      .tour-description {
        font-size: 14px;
        line-height: 1.6;
        color: #cbd5e1;
        margin-bottom: 18px;
      }
      .tour-highlights-box {
        background: rgba(15, 23, 42, 0.7);
        border: 1px solid rgba(148, 163, 184, 0.12);
        border-radius: 12px;
        padding: 14px 16px;
        margin-bottom: 22px;
      }
      .tour-highlight-item {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        font-size: 13px;
        color: #e2e8f0;
        margin-bottom: 8px;
      }
      .tour-highlight-item:last-child {
        margin-bottom: 0;
      }
      .tour-check {
        color: #10b981;
        font-weight: 800;
      }
      .tour-footer {
        padding: 16px 28px 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-top: 1px solid rgba(148, 163, 184, 0.12);
      }
      .tour-dots-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .tour-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: rgba(148, 163, 184, 0.25);
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .tour-dot.active {
        background: #6366f1;
        width: 26px;
        border-radius: 9999px;
        box-shadow: 0 0 10px rgba(99, 102, 241, 0.6);
      }
      .tour-btn-group {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .tour-btn-secondary {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(148, 163, 184, 0.2);
        color: #cbd5e1;
        padding: 8px 16px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .tour-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
      }
      .tour-btn-primary {
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        border: 1px solid rgba(139, 92, 246, 0.6);
        color: #ffffff;
        padding: 8px 18px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
      }
      .tour-btn-primary:hover {
        background: linear-gradient(135deg, #4f46e5, #7c3aed);
        box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
        transform: translateY(-1px);
      }
    `;
    document.head.appendChild(style);
  }

  function injectTourModal() {
    if (document.getElementById('discover-app-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'discover-app-modal';
    modal.className = 'tour-backdrop';
    modal.innerHTML = `
      <div class="tour-modal-card" role="dialog" aria-modal="true">
        <div class="tour-header-banner">
          <button type="button" class="tour-close-btn" id="tour-btn-close" title="Close Walkthrough">✕</button>
          <div class="tour-badge" id="tour-slide-badge">Step 1 of 4 • Welcome</div>
          <div class="tour-title-row">
            <div class="tour-icon-box" id="tour-slide-icon">🧠</div>
            <div>
              <h2 class="tour-slide-title" id="tour-slide-title">AI Performance Prediction</h2>
              <p class="tour-slide-tagline" id="tour-slide-tagline">Predict academic outcomes with precision</p>
            </div>
          </div>
        </div>

        <div class="tour-body">
          <p class="tour-description" id="tour-slide-desc"></p>
          <div class="tour-highlights-box" id="tour-highlights-container"></div>
        </div>

        <div class="tour-footer">
          <div class="tour-dots-row" id="tour-dots-container"></div>
          <div class="tour-btn-group">
            <button type="button" class="tour-btn-secondary" id="tour-btn-prev" style="display: none;">Back</button>
            <button type="button" class="tour-btn-primary" id="tour-btn-next">Next ➔</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    document.getElementById('tour-btn-close').addEventListener('click', closeTour);
    document.getElementById('tour-btn-prev').addEventListener('click', () => {
      if (currentSlide > 0) {
        currentSlide--;
        renderSlide(currentSlide);
      }
    });
    document.getElementById('tour-btn-next').addEventListener('click', () => {
      if (currentSlide < TOUR_SLIDES.length - 1) {
        currentSlide++;
        renderSlide(currentSlide);
      } else {
        closeTour();
      }
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeTour();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (modal.style.display === 'flex') {
        if (e.key === 'Escape') closeTour();
        if (e.key === 'ArrowRight') {
          if (currentSlide < TOUR_SLIDES.length - 1) {
            currentSlide++;
            renderSlide(currentSlide);
          }
        }
        if (e.key === 'ArrowLeft') {
          if (currentSlide > 0) {
            currentSlide--;
            renderSlide(currentSlide);
          }
        }
      }
    });
  }

  function renderSlide(index) {
    const slide = TOUR_SLIDES[index];
    if (!slide) return;

    document.getElementById('tour-slide-badge').textContent = slide.badge;
    document.getElementById('tour-slide-icon').textContent = slide.icon;
    document.getElementById('tour-slide-title').textContent = slide.title;
    document.getElementById('tour-slide-tagline').textContent = slide.tagline;
    document.getElementById('tour-slide-desc').textContent = slide.description;

    const highlightsContainer = document.getElementById('tour-highlights-container');
    highlightsContainer.innerHTML = slide.highlights.map(h => `
      <div class="tour-highlight-item">
        <span class="tour-check">✓</span>
        <span>${h}</span>
      </div>
    `).join('');

    const prevBtn = document.getElementById('tour-btn-prev');
    const nextBtn = document.getElementById('tour-btn-next');

    prevBtn.style.display = index === 0 ? 'none' : 'inline-block';
    nextBtn.textContent = slide.actionText;

    // Render dots
    const dotsContainer = document.getElementById('tour-dots-container');
    dotsContainer.innerHTML = TOUR_SLIDES.map((_, i) => `
      <div class="tour-dot ${i === index ? 'active' : ''}" data-index="${i}"></div>
    `).join('');

    dotsContainer.querySelectorAll('.tour-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        currentSlide = parseInt(dot.getAttribute('data-index'), 10);
        renderSlide(currentSlide);
      });
    });
  }

  function openTour(slideIndex = 0) {
    const modal = document.getElementById('discover-app-modal');
    if (!modal) return;

    currentSlide = slideIndex;
    renderSlide(currentSlide);
    modal.style.display = 'flex';
  }

  function closeTour() {
    const modal = document.getElementById('discover-app-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  function injectNavbarDiscoverButton() {
    // Look for navbar actions container
    const navActions = document.querySelector('.navbar-actions') || document.querySelector('.topbar-actions') || document.querySelector('.nav-actions');
    
    if (navActions && !document.getElementById('btn-discover-tour')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'btn-discover-tour';
      btn.className = 'tour-nav-btn';
      btn.innerHTML = '<span>✨</span><span>Discover App</span>';
      btn.title = 'Explore interactive guided tour';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openTour(0);
      });

      // Insert at the beginning of navbar actions
      navActions.insertBefore(btn, navActions.firstChild);
    }
  }

  // Expose globally
  window.openDiscoverTour = openTour;
  window.closeDiscoverTour = closeTour;

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTour);
  } else {
    initTour();
  }
})();
