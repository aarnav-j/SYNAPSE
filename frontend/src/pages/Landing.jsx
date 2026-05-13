import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import BlurText from "../components/animations/BlurText";
import BorderGlow from "../components/animations/BorderGlow";
import BounceCards from "../components/animations/BounceCards";
import Dock from "../components/animations/Dock";

// Icons for the Dock
import { VscHome, VscDashboard, VscGithubAction, VscSparkle } from "react-icons/vsc";

import "./Landing.css";

export default function Landing() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState("dark"); // "dark" or "light"

  const toggleTheme = () => {
    setTheme(t => (t === "dark" ? "light" : "dark"));
  };

  const images = [
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?q=80&w=400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?q=80&w=400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1504639725590-34d0984388bd?q=80&w=400&auto=format&fit=crop"
  ];

  const dockItems = [
    { icon: <VscHome size={24} />, label: 'Home', onClick: () => window.scrollTo({top: 0, behavior: 'smooth'}) },
    { icon: <VscSparkle size={24} />, label: 'Features', onClick: () => document.getElementById('features').scrollIntoView({behavior: 'smooth'}) },
    { icon: <VscGithubAction size={24} />, label: 'Github', onClick: () => window.open('https://github.com', '_blank') },
    { icon: <VscDashboard size={24} />, label: 'Dashboard', onClick: () => navigate("/dashboard") },
  ];

  return (
    <div className={`landing ${theme === "light" ? "light-mode" : ""}`}>
      {/* Background Effects */}
      <div className="aurora-bg"></div>
      <div className="grid-overlay"></div>

      <div className="landing-content">
        {/* Navbar */}
        <nav className="landing-nav">
          <div className="nav-logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">SYNAPSE</span>
          </div>
          <div className="nav-controls">
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle Theme">
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <button className="btn-login" onClick={() => navigate("/login")}>
              Log In
            </button>
          </div>
        </nav>

        {/* Hero */}
        <section className="hero">
          <div className="hero-badge">🚀 The Next Generation IDE</div>
          
          <BlurText
            text="Build Full-Stack Apps"
            className="hero-title"
            delay={100}
            animateBy="words"
            direction="top"
          />
          
          <BlurText
            text="In Seconds."
            className="hero-title gradient-text"
            delay={150}
            animateBy="words"
            direction="bottom"
          />
          
          <p className="hero-subtitle">
            SYNAPSE uses multi-agent AI to plan, execute, review, and debug
            complete web applications from a single text prompt. Experience the future of coding.
          </p>

          <div className="hero-visual">
            <BounceCards
              images={images}
              containerWidth={600}
              containerHeight={300}
              animationDelay={1}
              animationStagger={0.1}
            />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="features-section">
          <BlurText
            text="Powered by Multi-Agent Architecture"
            className="features-title"
            delay={50}
            animateBy="words"
          />
          
          <div className="features-grid">
            <BorderGlow glowColor="40 80 80" backgroundColor={theme === 'dark' ? '#0f111a' : '#ffffff'} animated={true}>
              <div className="feature-card-content" style={{ padding: '2rem' }}>
                <div className="feature-icon">🧠</div>
                <h3>Planner Agent</h3>
                <p>Breaks your idea into structured tasks with file-level precision and architectural design.</p>
              </div>
            </BorderGlow>

            <BorderGlow glowColor="280 80 80" backgroundColor={theme === 'dark' ? '#0f111a' : '#ffffff'} animated={true}>
              <div className="feature-card-content" style={{ padding: '2rem' }}>
                <div className="feature-icon">⚙️</div>
                <h3>Executor Agent</h3>
                <p>Generates complete, production-ready vanilla HTML/CSS/JS/Node.js code for every file.</p>
              </div>
            </BorderGlow>

            <BorderGlow glowColor="180 80 80" backgroundColor={theme === 'dark' ? '#0f111a' : '#ffffff'} animated={true}>
              <div className="feature-card-content" style={{ padding: '2rem' }}>
                <div className="feature-icon">🐛</div>
                <h3>Debugger Agent</h3>
                <p>Chat-based AI debugger integrated into the IDE that fixes live errors and implements new features.</p>
              </div>
            </BorderGlow>
          </div>
        </section>
      </div>

      {/* Floating Dock */}
      <div className="dock-wrapper">
        <Dock items={dockItems} panelHeight={60} baseItemSize={45} magnification={65} />
      </div>
    </div>
  );
}
