import { useNavigate } from "react-router-dom";
import "./Landing.css";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      {/* Background Effects */}
      <div className="landing-bg">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
        <div className="grid-overlay"></div>
      </div>

      {/* Navbar */}
      <nav className="landing-nav">
        <div className="nav-logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">SYNAPSE</span>
        </div>
        <div className="nav-links">
          <button className="btn-secondary btn-sm" onClick={() => navigate("/login")}>
            Log In
          </button>
          <button className="btn-primary btn-sm" onClick={() => navigate("/signup")}>
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero animate-fade">
        <div className="hero-badge">🚀 AI-Powered Code Generation</div>
        <h1 className="hero-title">
          Build Full-Stack Apps
          <span className="gradient-text"> in Seconds</span>
        </h1>
        <p className="hero-subtitle">
          SYNAPSE uses multi-agent AI to plan, execute, review, and debug
          complete web applications from a single text prompt.
        </p>
        <div className="hero-actions">
          <button className="btn-primary" onClick={() => navigate("/dashboard")}>
            Launch Dashboard →
          </button>
          <button className="btn-secondary" onClick={() => navigate("/login")}>
            Sign In
          </button>
        </div>

        {/* Stats */}
        <div className="hero-stats">
          <div className="stat">
            <span className="stat-value">4</span>
            <span className="stat-label">AI Agents</span>
          </div>
          <div className="stat">
            <span className="stat-value">3</span>
            <span className="stat-label">LLM Providers</span>
          </div>
          <div className="stat">
            <span className="stat-value">∞</span>
            <span className="stat-label">Possibilities</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features animate-slide">
        <div className="feature-card glass">
          <div className="feature-icon">🧠</div>
          <h3>Planner Agent</h3>
          <p>Breaks your idea into structured tasks with file-level precision.</p>
        </div>
        <div className="feature-card glass">
          <div className="feature-icon">⚙️</div>
          <h3>Executor Agent</h3>
          <p>Generates complete, production-ready code for every file.</p>
        </div>
        <div className="feature-card glass">
          <div className="feature-icon">🔍</div>
          <h3>Reviewer Agent</h3>
          <p>Catches bugs, missing imports, and structural issues automatically.</p>
        </div>
        <div className="feature-card glass">
          <div className="feature-icon">🐛</div>
          <h3>Debugger Agent</h3>
          <p>Chat-based AI debugger that fixes errors and generates new features.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>Built with ❤️ by SYNAPSE &mdash; Multi-Agent Code Generation Platform</p>
      </footer>
    </div>
  );
}
