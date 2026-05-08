import { useNavigate } from "react-router-dom";
import "./Auth.css";

export default function Login() {
  const navigate = useNavigate();

  const handleLogin = (e) => {
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
            <h2>Welcome Back</h2>
            <p>Sign in to your SYNAPSE account</p>
          </div>

          <form className="auth-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email</label>
              <input type="email" placeholder="you@example.com" className="form-input" />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" placeholder="••••••••" className="form-input" />
            </div>
            <button type="submit" className="btn-primary auth-btn">
              Sign In →
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Don't have an account?{" "}
              <span className="auth-link" onClick={() => navigate("/signup")}>
                Create one
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
