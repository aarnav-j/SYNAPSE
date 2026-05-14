# SYNAPSE — Deployment Strategy & Challenges

Deploying SYNAPSE to a cloud environment (like Vercel, Render, or AWS) is significantly more complex than deploying a standard CRUD application. Because SYNAPSE is essentially a "Cloud IDE," it performs actions that traditional serverless or containerized hosts are not designed to handle out-of-the-box.

---

## 🚩 Core Deployment Challenges

### 1. The Ephemeral Filesystem Problem
Most modern cloud platforms (Render, Heroku, Vercel) use **ephemeral filesystems**. This means any files written to the `output/` directory will be deleted as soon as the server restarts or goes to sleep.
*   **The Issue**: If a user generates a project and the server restarts 15 minutes later, the code on the disk is gone. If the user then clicks "Download" or "Run," the system will crash because the physical directory no longer exists.
*   **The Solution**: We currently mitigate this by storing all code in the **MySQL database**. To fully solve this in production, the system must be updated to rebuild the `output/` folder from the database on-demand whenever a file operation is requested.

### 2. The "Localhost" Preview Bug
The SYNAPSE frontend includes a Live Preview tab that points to `http://localhost:3000`. 
*   **The Issue**: When the app is deployed to the internet (e.g., `https://synapse.render.com`), the user's browser still tries to find the preview on **their own computer's localhost**. 
*   **The Solution**: In a production deployment, the backend must act as a **Reverse Proxy**. Instead of pointing the iframe to `localhost`, it should point to a dynamic sub-domain or a specific route on the backend (e.g., `https://synapse.render.com/preview/:projectId/`) that tunnels the traffic to the running child process.

### 3. Port Conflicts & Scalability
The AI agents are currently prompted to generate servers that run on `port 3000`. 
*   **The Issue**: If two different users click the "Run" button at the same time on the same server, both projects will attempt to bind to port 3000. The second project will fail with `EADDRINUSE`.
*   **The Solution**: The `processManager` must be updated to assign **Dynamic Ports**. It should find an available port (e.g., 3001, 3002), pass it to the child process as an environment variable (`PORT=3001`), and tell the frontend iframe to connect to that specific port.

### 4. Long-Running Processes & Timeouts
Standard free-tier cloud providers often have strict request timeouts (usually 30-60 seconds).
*   **The Issue**: Complex AI generations (Planning -> Executing -> Reviewing) can take 2 to 5 minutes to complete. A standard HTTP request will timeout, making the UI think the generation failed when it is actually still running in the background.
*   **The Solution**: We already use a **Native Queue** and **SSE Logging**. This is the correct production pattern. The frontend makes a request to "start" the job, and then "listens" to the log stream to know when it finishes. This bypasses HTTP timeouts entirely.

---

## 🛠️ Recommended Production Stack

For a stable, multi-user deployment, we recommend the following "Gold Standard" setup:

| Component | Recommended Platform | Reason |
| :--- | :--- | :--- |
| **Frontend** | **Vercel** | Best-in-class React hosting and edge performance. |
| **Backend** | **Render (Web Service)** | Supports long-running Node.js processes and child-process spawning. |
| **Database** | **TiDB Serverless** | 100% Free, MySQL-compatible, and highly scalable. |
| **Execution** | **Docker Containers** | For real production, each user's "Run" project should be isolated in its own Docker container to prevent security risks. |

## 🚀 The "Hybrid" Solution (Best for Testing)
If you want to share SYNAPSE with users today without rewriting the architecture, the best method is to run it on your local machine and use a **Tunneling Service**:
1.  Run the app locally.
2.  Use **Ngrok** or **Cloudflare Tunnels** to expose your local ports (3005 and 5173) to the internet.
3.  This keeps the filesystem stable and allows your personal CPU to handle the heavy generation tasks for your testers.
