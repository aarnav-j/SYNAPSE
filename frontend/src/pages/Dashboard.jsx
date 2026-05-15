import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  sendPrompt,
  getHistory,
  getProjectFiles,
  startDebugSession,
  sendDebugMessage,
  getDebugHistory,
  deleteProject,
  saveFile,
  runProject,
  stopProject as stopProjectAPI,
  restartProject,
  connectLogStream,
  getRuntimeStatus,
  getDebugSessions,
} from "../api";
import "./Dashboard.css";

const renderTerminalMessage = (message) => {
  if (!message) return null;
  // Match either "localhost:1234", "http://localhost:1234", "127.0.0.1:1234", or "port 1234"
  const urlRegex = /((?:https?:\/\/)?(?:localhost|127\.0\.0\.1):\d+|port\s+\d+)/gi;
  const parts = message.split(urlRegex);

  return parts.map((part, i) => {
    if (/^((?:https?:\/\/)?(?:localhost|127\.0\.0\.1):\d+|port\s+\d+)$/i.test(part)) {
      let url = part;
      let displayText = part;

      if (part.toLowerCase().startsWith('port')) {
        const portNum = part.match(/\d+/)[0];
        url = `http://localhost:${portNum}`;
      } else if (!part.startsWith('http')) {
        url = `http://${part}`;
      }

      return (
        <a
          key={i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="terminal-link"
          title="Click to open in browser"
          onClick={() => {
            // Click navigates naturally
          }}
        >
          {displayText}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

// ── Error Detection (static, outside component) ──
const ERROR_PATTERNS = [
  { pattern: /Cannot find module/i, type: "missing_module" },
  { pattern: /SyntaxError/i, type: "syntax_error" },
  { pattern: /EADDRINUSE/i, type: "port_conflict" },
  { pattern: /Unexpected token/i, type: "syntax_error" },
  { pattern: /ReferenceError/i, type: "reference_error" },
  { pattern: /TypeError/i, type: "type_error" },
  { pattern: /ENOENT/i, type: "file_not_found" },
];

const getErrorHint = (type, error) => {
  switch (type) {
    case "missing_module": {
      const match = error.match(/Cannot find module '([^']+)'/);
      return match ? `Module '${match[1]}' is missing. Click Apply Fix to install it.` : "A required module is missing.";
    }
    case "syntax_error": return "There's a syntax error in your code. Click Apply Fix to let the AI debugger analyze and fix it.";
    case "port_conflict": return "Port is already in use. Click Apply Fix to change the port or kill the conflicting process.";
    case "reference_error": return "A variable or function is referenced before being defined. Click Apply Fix to analyze.";
    case "type_error": return "A type error occurred. Click Apply Fix to have the AI fix it.";
    case "file_not_found": return "A file or directory was not found. Click Apply Fix to resolve the path issue.";
    default: return "An error was detected. Click Apply Fix to analyze.";
  }
};

export default function Dashboard() {
  const navigate = useNavigate();

  // ── Core State ──
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [isCreatingNewProject, setIsCreatingNewProject] = useState(false);

  // ── Editor State ──
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [editorContent, setEditorContent] = useState("");
  const [unsavedChanges, setUnsavedChanges] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef(null);

  // ── Runtime State ──
  const [runtimeStatus, setRuntimeStatus] = useState("stopped");
  const [terminalLogs, setTerminalLogs] = useState([]);
  const [activePanel, setActivePanel] = useState("terminal"); // terminal | preview | debug
  const [previewPort, setPreviewPort] = useState(3000);
  const terminalRef = useRef(null);
  const eventSourceRef = useRef(null);

  // ── Debug State ──
  const [debugSessionId, setDebugSessionId] = useState(null);
  const [debugChat, setDebugChat] = useState([]);
  const [debugInput, setDebugInput] = useState("");
  const [debugImage, setDebugImage] = useState(null);
  const [isDebugLoading, setIsDebugLoading] = useState(false);

  // ── Auto Error Detection State ──
  // eslint-disable-next-line no-unused-vars
  const [errorSuggestion, setErrorSuggestion] = useState(null);

  // ── Resizable Bottom Panel ──
  const [panelHeight, setPanelHeight] = useState(250);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(250);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      const delta = dragStartY.current - e.clientY;
      const newHeight = Math.min(Math.max(dragStartHeight.current + delta, 100), 600);
      setPanelHeight(newHeight);
    };
    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleDragStart = (e) => {
    isDragging.current = true;
    dragStartY.current = e.clientY;
    dragStartHeight.current = panelHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  // ── Data Fetching ──
  const fetchHistory = useCallback(async () => {
    try {
      const data = await getHistory();
      if (data.runs) setHistory(data.runs);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHistory();
  }, [fetchHistory]);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  // ?? Editor Actions ??
  const handleFileClick = (file) => {
    if (activeFile && editorContent !== activeFile.content) {
      setUnsavedChanges((prev) => ({ ...prev, [activeFile.file_path]: true }));
    }
    setActiveFile(file);
    setEditorContent(file.content || "");
  };

  const handleEditorChange = (e) => {
    const newContent = e.target.value;
    setEditorContent(newContent);
    if (activeFile && newContent !== activeFile.content) {
      setUnsavedChanges((prev) => ({ ...prev, [activeFile.file_path]: true }));
    } else if (activeFile) {
      setUnsavedChanges((prev) => {
        const copy = { ...prev };
        delete copy[activeFile.file_path];
        return copy;
      });
    }
  };

  const handleSaveFile = useCallback(async () => {
    if (!activeFile || !activeProject) return;
    setIsSaving(true);
    try {
      const res = await saveFile(activeProject.id, activeFile.file_path, editorContent);
      if (res.success) {
        setFiles((prev) =>
          prev.map((f) =>
            f.file_path === activeFile.file_path ? { ...f, content: editorContent } : f
          )
        );
        setActiveFile((prev) => ({ ...prev, content: editorContent }));
        setUnsavedChanges((prev) => {
          const copy = { ...prev };
          delete copy[activeFile.file_path];
          return copy;
        });
      }
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setIsSaving(false);
    }
  }, [activeFile, activeProject, editorContent]);





  const detectError = useCallback((errorLine) => {
    for (const { pattern, type } of ERROR_PATTERNS) {
      if (pattern.test(errorLine)) {
        setErrorSuggestion({
          type,
          error: errorLine,
          message: getErrorHint(type, errorLine),
        });
        return;
      }
    }
  }, []); // ERROR_PATTERNS and getErrorHint are module-level constants

  // Keyboard shortcut: Ctrl+S to save
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (activeFile && unsavedChanges[activeFile.file_path]) {
          handleSaveFile();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeFile, editorContent, unsavedChanges, handleSaveFile]);

  // ── SSE Log Stream ──
  const connectLogs = useCallback((projectId) => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = connectLogStream(projectId);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const logEntry = JSON.parse(event.data);
        setTerminalLogs((prev) => [...prev.slice(-499), logEntry]);
      } catch {
        // Ignore JSON parse error
      }
    };

    es.addEventListener("status", (event) => {
      try {
        const data = JSON.parse(event.data);
        setRuntimeStatus(data.status);
      } catch {
        // Ignore JSON parse error
      }
    });

    es.addEventListener("runtime_error", (event) => {
      try {
        const data = JSON.parse(event.data);
        detectError(data.error);
      } catch {
        // Ignore JSON parse error
      }
    });

    es.onerror = () => {
      // Reconnect after 3s
      setTimeout(() => {
        // eslint-disable-next-line react-hooks/immutability
        if (activeProject?.id === projectId) connectLogs(projectId);
      }, 3000);
    };
  }, [activeProject, detectError]);

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, []);



  const handleDownloadProject = () => {
    if (!activeProject) return;
    window.open(`http://localhost:3001/export/download-project/${activeProject.id}`, '_blank');
  };

  const handleDownloadDocs = () => {
    if (!activeProject) return;
    window.open(`http://localhost:3001/export/download-docs/${activeProject.id}`, '_blank');
  };



  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const res = await sendPrompt(prompt);
      if (res.success) {
        setPrompt("");
        await fetchHistory();
        
        // Load the newly generated project
        if (res.run_id) {
          const newProject = {
            id: res.run_id,
            project_name: res.project_name
          };
          setIsCreatingNewProject(false);
          setActiveProject(newProject);
          await loadProjectFiles(newProject);
        }
      } else {
        alert("Generation failed: " + res.error);
      }
    } catch (err) {
      console.error(err);
      alert("Error contacting orchestrator.");
    } finally {
      setIsGenerating(false);
    }
  };

  const loadProjectFiles = async (project) => {
    setActiveProject(project);
    setDebugSessionId(null);
    setDebugChat([]);
    setTerminalLogs([]);
    setUnsavedChanges({});
    setErrorSuggestion(null);

    try {
      const data = await getProjectFiles(project.id);
      setFiles(data.files || []);
      if (data.files?.length > 0) {
        setActiveFile(data.files[0]);
        setEditorContent(data.files[0].content || "");
      }

      // Check runtime status
      const status = await getRuntimeStatus(project.id);
      setRuntimeStatus(status.status || "stopped");

      // Connect log stream
      connectLogs(project.id);

      // Load existing debug session if available
      const debugData = await getDebugSessions(project.id);
      if (debugData.success && debugData.latestSession) {
        setDebugSessionId(debugData.latestSession.id);
        setDebugChat(debugData.history || []);
      }
    } catch (err) {
      console.error(err);
    }
  };



  // ── Runtime Actions ──
  const handleRun = async () => {
    if (!activeProject) return;
    setRuntimeStatus("installing");
    setTerminalLogs([]);
    setActivePanel("terminal");
    
    // Connect to log stream first
    connectLogs(activeProject.id);
    
    try {
      const res = await runProject(activeProject.id);
      if (res.success) {
        setRuntimeStatus("running");
        setPreviewPort(res.port);
      } else {
        setRuntimeStatus("crashed");
        alert("Run failed: " + res.error);
      }
    } catch (err) {
      setRuntimeStatus("crashed");
      console.error(err);
    }
  };

  const handleStop = async () => {
    if (!activeProject) return;
    try {
      await stopProjectAPI(activeProject.id);
      setRuntimeStatus("stopped");
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestart = async () => {
    if (!activeProject) return;
    setRuntimeStatus("installing");
    setActivePanel("terminal");
    try {
      const res = await restartProject(activeProject.id);
      if (res.success) {
        setRuntimeStatus("running");
        setPreviewPort(res.port);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ── Debug Actions ──
  const handleStartDebug = async () => {
    if (!activeProject) return;
    try {
      const res = await startDebugSession(activeProject.id);
      if (res.success) {
        setDebugSessionId(res.sessionId);
        setDebugChat([{ role: "system", content: "Debug session started. How can I help fix your app?" }]);
        setActivePanel("debug");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setDebugImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendDebug = async () => {
    if ((!debugInput.trim() && !debugImage) || !debugSessionId) return;
    const userMsg = debugInput;
    const currentImage = debugImage;
    setDebugInput("");
    setDebugImage(null);
    setDebugChat((prev) => [...prev, { role: "user", content: userMsg, image: currentImage }]);
    setIsDebugLoading(true);
    try {
      const res = await sendDebugMessage(debugSessionId, userMsg, currentImage);
      if (res.success) {
        const chatData = await getDebugHistory(debugSessionId);
        setDebugChat(chatData.history || []);
        loadProjectFiles(activeProject);
      }
    } catch (err) {
      console.error(err);
      setDebugChat((prev) => [...prev, { role: "system", content: "Error communicating with debugger agent." }]);
    } finally {
      setIsDebugLoading(false);
    }
  };

  const handleDelete = async (e, project) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${project.project_name || "this project"}"?`)) {
      try {
        const res = await deleteProject(project.id);
        if (res.success) {
          if (activeProject?.id === project.id) {
            setActiveProject(null);
            setFiles([]);
            setActiveFile(null);
          }
          await fetchHistory();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // ── File icon helper ──
  const getFileIcon = (filePath) => {
    if (filePath.endsWith(".html")) return "🌐";
    if (filePath.endsWith(".css")) return "🎨";
    if (filePath.endsWith(".js")) return "📜";
    if (filePath.endsWith(".json")) return "📋";
    if (filePath.endsWith(".md")) return "📝";
    return "📄";
  };

  // ── Runtime status badge ──
  const statusColors = {
    stopped: "#64748b",
    installing: "#f59e0b",
    running: "#10b981",
    crashed: "#ef4444",
    stopping: "#f59e0b",
  };

  const toggleTheme = () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  };

  const getFileIconClass = (filePath) => {
    if (filePath.endsWith(".html")) return "icon-html";
    if (filePath.endsWith(".css")) return "icon-css";
    if (filePath.endsWith(".js")) return "icon-js";
    if (filePath.endsWith(".json")) return "icon-json";
    if (filePath.endsWith(".md")) return "icon-md";
    return "";
  };

  return (
    <div className="ide-layout">
      {/* 1. IDE Header */}
      <div className="ide-header">
        <div className="ide-header-left">
          <div className="nav-brand" style={{ cursor: "pointer" }} onClick={() => navigate("/")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            SYNAPSE
          </div>
          {activeProject && (
            <div className="project-dropdown">
              <span>{activeProject.project_name ? activeProject.project_name.substring(0, 20) : "Project " + activeProject.id}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          )}
        </div>

        {activeProject && (
          <div className="status-badge" style={{ color: statusColors[runtimeStatus] }}>
            <div className="status-dot"></div>
            {runtimeStatus}
          </div>
        )}

        <div className="ide-header-right">
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
          </button>

          {activeProject && (
            <>
              {runtimeStatus === "running" ? (
                <>
                  <button className="btn btn-ghost" onClick={handleStop} style={{ padding: "6px 12px", fontSize: "12px" }}>Stop</button>
                  <button className="btn btn-ghost" onClick={handleRestart} style={{ padding: "6px 12px", fontSize: "12px" }}>Restart</button>
                </>
              ) : (
                <button className="btn-run-ide" onClick={handleRun} disabled={runtimeStatus === "installing"}>
                  ▶ {runtimeStatus === "installing" ? "Installing..." : "Run"}
                </button>
              )}
              <button className="btn btn-ghost" onClick={handleDownloadDocs} style={{ padding: "6px 12px", fontSize: "12px" }}>Docs</button>
              <button className="btn btn-ghost" onClick={handleDownloadProject} style={{ padding: "6px 12px", fontSize: "12px" }}>Export</button>
            </>
          )}
          <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "12px", fontWeight: "bold" }}>U</div>
        </div>
      </div>

      {/* 2. Sidebar (Projects) */}
      <div className="ide-sidebar">
        <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span>Your Projects</span>
          </div>
          <button
            onClick={() => { setIsCreatingNewProject(true); setActiveProject(null); setPrompt(""); }}
            style={{ 
              background: "var(--accent-primary)", 
              color: "#fff", 
              border: "none", 
              borderRadius: "6px", 
              padding: "12px 16px", 
              cursor: "pointer", 
              fontSize: "13px", 
              fontWeight: "bold",
              margin: "0 12px 12px 12px",
              width: "calc(100% - 24px)",
              textAlign: "center"
            }}
          >
            ✨ Create New Project
          </button>
          <div className="project-list">
            {history.length === 0 && <div style={{ padding: "0 16px", color: "var(--text-muted)", fontSize: "12px" }}>No projects yet.</div>}
            {history.map((proj) => (
              <div
                key={proj.id}
                className={`project-row ${activeProject?.id === proj.id ? "active" : ""}`}
                onClick={() => {
                  setIsCreatingNewProject(false);
                  setActiveProject(proj);
                  loadProjectFiles(proj);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                <span className="truncate">{proj.project_name || `Project ${proj.id}`}</span>
                <button onClick={(e) => handleDelete(e, proj)} style={{ marginLeft: "auto", color: "var(--accent-danger)", opacity: activeProject?.id === proj.id ? 1 : 0.5, border: "none", background: "none", cursor: "pointer" }}>×</button>
              </div>
            ))}
          </div>
        </div>

        {isCreatingNewProject ? (
          <div style={{ gridColumn: "2 / -1", gridRow: "2", display: "flex", flexDirection: "column", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)", padding: "40px", overflowY: "auto" }}>
            <div style={{
              width: "100%",
              maxWidth: "800px",
              background: "var(--surface)",
              borderRadius: "16px",
              padding: "60px 40px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              border: "1px solid var(--border)"
            }}>
              <div style={{ textAlign: "center", marginBottom: "32px" }}>
                <h1 style={{ fontSize: "42px", fontWeight: "900", marginBottom: "12px", color: "var(--accent-primary)" }}>✨ What would you like to build today?</h1>
                <p style={{ fontSize: "16px", color: "var(--text-muted)", fontWeight: "500" }}>Tell SYNAPSE what you want to create, and we'll build it for you in minutes.</p>
              </div>

              <textarea
                className="big-prompt-textarea"
                placeholder="Give a detailed prompt of what you'd like to build. Example: Build a real-time chat application with user authentication, message history, and a clean admin dashboard..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isGenerating}
                style={{
                  width: "100%",
                  height: "240px",
                  padding: "20px",
                  fontSize: "15px",
                  border: "2px solid var(--border)",
                  borderRadius: "10px",
                  backgroundColor: "var(--bg-primary)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-body)",
                  resize: "none",
                  marginBottom: "24px",
                  outline: "none",
                  transition: "border-color 0.3s"
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--accent-primary)"}
                onBlur={(e) => e.target.style.borderColor = "var(--border)"}
              />

              <button
                className="btn btn-primary"
                style={{
                  width: "100%",
                  padding: "18px 32px",
                  fontSize: "18px",
                  fontWeight: "800",
                  borderRadius: "10px",
                  background: "var(--accent-primary)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  opacity: isGenerating || !prompt.trim() ? 0.6 : 1,
                  pointerEvents: isGenerating || !prompt.trim() ? "none" : "auto"
                }}
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
              >
                {isGenerating ? "🔨 Building your project... Please wait..." : "🚀 Generate Project"}
              </button>

              {isGenerating && (
                <div style={{ marginTop: "24px", textAlign: "center" }}>
                  <div style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "12px" }}>This typically takes 1-2 minutes...</div>
                  <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "var(--accent-primary)",
                        animation: `pulse 1.4s infinite`,
                        animationDelay: `${i * 0.2}s`
                      }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : activeProject ? (
          <>
            {/* 3. Explorer */}
            <div className="ide-explorer">
              <div className="panel-header">Explorer</div>
              <div>
                {files.map((f, i) => (
                  <div
                    key={i}
                    className={`file-item ${activeFile?.file_path === f.file_path ? "active" : ""}`}
                    onClick={() => handleFileClick(f)}
                  >
                    <span className={getFileIconClass(f.file_path)}>{getFileIcon(f.file_path)}</span>
                    <span className="truncate">{f.file_path.split("/").pop()}</span>
                    {unsavedChanges[f.file_path] && <span style={{ color: "var(--accent-primary)", fontSize: "10px", marginLeft: "auto" }}>●</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Editor Area */}
            <div className="ide-editor-container">
              {activeFile ? (
                <>
                  <div className="editor-tabs">
                    <div className="editor-tab active">
                      <span className={getFileIconClass(activeFile.file_path)}>{getFileIcon(activeFile.file_path)}</span>
                      {activeFile.file_path.split("/").pop()}
                      {unsavedChanges[activeFile.file_path] && <span style={{ color: "var(--accent-primary)", fontSize: "10px", marginLeft: "4px" }}>●</span>}
                      <button onClick={() => setActiveFile(null)} style={{ marginLeft: "8px", opacity: 0.5, border: "none", background: "none", cursor: "pointer" }}>×</button>
                    </div>
                    {unsavedChanges[activeFile.file_path] && (
                      <button className="btn btn-ghost" style={{ marginLeft: "auto", marginRight: "16px", alignSelf: "center", padding: "4px 8px", fontSize: "11px", borderRadius: "4px" }} onClick={handleSaveFile} disabled={isSaving}>
                        {isSaving ? "Saving..." : "Save (Ctrl+S)"}
                      </button>
                    )}
                  </div>
                  <div className="code-area">
                    <div className="code-gutter">
                      {editorContent.split("\n").map((_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>
                    <textarea
                      ref={editorRef}
                      className="code-textarea"
                      value={editorContent}
                      onChange={handleEditorChange}
                      spellCheck={false}
                    />
                  </div>
                </>
              ) : (
                <div style={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)" }}>
                  <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: "16px", opacity: 0.5 }}>
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                      <polyline points="13 2 13 9 20 9"></polyline>
                    </svg>
                    <p>Select a file to edit</p>
                  </div>
                </div>
              )}

              {/* Bottom Panel (Resizable) */}
              <div className="ide-bottom-panel" style={{ height: panelHeight + 'px' }}>
                <div className="resize-handle" onMouseDown={handleDragStart}></div>
                <div className="bottom-tabs">
                  <button className={`bottom-tab ${activePanel === "terminal" ? "active" : ""}`} onClick={() => setActivePanel("terminal")}>Terminal</button>
                  <button className={`bottom-tab ${activePanel === "preview" ? "active" : ""}`} onClick={() => setActivePanel("preview")}>Preview</button>
                  <button className={`bottom-tab ${activePanel === "debug" ? "active" : ""}`} onClick={() => setActivePanel("debug")}>Debugger</button>
                </div>

                {activePanel === "terminal" && (
                  <div className="terminal-view" ref={terminalRef}>
                    {terminalLogs.length === 0 ? (
                      <div className="terminal-placeholder">Click ▶ Run to start your project...</div>
                    ) : (
                      terminalLogs.map((log, i) => (
                        <div key={i} style={{ marginBottom: "4px" }}>
                          <span style={{ color: "#6B6988" }}>[{new Date(log.timestamp).toLocaleTimeString()}]</span>{" "}
                          <span style={{ color: log.type === "stderr" ? "#E8584F" : log.type === "system" ? "#7B72F0" : "#F5A623" }}>[{log.type === "stderr" ? "ERROR" : log.type === "system" ? "SYSTEM" : "INFO"}]</span>{" "}
                          <span style={{ color: log.type === "stderr" ? "#E8584F" : "inherit" }}>
                            {renderTerminalMessage(log.message)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activePanel === "preview" && (
                  <div style={{ flexGrow: 1, backgroundColor: "#fff" }}>
                    {runtimeStatus === "running" ? (
                      <iframe src={`http://localhost:${previewPort}`} style={{ width: "100%", height: "100%", border: "none", backgroundColor: "#fff" }} title="Preview" />
                    ) : (
                      <div className="terminal-placeholder" style={{ backgroundColor: "var(--bg-primary)" }}>Project is not running.</div>
                    )}
                  </div>
                )}

                {activePanel === "debug" && (
                  <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", backgroundColor: "var(--bg-primary)", overflow: "hidden", minHeight: 0 }}>
                    {!debugSessionId ? (
                      <div style={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <button className="btn btn-primary" onClick={handleStartDebug}>Start Debug Session</button>
                      </div>
                    ) : (
                      <>
                        <div style={{ flexGrow: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                          {debugChat.map((msg, i) => (
                            <div key={i} style={{ alignSelf: msg.role === "user" ? "flex-end" : "flex-start", maxWidth: "80%", background: msg.role === "user" ? "var(--accent-primary)" : "var(--surface-raised)", color: msg.role === "user" ? "#fff" : "var(--text-primary)", padding: "12px", borderRadius: "8px", border: msg.role === "system" ? "1px solid var(--border)" : "none", fontSize: "13px" }}>
                              {msg.content}
                              {msg.image && <img src={msg.image} alt="Debug" style={{ maxWidth: "100%", marginTop: "8px", borderRadius: "4px" }} />}
                            </div>
                          ))}
                          {isDebugLoading && <div style={{ alignSelf: "flex-start", fontSize: "13px", color: "var(--text-muted)" }}>Debugger is thinking...</div>}
                        </div>
                        {debugImage && (
                          <div style={{ padding: "8px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "8px", backgroundColor: "var(--bg-secondary)" }}>
                            <img src={debugImage} alt="Preview" style={{ height: "40px", borderRadius: "4px" }} />
                            <button onClick={() => setDebugImage(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "12px" }}>✖ Remove Image</button>
                          </div>
                        )}
                        <div style={{ padding: "12px", borderTop: "1px solid var(--border)", display: "flex", gap: "8px", backgroundColor: "var(--surface)", alignItems: "flex-end" }}>
                          <input type="file" id="debugImageUpload" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
                          <button className="btn btn-ghost" style={{ padding: "8px", height: "36px" }} onClick={() => document.getElementById("debugImageUpload").click()}>📷</button>
                          <textarea
                            style={{ flexGrow: 1, background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "6px", padding: "8px 12px", color: "var(--text-primary)", fontSize: "13px", outline: "none", resize: "none", height: "36px", minHeight: "36px", maxHeight: "150px" }}
                            placeholder="Describe the issue... (Shift+Enter for new line)"
                            value={debugInput}
                            onChange={(e) => {
                              setDebugInput(e.target.value);
                              e.target.style.height = "36px";
                              e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendDebug();
                              }
                            }}
                          />
                          <button className="btn btn-primary" style={{ padding: "8px 16px", height: "36px" }} onClick={handleSendDebug} disabled={isDebugLoading}>Send</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 5. Stats Panel */}
            <div className="ide-stats">
              <div className="panel-header">Analytics</div>
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-label">Total Projects</div>
                  <div className="metric-value">{history.length}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Files Built</div>
                  <div className="metric-value">{files.length}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Avg. Latency</div>
                  <div className="metric-value">1.2s</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Tokens Used</div>
                  <div className="metric-value">42.5k</div>
                </div>
              </div>

              <div className="panel-header" style={{ marginTop: "16px" }}>Recent Activity</div>
              <div className="activity-feed">
                {history.slice(0, 5).map((proj, i) => {
                  const timestamp = proj.created_at || new Date().toISOString();
                  return (
                    <div key={i} className="activity-item">
                      <div className="activity-time">{new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                      <div className="activity-desc">Generated {proj.project_name || `Project ${proj.id}`}</div>
                    </div>
                  )
                })}
                {history.length === 0 && <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>No recent activity.</div>}
              </div>
            </div>
          </>
        ) : (
          <div style={{ gridColumn: "2 / -1", gridRow: "2", display: "flex", flexDirection: "column", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)", padding: "40px" }}>
            <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: "16px", opacity: 0.3 }}>
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                <polyline points="13 2 13 9 20 9"></polyline>
              </svg>
              <p style={{ fontSize: "18px" }}>No project selected</p>
              <p style={{ fontSize: "14px", marginTop: "8px" }}>Create a new project or select one from the list</p>
            </div>
          </div>
        )}
    </div>
  );
}
