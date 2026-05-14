# 🌌 SYNAPSE — Agentic Full-Stack IDE

**SYNAPSE** is a professional-grade, local-first Agentic IDE designed to transform high-level natural language requirements into fully functional, production-ready full-stack applications. By leveraging a coordinated multi-agent pipeline and advanced AI reasoning, SYNAPSE automates the entire development lifecycle—from architectural planning and phased execution to automated code review and conversational debugging.

---

## ✨ Key Features

- **🧠 Multi-Agent Orchestration**: Specialized agents (Planner, Executor, Reviewer, Debugger) collaborate to build complex systems.
- **🔄 Smart Key Rotation**: Automatically rotates between multiple API keys to bypass rate limits (TPM/RPD) on free tiers.
- **⚡ Phased Generation**: Builds backend logic first to establish API contracts, then uses that context to generate matching frontend code.
- **🔍 Real-Time Visibility**: Structured logging and SSE streaming provide a live terminal view of the AI's "thought process."
- **🛠️ Integrated Debugger**: A conversational debugger that reads your code, identifies runtime errors, and applies fixes automatically.
- **💾 Hybrid Persistence**: Dual-layer storage in MySQL (for state/metadata) and the local filesystem (for execution).
- **📦 Instant Export**: One-click project zipping for seamless deployment to external environments.

---

## 🏗️ System Architecture

SYNAPSE is built with a decoupled, service-oriented architecture designed for reliability and speed. For a deep-dive into the internal mechanics, rationale, and technical implementation of every subsystem, please refer to the:

👉 **[SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)**

### **Core Components:**
- **Orchestration**: A phased state machine managing the Plan -> Execute -> Review pipeline.
- **Database**: MySQL schema tracking project state, code history, and pipeline steps.
- **AI Router**: Provider-agnostic gateway supporting Groq (Llama), Google (Gemini), and NVIDIA (NIM).
- **Worker Queue**: A native Node.js async queue for handling concurrent generations without server strain.
- **Batch Parser**: A hardened regex-based engine for extracting source code from AI streams.

---

## 🛠️ Installation & Setup

### **1. Prerequisites**
- Node.js (v18+)
- MySQL Server (v8+)

### **2. Database Setup**
```sql
CREATE DATABASE synapse;
```

### **3. Environment Configuration**
Create a `.env` file in the `backend/` directory:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=synapse

# AI API Keys (Rotation Supported)
GROQ_API_KEY=gsk_...
GROQ_API_KEY_2=gsk_...
GEMINI_API_KEY=AIza...
```

### **4. Start the Application**
```bash
# Terminal 1: Backend
cd backend
npm install
npm start

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

---

## 📄 License
This project is for educational and development purposes. Refer to the documentation for advanced configuration and deployment strategies.
