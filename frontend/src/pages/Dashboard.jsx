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
} from "../api";
import "./Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();

  // ── Core State ──
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState([]);
  const [activeProject, setActiveProject] = useState(null);

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
  const terminalRef = useRef(null);
  const eventSourceRef = useRef(null);

  // ── Debug State ──
  const [debugSessionId, setDebugSessionId] = useState(null);
  const [debugChat, setDebugChat] = useState([]);
  const [debugInput, setDebugInput] = useState("");
  const [debugImage, setDebugImage] = useState(null);
  const [isDebugLoading, setIsDebugLoading] = useState(false);

  // ── Auto Error Detection State ──
  const [errorSuggestion, setErrorSuggestion] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLogs]);

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
  }, [activeFile, editorContent, unsavedChanges]);

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
      } catch (_) {}
    };

    es.addEventListener("status", (event) => {
      try {
        const data = JSON.parse(event.data);
        setRuntimeStatus(data.status);
      } catch (_) {}
    });

    es.addEventListener("runtime_error", (event) => {
      try {
        const data = JSON.parse(event.data);
        detectError(data.error);
      } catch (_) {}
    });

    es.onerror = () => {
      // Reconnect after 3s
      setTimeout(() => {
        if (activeProject?.id === projectId) connectLogs(projectId);
      }, 3000);
    };
  }, [activeProject]);

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, []);

  // ── Error Detection ──
  const ERROR_PATTERNS = [
    { pattern: /Cannot find module/i, type: "missing_module" },
    { pattern: /SyntaxError/i, type: "syntax_error" },
    { pattern: /EADDRINUSE/i, type: "port_conflict" },
    { pattern: /Unexpected token/i, type: "syntax_error" },
    { pattern: /ReferenceError/i, type: "reference_error" },
    { pattern: /TypeError/i, type: "type_error" },
    { pattern: /ENOENT/i, type: "file_not_found" },
  ];

  const detectError = (errorLine) => {
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
  };

  const getErrorHint = (type, error) => {
    switch (type) {
      case "missing_module": {
        const match = error.match(/Cannot find module '([^']+)'/);
        return match ? `Module '${match[1]}' is missing. Click Apply Fix to install it.` : "A required module is missing.";
      }
      case "syntax_error": return "There's a syntax error in your code. Click Apply Fix to let the AI debugger analyze and fix it.";
      case "port_conflict": return "Port 3000 is already in use. Click Apply Fix to change the port or kill the conflicting process.";
      case "reference_error": return "A variable or function is referenced before being defined. Click Apply Fix to analyze.";
      case "type_error": return "A type error occurred. Click Apply Fix to have the AI fix it.";
      case "file_not_found": return "A file or directory was not found. Click Apply Fix to resolve the path issue.";
      default: return "An error was detected. Click Apply Fix to analyze.";
    }
  };

  const handleApplyFix = async () => {
    if (!errorSuggestion || !debugSessionId) {
      // Start debug session first
      if (activeProject && !debugSessionId) {
        await handleStartDebug();
      }
    }
    
    if (debugSessionId && errorSuggestion) {
      const msg = `[AUTO-DETECTED ERROR]\n${errorSuggestion.error}\n\nPlease analyze this error and fix the code automatically.`;
      setDebugInput(msg);
      setErrorSuggestion(null);
      setActivePanel("debug");
      // Auto-send the message
      setTimeout(() => handleSendDebug(), 100);
    }
    setErrorSuggestion(null);
  };

  // ── Data Fetching ──
  const fetchHistory = async () => {
    try {
      const data = await getHistory();
      if (data.runs) setHistory(data.runs);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const res = await sendPrompt(prompt);
      if (res.success) {
        setPrompt("");
        await fetchHistory();
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
    } catch (err) {
      console.error(err);
    }
  };

  // ── Editor Actions ──
  const handleFileClick = (file) => {
    // Save current unsaved content reference
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

  const handleSaveFile = async () => {
    if (!activeFile || !activeProject) return;
    setIsSaving(true);
    try {
      const res = await saveFile(activeProject.id, activeFile.file_path, editorContent);
      if (res.success) {
        // Update the file content in local state
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
  };

  // ── Runtime Actions ──
  const handleRun = async () => {
    if (!activeProject) return;
    setRuntimeStatus("installing");
    setTerminalLogs([]);
    setActivePanel("terminal");
    try {
      const res = await runProject(activeProject.id);
      if (res.success) setRuntimeStatus("running");
      else {
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
      if (res.success) setRuntimeStatus("running");
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

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setDebugImage(reader.result);
      reader.readAsDataURL(file);
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

  return (
    <div className="dashboard">
      {/* LEFT PANEL - Sidebar */}
      <div className="sidebar glass">
        <div className="sidebar-header">
          <span className="logo-icon" onClick={() => navigate("/")}>⚡ SYNAPSE</span>
        </div>
        <div className="project-list">
          <h3 className="section-title">Your Projects</h3>
          {history.length === 0 ? (
            <p className="empty-text">No projects yet.</p>
          ) : (
            history.map((run, i) => (
              <div
                key={i}
                className={`project-item ${activeProject?.id === run.id ? "active" : ""}`}
                onClick={() => loadProjectFiles(run)}
              >
                <div className="project-info">
                  <span className="project-icon">📁</span>
                  <span className="project-name">
                    {run.project_name || (run.prompt ? run.prompt.substring(0, 20) : "Untitled Project")}
                  </span>
                </div>
                <button className="delete-btn" onClick={(e) => handleDelete(e, run)} title="Delete Project">🗑️</button>
              </div>
            ))
          )}
        </div>

        {/* Prompt at bottom of sidebar */}
        <div className="sidebar-prompt">
          <textarea
            className="prompt-input-mini"
            placeholder="Describe your app..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating}
            rows={3}
          />
          <button className="btn-generate" onClick={handleGenerate} disabled={isGenerating || !prompt.trim()}>
            {isGenerating ? "Working..." : "Generate ✨"}
          </button>
        </div>
      </div>

      {/* CENTER PANEL - IDE */}
      <div className="main-content">
        {activeProject ? (
          <>
            {/* IDE Header Bar */}
            <div className="ide-toolbar">
              <div className="ide-toolbar-left">
                <h3 className="project-title">{activeProject.project_name}</h3>
                <span className="runtime-badge" style={{ background: statusColors[runtimeStatus] }}>
                  {runtimeStatus.toUpperCase()}
                </span>
              </div>
              <div className="ide-toolbar-right">
                {runtimeStatus === "running" ? (
                  <>
                    <button className="btn-runtime btn-stop" onClick={handleStop}>⏹ Stop</button>
                    <button className="btn-runtime btn-restart" onClick={handleRestart}>🔄 Restart</button>
                  </>
                ) : (
                  <button className="btn-runtime btn-run" onClick={handleRun} disabled={runtimeStatus === "installing"}>
                    {runtimeStatus === "installing" ? "Installing..." : "▶ Run"}
                  </button>
                )}
                {activeFile && unsavedChanges[activeFile.file_path] && (
                  <button className="btn-runtime btn-save" onClick={handleSaveFile} disabled={isSaving}>
                    {isSaving ? "Saving..." : "💾 Save"}
                  </button>
                )}
                {!debugSessionId && (
                  <button className="btn-runtime btn-debug" onClick={handleStartDebug}>🐛 Debug</button>
                )}
              </div>
            </div>

            {/* IDE Body */}
            <div className="ide-body">
              {/* File Explorer */}
              <div className="file-explorer">
                <div className="file-explorer-header">EXPLORER</div>
                {files.map((f, i) => (
                  <div
                    key={i}
                    className={`file-item ${activeFile?.file_path === f.file_path ? "active" : ""}`}
                    onClick={() => handleFileClick(f)}
                  >
                    <span className="file-icon">{getFileIcon(f.file_path)}</span>
                    <span className="file-name">{f.file_path}</span>
                    {unsavedChanges[f.file_path] && <span className="unsaved-dot">●</span>}
                  </div>
                ))}
              </div>

              {/* Editor + Bottom Panels */}
              <div className="editor-area">
                {/* File Tabs */}
                {activeFile && (
                  <div className="file-tabs">
                    <div className="file-tab active">
                      {getFileIcon(activeFile.file_path)} {activeFile.file_path.split("/").pop()}
                      {unsavedChanges[activeFile.file_path] && <span className="tab-unsaved">●</span>}
                    </div>
                  </div>
                )}

                {/* Code Editor (Editable Textarea) */}
                <div className="code-editor-wrapper">
                  {activeFile ? (
                    <textarea
                      ref={editorRef}
                      className="code-editor-textarea"
                      value={editorContent}
                      onChange={handleEditorChange}
                      spellCheck={false}
                    />
                  ) : (
                    <div className="empty-editor">Select a file to start editing</div>
                  )}
                </div>

                {/* Bottom Panel Tabs */}
                <div className="bottom-panel">
                  <div className="bottom-tabs">
                    <button
                      className={`bottom-tab ${activePanel === "terminal" ? "active" : ""}`}
                      onClick={() => setActivePanel("terminal")}
                    >
                      🖥 Terminal
                    </button>
                    <button
                      className={`bottom-tab ${activePanel === "preview" ? "active" : ""}`}
                      onClick={() => setActivePanel("preview")}
                    >
                      👁 Preview
                    </button>
                    <button
                      className={`bottom-tab ${activePanel === "debug" ? "active" : ""}`}
                      onClick={() => setActivePanel("debug")}
                    >
                      🐛 Debug {debugSessionId && "●"}
                    </button>
                  </div>

                  <div className="bottom-content">
                    {/* Terminal Panel */}
                    {activePanel === "terminal" && (
                      <div className="terminal-panel" ref={terminalRef}>
                        {terminalLogs.length === 0 ? (
                          <div className="terminal-empty">Click ▶ Run to start your project...</div>
                        ) : (
                          terminalLogs.map((entry, i) => (
                            <div key={i} className={`terminal-line ${entry.type}`}>
                              <span className="terminal-time">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                              <span className="terminal-text">{entry.message}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Preview Panel */}
                    {activePanel === "preview" && (
                      <div className="preview-panel">
                        {runtimeStatus === "running" ? (
                          <iframe
                            src="http://localhost:3000"
                            title="Live Preview"
                            className="preview-iframe"
                            key={runtimeStatus}
                          />
                        ) : (
                          <div className="preview-empty">
                            <p>Project is not running.</p>
                            <button className="btn-runtime btn-run" onClick={handleRun}>▶ Run to see preview</button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Debug Panel */}
                    {activePanel === "debug" && (
                      <div className="debug-panel-inline">
                        {!debugSessionId ? (
                          <div className="debug-empty">
                            <p>No active debug session.</p>
                            <button className="btn-runtime btn-debug" onClick={handleStartDebug}>🐛 Start Debugging</button>
                          </div>
                        ) : (
                          <>
                            <div className="debug-chat-window">
                              {debugChat.map((msg, i) => (
                                <div key={i} className={`chat-bubble ${msg.role}`}>
                                  {msg.image && <img src={msg.image} alt="uploaded" className="chat-bubble-img" />}
                                  <div className="chat-text">{msg.content}</div>
                                </div>
                              ))}
                              {isDebugLoading && <div className="chat-bubble assistant loading">Analyzing...</div>}
                            </div>
                            <div className="debug-input-area">
                              {debugImage && (
                                <div className="image-preview-sm">
                                  <img src={debugImage} alt="preview" />
                                  <button className="remove-img-btn" onClick={() => setDebugImage(null)}>✕</button>
                                </div>
                              )}
                              <div className="debug-input-row">
                                <label className="upload-btn-sm" title="Attach Screenshot">
                                  <input type="file" accept="image/*" onChange={handleImageUpload} hidden />📎
                                </label>
                                <textarea
                                  className="debug-input"
                                  placeholder="Describe the bug or paste an error..."
                                  value={debugInput}
                                  onChange={(e) => setDebugInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault();
                                      handleSendDebug();
                                    }
                                  }}
                                  disabled={isDebugLoading}
                                  rows={1}
                                />
                                <button className="send-btn" onClick={handleSendDebug} disabled={isDebugLoading || (!debugInput.trim() && !debugImage)}>
                                  Send
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Error Suggestion Popup */}
            {errorSuggestion && (
              <div className="error-popup">
                <div className="error-popup-header">
                  <span>⚠️ Error Detected</span>
                  <button className="error-popup-close" onClick={() => setErrorSuggestion(null)}>✕</button>
                </div>
                <p className="error-popup-msg">{errorSuggestion.message}</p>
                <code className="error-popup-code">{errorSuggestion.error.substring(0, 200)}</code>
                <div className="error-popup-actions">
                  <button className="btn-apply-fix" onClick={handleApplyFix}>🔧 Apply Fix</button>
                  <button className="btn-ignore" onClick={() => setErrorSuggestion(null)}>Ignore</button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* No project selected — show prompt UI */
          <div className="welcome-screen">
            <div className="welcome-icon">⚡</div>
            <h2>Welcome to SYNAPSE</h2>
            <p>Select a project from the sidebar or generate a new one.</p>
            <div className="prompt-section-center glass glow-border">
              <textarea
                className="prompt-input"
                placeholder="Describe the full-stack application you want to build..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isGenerating}
              />
              <div className="prompt-footer">
                <span className="prompt-hint">Be as detailed as possible.</span>
                <button className="btn-primary" onClick={handleGenerate} disabled={isGenerating || !prompt.trim()}>
                  {isGenerating ? "Agents Working..." : "Generate App ✨"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
