import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import BlurText from "../components/animations/BlurText";
import BorderGlow from "../components/animations/BorderGlow";
import BounceCards from "../components/animations/BounceCards";
import Dock from "../components/animations/Dock";
import { VscHome, VscDashboard, VscGithubAction, VscSparkle } from "react-icons/vsc";
import DarkVeil from "../components/animations/DarkVeil";
import Magnet from "../components/animations/Magnet";
import ClickSpark from "../components/animations/ClickSpark";

export default function Landing() {
  const navigate = useNavigate();

  const toggleTheme = () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  };

  const currentTheme = () => document.documentElement.getAttribute("data-theme") || "dark";

  useEffect(() => {
    const handleScroll = () => {
      const nav = document.querySelector(".navbar");
      if (nav) {
        if (window.scrollY > 80) {
          nav.classList.add("scrolled");
        } else {
          nav.classList.remove("scrolled");
        }
      }
    };
    window.addEventListener("scroll", handleScroll);

    // Intersection Observer for scroll animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll(".scroll-reveal, .scroll-reveal-left, .scroll-reveal-right, .animated-underline").forEach((el) => {
      observer.observe(el);
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, []);

  const images = [
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1614729939124-032f0b56c9ce?q=80&w=400&auto=format&fit=crop"
  ];

  const dockItems = [
    { icon: <VscHome size={24} />, label: "Home", onClick: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
    { icon: <VscSparkle size={24} />, label: "Features", onClick: () => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" }) },
    { icon: <VscGithubAction size={24} />, label: "Github", onClick: () => window.open("https://github.com", "_blank") },
    { icon: <VscDashboard size={24} />, label: "Dashboard", onClick: () => navigate("/dashboard") },
  ];

  return (
    <ClickSpark sparkColor={currentTheme() === "dark" ? "#fff" : "#000"} sparkSize={10} sparkRadius={15} sparkCount={8} duration={400}>
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, opacity: currentTheme() === 'dark' ? 0.6 : 0.2, pointerEvents: 'none' }}>
        <DarkVeil hueShift={260} noiseIntensity={0.05} speed={0.2} scanlineIntensity={0.1} />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <nav className="navbar">
        <div className="nav-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          SYNAPSE
        </div>
        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <a href="#how-it-works">How it Works</a>
        </div>
        <div className="nav-actions">
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          </button>
          <button className="btn btn-primary" onClick={() => navigate("/dashboard")}>
            Get Started
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>
      </nav>

      {/* ━━━ HERO ━━━ */}
      <section id="home" className="hero">
        <div className="hero-bg-mesh"></div>
        <div className="hero-content">
          <div className="pill-badge">✨ Multi-Agent AI Architecture</div>

          <Magnet padding={50} magnetStrength={3}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
              <div style={{ marginBottom: '-20px' }}>
                <BlurText
                  text="Build Full-Stack Apps"
                  className="hero-title"
                  delay={100}
                  animateBy="words"
                  direction="top"
                />
              </div>
              <BlurText
                text="In Seconds."
                className="hero-title"
                delay={150}
                animateBy="words"
                direction="bottom"
                stepDuration={0.5}
              />
            </div>
          </Magnet>

          <p className="hero-subtitle">
            SYNAPSE is an autonomous IDE that plans, writes, reviews, and debugs complete web applications from a single text prompt.
          </p>
          <div className="hero-ctas">
            <button className="btn btn-primary" onClick={() => navigate("/dashboard")}>
              Launch Dashboard
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
            <button className="btn btn-ghost" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
              View Features
            </button>
          </div>
        </div>
        <div className="hero-visual">
          <BounceCards
            images={images}
            containerWidth={600}
            containerHeight={400}
            animationDelay={0.8}
            animationStagger={0.08}
            easeType="elastic.out(1, 0.8)"
          />
        </div>
      </section>

      {/* ━━━ FEATURES ━━━ */}
      <section id="features" className="section" style={{ paddingTop: '60px' }}>
        <div className="section-header">
          <h2 className="animated-underline scroll-reveal">The Intelligence Engine</h2>
        </div>
        <div className="features-grid">
          <div className="scroll-reveal stagger-1">
            <BorderGlow glowColor="260 80 70" glowRadius={2} backgroundColor={currentTheme() === "dark" ? "#161525" : "#ffffff"} animated={true}>
              <div style={{ padding: "40px 32px" }}>
                <div className="feature-icon">🧠</div>
                <h3>Planner Agent</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "15px", marginTop: "12px" }}>Deconstructs your natural language prompt into a detailed system architecture, file manifest, and execution roadmap.</p>
              </div>
            </BorderGlow>
          </div>
          <div className="scroll-reveal stagger-2">
            <BorderGlow glowColor="170 80 70" glowRadius={2} backgroundColor={currentTheme() === "dark" ? "#161525" : "#ffffff"} animated={true}>
              <div style={{ padding: "40px 32px" }}>
                <div className="feature-icon">⚡</div>
                <h3>Executor Agent</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "15px", marginTop: "12px" }}>Writes production-grade frontend and backend code iteratively, maintaining perfect context across the entire codebase.</p>
              </div>
            </BorderGlow>
          </div>
          <div className="scroll-reveal stagger-3">
            <BorderGlow glowColor="40 80 70" glowRadius={2} backgroundColor={currentTheme() === "dark" ? "#161525" : "#ffffff"} animated={true}>
              <div style={{ padding: "40px 32px" }}>
                <div className="feature-icon">🐛</div>
                <h3>Review & Debug</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "15px", marginTop: "12px" }}>Automatically scans for errors, validates logic, and provides an interactive chat interface to resolve complex runtime bugs.</p>
              </div>
            </BorderGlow>
          </div>
        </div>
      </section>

      {/* ━━━ HOW IT WORKS ━━━ */}
      <section id="how-it-works" className="section">
        <div className="section-header">
          <h2 className="animated-underline scroll-reveal">How It Works</h2>
        </div>
        <div className="timeline">
          <div className="timeline-step scroll-reveal-left stagger-1">
            <div className="step-number">01</div>
            <div className="step-content">
              <h3>Describe Your Vision</h3>
              <p>Type a simple description of the application you want to build in plain English.</p>
            </div>
          </div>
          <div className="timeline-step scroll-reveal-left stagger-2">
            <div className="step-number">02</div>
            <div className="step-content">
              <h3>Architectural Planning</h3>
              <p>The AI generates a structural blueprint defining database schemas, API routes, and UI components.</p>
            </div>
          </div>
          <div className="timeline-step scroll-reveal-left stagger-3">
            <div className="step-number">03</div>
            <div className="step-content">
              <h3>Autonomous Execution</h3>
              <p>Code is generated file-by-file in real-time, instantly visible in the integrated editor.</p>
            </div>
          </div>
          <div className="timeline-step scroll-reveal-left stagger-4">
            <div className="step-number">04</div>
            <div className="step-content">
              <h3>Deploy & Download</h3>
              <p>Test the application live in the preview pane, refine via chat, and export the final repository.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ FOOTER ━━━ */}
      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="nav-brand">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              SYNAPSE
            </div>
            <p>Building the future of software development through autonomous multi-agent orchestration.</p>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <ul>
              <li><a href="#">Features</a></li>
              <li><a href="#">Pricing</a></li>
              <li><a href="#">Changelog</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Resources</h4>
            <ul>
              <li><a href="#">Documentation</a></li>
              <li><a href="#">API Reference</a></li>
              <li><a href="#">Community</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <ul>
              <li><a href="#">About</a></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 SYNAPSE AI. All rights reserved.</span>
          <span>Designed with precision.</span>
        </div>
      </footer>

      {/* ━━━ FLOATING DOCK (Animated) ━━━ */}
      <div className="dock-wrapper" style={{ position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)", zIndex: 100 }}>
        <Dock items={dockItems} panelHeight={60} baseItemSize={45} magnification={65} />
      </div>
      </div>
    </ClickSpark>
  );
}
