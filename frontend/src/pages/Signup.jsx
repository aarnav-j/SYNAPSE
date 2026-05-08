import { useNavigate } from "react-router-dom";
import "./Auth.css";

export default function Signup() {
  const navigate = useNavigate();

  const handleSignup = (e) => {
    e.preventDefault();
    // Auth is disabled — go straight to dashboard
    navigate("/dashboard");
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
      </div>

      <div className="auth-container animate-fade">
        <div className="auth-card glass glow-border">
          <div className="auth-header">
            <span className="logo-icon" onClick={() => navigate("/")}>⚡</span>
            <h2>Create Account</h2>
            <p>Start building full-stack apps today</p>
          </div>

          <form className="auth-form" onSubmit={handleSignup}>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" placeholder="John Doe" className="form-input" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" placeholder="you@example.com" className="form-input" />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" placeholder="••••••••" className="form-input" />
            </div>
            <button type="submit" className="btn-primary auth-btn">
              Create Account →
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Already have an account?{" "}
              <span className="auth-link" onClick={() => navigate("/login")}>
                Sign In
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
