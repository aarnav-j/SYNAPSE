-- ─────────────────────────────────────────────
-- SYNAPSE — MySQL Database Schema
-- Run this ONCE in MySQL Workbench to set up all tables
-- ─────────────────────────────────────────────

CREATE DATABASE IF NOT EXISTS synapse;
USE synapse;

-- ── Users Table ──

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Projects Table ──

CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    run_id VARCHAR(50) NOT NULL UNIQUE,
    project_name VARCHAR(100) NOT NULL,
    prompt TEXT NOT NULL,
    status ENUM('WAITING','PLANNING','EXECUTING','REVIEWING','SAVING','COMPLETED','FAILED') DEFAULT 'WAITING',
    output_path VARCHAR(500) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Pipeline Steps Table ──
-- Stores every single step of the pipeline for full traceability

CREATE TABLE IF NOT EXISTS pipeline_steps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    step_name ENUM('PLANNING','EXECUTING','REVIEWING','SAVING') NOT NULL,
    step_status ENUM('STARTED','COMPLETED','FAILED') DEFAULT 'STARTED',
    input_data JSON DEFAULT NULL,
    output_data JSON DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    duration_ms INT DEFAULT 0,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME DEFAULT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Generated Files Table ──
-- Stores the actual code so the dashboard can display/export it

CREATE TABLE IF NOT EXISTS generated_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_type ENUM('backend','frontend','docs','misc') DEFAULT 'backend',
    code LONGTEXT NOT NULL,
    explanation TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Debug Sessions Table ──
-- Created when a user clicks "Debug" on a project

CREATE TABLE IF NOT EXISTS debug_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    status ENUM('active','resolved','abandoned') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Chat Messages Table ──
-- The actual conversation history in a debug session

CREATE TABLE IF NOT EXISTS chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    debug_session_id INT NOT NULL,
    role ENUM('user','assistant','system') NOT NULL,
    content TEXT NOT NULL,
    code_context TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (debug_session_id) REFERENCES debug_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Indexes for performance ──

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_run_id ON projects(run_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_pipeline_steps_project_id ON pipeline_steps(project_id);
CREATE INDEX idx_generated_files_project_id ON generated_files(project_id);
CREATE INDEX idx_debug_sessions_project_id ON debug_sessions(project_id);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(debug_session_id);
