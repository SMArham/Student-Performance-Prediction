/**
 * ==============================================================================
 * Student Performance Prediction & Analytics System
 * Interactive Onboarding Spotlight Tour Engine
 * Features: Element Spotlight, Backdrop Blur, Concise Explanations, Cross-Page Flow
 * ==============================================================================
 */

(function () {
  "use strict";

  class SppTourEngine {
    constructor() {
      this.currentStep = 0;
      this.steps = [];
      this.backdropEl = null;
      this.highlightEl = null;
      this.popoverEl = null;
      this.activeTarget = null;
      this.boundReposition = this.reposition.bind(this);
      this.boundKeyHandler = this.handleKeydown.bind(this);

      this.init();
    }

    init() {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => this.bootstrap());
      } else {
        this.bootstrap();
      }
    }

    bootstrap() {
      this.createTourDOMElements();
      this.bindSidebarButtons();
      this.checkAutoStart();
    }

    createTourDOMElements() {
      if (document.getElementById("spp-tour-backdrop")) return;

      // 1. Backdrop Glass Blur
      this.backdropEl = document.createElement("div");
      this.backdropEl.id = "spp-tour-backdrop";
      document.body.appendChild(this.backdropEl);

      // 2. Spotlight Cutout / Glow Ring
      this.highlightEl = document.createElement("div");
      this.highlightEl.id = "spp-tour-highlight-box";
      document.body.appendChild(this.highlightEl);

      // 3. Floating Popover Card
      this.popoverEl = document.createElement("div");
      this.popoverEl.id = "spp-tour-popover";
      this.popoverEl.innerHTML = `
        <div class="spp-tour-header">
          <span class="spp-tour-badge" id="spp-tour-step-badge">Step 1 of 5</span>
          <button type="button" class="spp-tour-close-btn" id="spp-tour-btn-close" title="Close Tour">&times;</button>
        </div>
        <div class="spp-tour-title" id="spp-tour-step-title">
          <span class="tour-icon" id="spp-tour-step-icon">🧭</span>
          <span id="spp-tour-step-heading">Welcome</span>
        </div>
        <div class="spp-tour-body" id="spp-tour-step-body">
          Loading explanation...
        </div>
        <div class="spp-tour-footer">
          <button type="button" class="spp-tour-skip-link" id="spp-tour-btn-skip">Skip Tour</button>
          <div class="spp-tour-btn-group">
            <button type="button" class="spp-tour-btn spp-tour-btn-prev" id="spp-tour-btn-prev">← Back</button>
            <button type="button" class="spp-tour-btn spp-tour-btn-next" id="spp-tour-btn-next">Next →</button>
          </div>
        </div>
      `;
      document.body.appendChild(this.popoverEl);

      // Bind events
      document.getElementById("spp-tour-btn-close").addEventListener("click", () => this.skip());
      document.getElementById("spp-tour-btn-skip").addEventListener("click", () => this.skip());
      document.getElementById("spp-tour-btn-prev").addEventListener("click", () => this.prev());
      document.getElementById("spp-tour-btn-next").addEventListener("click", () => this.next());
      this.backdropEl.addEventListener("click", () => this.skip());
    }

    bindSidebarButtons() {
      // Wire any button with class .tour-btn or id #rail-tour-btn
      document.querySelectorAll(".tour-btn, #rail-tour-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          this.start(true);
        });
      });
    }

    getPageContext() {
      const path = window.location.pathname.toLowerCase();
      if (path.includes("teacher-dashboard")) return "teacher-dashboard";
      if (path.includes("teacher-prediction")) return "teacher-prediction";
      if (path.includes("teacher-analytics")) return "teacher-analytics";
      if (path.includes("dashboard")) return "dashboard";
      if (path.includes("prediction")) return "prediction";
      if (path.includes("analytics")) return "analytics";
      return "dashboard";
    }

    buildSteps() {
      const page = this.getPageContext();

      if (page === "dashboard") {
        return [
          {
            target: ".left-action-rail",
            icon: "🧭",
            title: "Quick Action Navigation",
            body: "Your central hub rail. Switch instantly between <strong>Dashboard</strong>, <strong>Run AI Forecast</strong>, and <strong>Deep-Dive Analytics</strong>.",
            placement: "right"
          },
          {
            target: ".dashboard-hero",
            icon: "⚡",
            title: "Welcome & Quick Launch",
            body: "Review your student identity and launch an instant machine learning prediction or analytics audit with one click.",
            placement: "bottom"
          },
          {
            target: ".kpi-quad-grid",
            icon: "📊",
            title: "Executive Academic KPIs",
            body: "Live cards showing your <strong>Cumulative CGPA</strong>, Semester Standing, Target Gap, and Preparation index.",
            placement: "bottom"
          },
          {
            target: "#hero-action-primary",
            icon: "🚀",
            title: "Next: AI Forecast Suite",
            body: "Ready to test how study hours and attendance affect your grades? Let's explore the prediction engine!",
            placement: "bottom",
            nextLabel: "Explore Forecast →",
            onNext: () => {
              window.location.href = "prediction.html?tour=continue";
            }
          }
        ];
      }

      if (page === "prediction") {
        return [
          {
            target: "#student-stepper",
            icon: "🎯",
            title: "5-Step AI Workflow",
            body: "Guided 5-step form: Education Level, Academics & Courses, Learning Habits, and Self-Assessment.",
            placement: "bottom"
          },
          {
            target: "#student-step-1",
            icon: "📝",
            title: "Step 1: Select Education Stage",
            body: "Choose your level (University, Matric, Secondary, or Primary) to adapt ML feature weights and grading scales.",
            placement: "bottom"
          },
          {
            target: "#btn-step1-next",
            icon: "⚡",
            title: "Step Progression & Validation",
            body: "Proceed smoothly through attendance, course marks, and study hours for instant prediction and risk badges.",
            placement: "top"
          },
          {
            target: ".left-action-rail a[href*='analytics']",
            icon: "📈",
            title: "Next: Live Analytics Hub",
            body: "Now see your longitudinal progression and factor drivers on interactive visual charts!",
            placement: "right",
            nextLabel: "Explore Analytics →",
            onNext: () => {
              window.location.href = "analytics.html?tour=continue";
            }
          }
        ];
      }

      if (page === "analytics") {
        return [
          {
            target: ".kpi-grid",
            icon: "📊",
            title: "Analytics Executive KPIs",
            body: "High-level summary of total model evaluations, latest predicted grade, growth delta, and intervention risk tier.",
            placement: "bottom"
          },
          {
            target: ".analytics-main-grid > .card:nth-of-type(1)",
            icon: "📉",
            title: "Graph 1: Academic Trajectory",
            body: "Visualizes your historical predicted score progression over time against target benchmark goals.",
            placement: "bottom"
          },
          {
            target: ".analytics-main-grid > .card:nth-of-type(2)",
            icon: "🛡️",
            title: "Graph 2: Standing & Risk Tiers",
            body: "Evaluates your performance across calibrated tiers: Honors (≥80%), Proficient, Standard, and At-Risk.",
            placement: "bottom"
          },
          {
            target: ".analytics-deep-grid > .card:nth-of-type(1)",
            icon: "📚",
            title: "Graph 3: Course Domain Mastery",
            body: "Dynamic competency evaluation derived from your logged coursework assessments.",
            placement: "top"
          },
          {
            target: ".analytics-deep-grid > .card:nth-of-type(2)",
            icon: "⏱️",
            title: "Graph 4: Study Effort vs Outcome",
            body: "Correlates daily self-study discipline and attendance against your forecasted final scores.",
            placement: "top"
          },
          {
            target: null, // Center spotlight celebration
            icon: "🎉",
            title: "Platform Tour Complete!",
            body: "You are all set! You can replay this tour anytime using the <strong>Tour (🧭)</strong> button in the left sidebar.",
            placement: "center",
            nextLabel: "Finish Tour 🚀"
          }
        ];
      }

      if (page === "teacher-dashboard") {
        return [
          {
            target: ".left-action-rail",
            icon: "🧭",
            title: "Instructor Action Rail",
            body: "Switch easily between <strong>Class Dashboard</strong>, <strong>Teacher Prediction</strong>, and <strong>Cohort Analytics</strong>.",
            placement: "right"
          },
          {
            target: ".kpi-grid-4col",
            icon: "📊",
            title: "Cohort Performance KPIs",
            body: "Real-time class size, cohort pass rate, critical high-risk student intervention count, and composite grade average.",
            placement: "bottom"
          },
          {
            target: ".card:has(#student-table-body), #table-card",
            icon: "📋",
            title: "Diagnostic Student Ledger",
            body: "Audit individual student profiles, attendance rates, predicted final scores, and academic risk classifications.",
            placement: "top"
          },
          {
            target: "a[href*='teacher-analytics']",
            icon: "📈",
            title: "Next: Cohort Analytics",
            body: "Explore class-wide grade distribution curves, subject risk clusters, and longitudinal pedagogical trends.",
            placement: "bottom",
            nextLabel: "View Analytics →",
            onNext: () => {
              window.location.href = "teacher-analytics.html?tour=continue";
            }
          }
        ];
      }

      if (page === "teacher-prediction") {
        return [
          {
            target: ".prediction-container, form",
            icon: "⚡",
            title: "Student Diagnostic Engine",
            body: "Input student diagnostic parameters to generate automated machine learning forecasts and risk ratings.",
            placement: "bottom"
          },
          {
            target: ".left-action-rail a[href*='teacher-analytics']",
            icon: "📈",
            title: "Cohort Analytics Suite",
            body: "Review collective student distributions and pedagogical risk curves.",
            placement: "right",
            nextLabel: "Go to Analytics →",
            onNext: () => {
              window.location.href = "teacher-analytics.html?tour=continue";
            }
          }
        ];
      }

      if (page === "teacher-analytics") {
        return [
          {
            target: ".kpi-grid, .kpi-grid-4col",
            icon: "📊",
            title: "Cohort Analytics KPIs",
            body: "Classwide evaluation volume, aggregate grade health, and students needing intervention.",
            placement: "bottom"
          },
          {
            target: ".analytics-main-grid, .chart-card",
            icon: "📉",
            title: "Visual Diagnostic Charts",
            body: "Interactive charts showing score bell curves, subject vulnerability rankings, and attendance correlation.",
            placement: "top"
          },
          {
            target: null,
            icon: "🎉",
            title: "Instructor Tour Complete!",
            body: "You now have full visibility into automated student performance evaluation and predictive pedagogical analytics.",
            placement: "center",
            nextLabel: "Finish Tour 🚀"
          }
        ];
      }

      return [];
    }

    checkAutoStart() {
      const urlParams = new URLSearchParams(window.location.search);
      const hasTourParam = urlParams.get("tour");
      const isCompleted = localStorage.getItem("spp_tour_completed") === "true";
      const isNewRegistration = localStorage.getItem("spp_new_registration") === "true";

      if (hasTourParam === "continue" || hasTourParam === "start") {
        setTimeout(() => this.start(), 350);
        // Clean URL parameter without reloading
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      } else if (!isCompleted || isNewRegistration) {
        // Auto-start for new users / first session
        setTimeout(() => this.start(), 600);
      }
    }

    start(force = false) {
      this.steps = this.buildSteps();
      if (!this.steps || this.steps.length === 0) return;

      this.currentStep = 0;
      this.backdropEl.classList.add("active");
      this.highlightEl.classList.add("active");
      this.popoverEl.classList.add("active");

      window.addEventListener("resize", this.boundReposition, { passive: true });
      window.addEventListener("scroll", this.boundReposition, { passive: true });
      window.addEventListener("keydown", this.boundKeyHandler);

      this.renderStep(0);
    }

    renderStep(index) {
      if (index < 0 || index >= this.steps.length) {
        this.finish();
        return;
      }

      this.currentStep = index;
      const step = this.steps[index];

      // Update Popover content
      document.getElementById("spp-tour-step-badge").innerText = `Step ${index + 1} of ${this.steps.length}`;
      document.getElementById("spp-tour-step-icon").innerText = step.icon || "💡";
      document.getElementById("spp-tour-step-heading").innerText = step.title;
      document.getElementById("spp-tour-step-body").innerHTML = step.body;

      // Update Buttons
      const prevBtn = document.getElementById("spp-tour-btn-prev");
      const nextBtn = document.getElementById("spp-tour-btn-next");

      prevBtn.disabled = index === 0;
      if (step.nextLabel) {
        nextBtn.innerText = step.nextLabel;
      } else if (index === this.steps.length - 1) {
        nextBtn.innerText = "Finish Tour 🚀";
      } else {
        nextBtn.innerText = "Next →";
      }

      // Handle Target Highlighting
      let targetEl = null;
      if (step.target) {
        targetEl = document.querySelector(step.target);
      }

      this.activeTarget = targetEl;

      if (targetEl) {
        // Smooth scroll element into view if not visible
        targetEl.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });

        // Update spotlight position with smooth delay for scroll
        setTimeout(() => {
          this.positionHighlight(targetEl);
          this.positionPopover(targetEl, step.placement || "bottom");
        }, 120);
      } else {
        // Center modal fallback (e.g. final celebration step)
        this.positionCenter();
      }
    }

    positionHighlight(el) {
      const rect = el.getBoundingClientRect();
      const pad = 6;
      this.highlightEl.style.top = `${Math.max(0, rect.top - pad)}px`;
      this.highlightEl.style.left = `${Math.max(0, rect.left - pad)}px`;
      this.highlightEl.style.width = `${rect.width + pad * 2}px`;
      this.highlightEl.style.height = `${rect.height + pad * 2}px`;
      this.highlightEl.style.borderRadius = "12px";
      this.highlightEl.style.opacity = "1";
    }

    positionPopover(targetEl, placement) {
      const popover = this.popoverEl;
      const tRect = targetEl.getBoundingClientRect();
      const pRect = popover.getBoundingClientRect();
      const pad = 12;

      let top = 0;
      let left = 0;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (placement === "right") {
        top = tRect.top + (tRect.height - pRect.height) / 2;
        left = tRect.right + pad;
        if (left + pRect.width > viewportWidth - 10) {
          placement = "bottom"; // Fallback if overflows right
        }
      }

      if (placement === "bottom") {
        top = tRect.bottom + pad;
        left = tRect.left + (tRect.width - pRect.width) / 2;
        if (top + pRect.height > viewportHeight - 10) {
          top = Math.max(10, tRect.top - pRect.height - pad);
        }
      } else if (placement === "top") {
        top = tRect.top - pRect.height - pad;
        left = tRect.left + (tRect.width - pRect.width) / 2;
        if (top < 10) {
          top = tRect.bottom + pad;
        }
      }

      // Bound within viewport horizontally
      if (left < 12) left = 12;
      if (left + pRect.width > viewportWidth - 12) {
        left = viewportWidth - pRect.width - 12;
      }

      // Bound within viewport vertically
      if (top < 12) top = 12;
      if (top + pRect.height > viewportHeight - 12) {
        top = viewportHeight - pRect.height - 12;
      }

      popover.style.top = `${top}px`;
      popover.style.left = `${left}px`;
    }

    positionCenter() {
      // Hide highlight ring or center it
      this.highlightEl.style.opacity = "0";

      const popover = this.popoverEl;
      const pRect = popover.getBoundingClientRect();
      const top = Math.max(20, (window.innerHeight - pRect.height) / 2);
      const left = Math.max(12, (window.innerWidth - pRect.width) / 2);

      popover.style.top = `${top}px`;
      popover.style.left = `${left}px`;
    }

    reposition() {
      if (this.activeTarget) {
        const step = this.steps[this.currentStep];
        this.positionHighlight(this.activeTarget);
        this.positionPopover(this.activeTarget, step?.placement || "bottom");
      } else {
        this.positionCenter();
      }
    }

    handleKeydown(e) {
      if (e.key === "Escape") {
        this.skip();
      } else if (e.key === "ArrowRight") {
        this.next();
      } else if (e.key === "ArrowLeft") {
        this.prev();
      }
    }

    next() {
      const step = this.steps[this.currentStep];
      if (step && typeof step.onNext === "function") {
        step.onNext();
        return;
      }

      if (this.currentStep < this.steps.length - 1) {
        this.renderStep(this.currentStep + 1);
      } else {
        this.finish();
      }
    }

    prev() {
      if (this.currentStep > 0) {
        this.renderStep(this.currentStep - 1);
      }
    }

    skip() {
      this.cleanup();
      localStorage.setItem("spp_tour_completed", "true");
      localStorage.removeItem("spp_new_registration");
    }

    finish() {
      this.cleanup();
      localStorage.setItem("spp_tour_completed", "true");
      localStorage.removeItem("spp_new_registration");
    }

    cleanup() {
      if (this.backdropEl) this.backdropEl.classList.remove("active");
      if (this.highlightEl) this.highlightEl.classList.remove("active");
      if (this.popoverEl) this.popoverEl.classList.remove("active");

      window.removeEventListener("resize", this.boundReposition);
      window.removeEventListener("scroll", this.boundReposition);
      window.removeEventListener("keydown", this.boundKeyHandler);
    }
  }

  // Instantiate globally
  window.sppTour = new SppTourEngine();
})();
