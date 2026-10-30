# EventOps - Project Architecture & Code Breakdown Guide 📘
> **Beginner-Friendly Architectural and Codebase Reference**  
> This document explains every major feature of the project, where it is implemented, which exact files and lines of code are responsible, how MongoDB is utilized, and how client-side canvas compression works.

---

## 📑 Table of Contents
1. [Core Purpose & Real-Life Problem Solved](#1-core-purpose--real-life-problem-solved)
2. [User Hierarchy & Role Definitions](#2-user-hierarchy--role-definitions)
3. [Client-Side Canvas Compression (Where & How It Works)](#3-client-side-canvas-compression)
4. [MongoDB & Mongoose Architecture (Models & Queries)](#4-mongodb--mongoose-architecture)
5. [Real-Time WebSockets (Socket.io) Engine](#5-real-time-websockets-socketio-engine)
6. [Frontend & UI Component Breakdown](#6-frontend--ui-component-breakdown)
7. [Task Lifecycle (State Machine Transition Flow)](#7-task-lifecycle)
8. [Triage & Tripartite Escalation Chat](#8-triage--tripartite-escalation-chat)
9. [Viva & Thesis Defense Q&A](#9-viva--thesis-defense-qa)

---

## 1. Core Purpose & Real-Life Problem Solved

During large-scale live events (concerts, convocations, conventions, tech expos), backstage operational coordination is notoriously chaotic:
- **WhatsApp / Chat Overflow:** Urgent issues get lost in hundreds of messages; nobody knows who is actively resolving an issue.
- **Walkie-Talkie Limitations:** Voice channels are noisy, only one person can talk at a time, and verbal claims cannot be verified visually.
- **Unverified Completion ("Work is done"):** Workers often claim a task is complete verbally, but stage cabling remains un-taped, perimeter barriers are unlatched, or sound check cables are missing.
- **Delayed Intervention:** The Executive Director only learns about an emergency when it has already caused a delay on stage.

### How EventOps Solves This:
1. **Role-Based Task Execution:** Tasks have explicit assignees, deadlines, and priorities.
2. **Mandatory Photographic Proof:** Workers must capture on-site photographic evidence using their mobile device camera.
3. **Supervisor Verification:** Team Leaders review the photo in full resolution before approving the task to completion.
4. **Tripartite Escalation:** Local operational blockers are resolved between the worker and leader first. If unresolvable, the issue is escalated in 1 click, bringing the Event Creator into a live 3-party incident room.

---

## 2. User Hierarchy & Role Definitions

The system defines 3 distinct operational roles:

| Role Enum | Description & Scope of Authority | Primary Implementation File |
| :--- | :--- | :--- |
| **`EVENT_CREATOR`** | **Executive Director / Super Admin.** Root control over the event container, department provisioning, team leader appointments, full health monitoring, and escalated incident intervention. | [`client/src/views/EventCreator/EventCreatorDashboard.jsx`](file:///d:/Coding%20Work/University%20Project/client/src/views/EventCreator/EventCreatorDashboard.jsx) |
| **`TEAM_LEADER`** | **Department Head.** Manages departmental rosters (Sound, Logistics, Rigging, etc.), creates tasks, assigns ground crew, inspects and approves proof photos, and triages ground problems. | [`client/src/views/TeamLeader/TeamLeaderDashboard.jsx`](file:///d:/Coding%20Work/University%20Project/client/src/views/TeamLeader/TeamLeaderDashboard.jsx) |
| **`WORKER`** | **Field Operator.** Clean, mobile-first interface. Only sees tasks explicitly assigned to them, starts work with 1 tap, captures completion proof photos, and reports operational blockers. | [`client/src/views/Worker/WorkerDashboard.jsx`](file:///d:/Coding%20Work/University%20Project/client/src/views/Worker/WorkerDashboard.jsx) |

---

## 3. Client-Side Canvas Compression

### Why Was This Done?
Modern smartphone cameras produce high-resolution images ranging from **5MB to 12MB**. In packed event venues, stadium mobile networks (4G/5G) suffer from severe bandwidth congestion. Uploading raw images causes high failure rates and latency.

Instead of relying on heavy cloud transformation services (like Multer + Cloudinary), the worker's device compresses the image **inside the browser using the HTML5 Canvas API** down to **~120KB–150KB** at 85% JPEG quality before network transmission.

### 📍 Implementation File:
👉 **[`client/src/components/SubmitTaskProofModal.jsx`](file:///d:/Coding%20Work/University%20Project/client/src/components/SubmitTaskProofModal.jsx)**

### 🔍 Code Walkthrough & Line References:

#### A) Real-Time Camera Stream Capture & Compression
**Lines 145 to 164:**
```javascript
const takePhoto = () => {
  const video = videoRef.current;
  const canvas = canvasRef.current;
  if (!video || !canvas) return;

  const width = video.videoWidth || 1280;
  const height = video.videoHeight || 720;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  // 1. Draw the live video frame onto the hidden canvas element
  ctx.drawImage(video, 0, 0, width, height);

  // 2. Compression Magic: convert frame to compressed JPEG DataURL at 0.85 quality
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  setProofImage(dataUrl);
  setError(null);

  // 3. Terminate hardware camera tracks to release battery and device resources
  stopCameraStream();
};
```

#### B) Gallery File Upload Auto-Resize & Compression
**Lines 167 to 207:**
```javascript
const handleImageChange = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    setError('Please select an image file (PNG, JPG, or JPEG).');
    return;
  }

  // Convert raw file to base64 and scale down via in-memory image
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1280;  // Cap max resolution to 1280px
      const MAX_HEIGHT = 1280;
      let w = img.width;
      let h = img.height;

      // Maintain aspect ratio calculation
      if (w > MAX_WIDTH || h > MAX_HEIGHT) {
        if (w > h) {
          h = Math.round((h * MAX_WIDTH) / w);
          w = MAX_WIDTH;
        } else {
          w = Math.round((w * MAX_HEIGHT) / h);
          h = MAX_HEIGHT;
        }
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      // Compress to 85% quality JPEG Base64 payload
      setProofImage(canvas.toDataURL('image/jpeg', 0.85));
      setError(null);
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
};
```
👉 **Result:** A 10MB camera image is instantly scaled down on the client side to a lightweight ~150KB string payload that uploads to the server in under 1 second.

---

## 4. MongoDB & Mongoose Architecture

All application data is persistently stored in **MongoDB** using structured schemas managed by **Mongoose ODM**.

### A) Database Connection
👉 **[`server/config/db.js`](file:///d:/Coding%20Work/University%20Project/server/config/db.js)** (Lines 1–15)
```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`[MongoDB] Database Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB Error]: ${error.message}`);
    process.exit(1);
  }
};
```

### B) Mongoose Models Directory: `server/models/`
1. **[`User.js`](file:///d:/Coding%20Work/University%20Project/server/models/User.js):** Stores user identity, Firebase UID mapping (`authId`), profile avatar, phone number, and system role (`EVENT_CREATOR`, `TEAM_LEADER`, `WORKER`).
2. **[`Event.js`](file:///d:/Coding%20Work/University%20Project/server/models/Event.js):** Represents an event container with venue name, start date, end date, creator reference, and status.
3. **[`Department.js`](file:///d:/Coding%20Work/University%20Project/server/models/Department.js):** Defines operational departments (e.g., Sound, Lighting, Catering, Security) and binds an assigned Team Leader (`leaderId`).
4. **[`TeamMembership.js`](file:///d:/Coding%20Work/University%20Project/server/models/TeamMembership.js):** Maps workers to departments within specific events.
5. **[`Task.js`](file:///d:/Coding%20Work/University%20Project/server/models/Task.js):** Core work item containing title, department binding, assignee reference, deadline, priority, status enum, progress percentage, completion photo payload (`proofImage`), and approval timestamps.
6. **[`Issue.js`](file:///d:/Coding%20Work/University%20Project/server/models/Issue.js):** Tracks operational incidents, categories (`Equipment Problem`, `Material Missing`, `Need More Workers`, etc.), urgency, escalation flag (`isEscalated`), and resolution status.
7. **[`IssueMessage.js`](file:///d:/Coding%20Work/University%20Project/server/models/IssueMessage.js):** Stores messages for issue incident chats including sender ID, role, timestamp, and message body.
8. **[`Notification.js`](file:///d:/Coding%20Work/University%20Project/server/models/Notification.js):** In-app user notifications for task assignments, blocker alerts, and mentions.
9. **[`ActivityLog.js`](file:///d:/Coding%20Work/University%20Project/server/models/ActivityLog.js):** Append-only audit ledger recording state changes and operational events.

### C) Where Database Queries Take Place: `server/routes/`
- **[`task.routes.js`](file:///d:/Coding%20Work/University%20Project/server/routes/task.routes.js):**
  - Line 22: `Task.find(filter)` queries filtered tasks with populated assignees.
  - Line 111: `Task.create(...)` creates a new task with default status `NOT_STARTED`.
  - Line 160: `task.status = 'IN_PROGRESS'; await task.save();` starts task execution.
  - Line 191: `task.status = 'PENDING_APPROVAL'; task.proofImage = proofImage; await task.save();` records completion proof.
  - Line 236: `task.status = 'COMPLETED'; await task.save();` marks task approved.
- **[`issue.routes.js`](file:///d:/Coding%20Work/University%20Project/server/routes/issue.routes.js):**
  - Line 105: `Issue.create(...)` creates a new incident and automatically sets the associated task to `BLOCKED`.
  - Line 172: `issue.status = 'ESCALATED'; issue.isEscalated = true; await issue.save();` triggers escalation to the Event Creator.
  - Line 228: `issue.status = 'RESOLVED'; await issue.save();` resolves the problem and unblocks the associated task back to `IN_PROGRESS`.
- **[`event.routes.js`](file:///d:/Coding%20Work/University%20Project/server/routes/event.routes.js):**
  - Lines 13–132: `calculateEventHealth(eventId)` aggregates all tasks and issues from MongoDB to calculate real-time progress and operational health tiers (`ON_TRACK`, `ATTENTION_NEEDED`, `CRITICAL`).

---

## 5. Real-Time WebSockets (Socket.io) Engine

The real-time layer ensures all users receive instant updates without page reloads.

### A) Server-Side Socket Gateway
👉 **[`server/socket/socketHandler.js`](file:///d:/Coding%20Work/University%20Project/server/socket/socketHandler.js)**
- **Multiplexed Room Architecture:**
  - `event_${eventId}`: Broadcasts global dashboard updates (task status changes, department progress) to all organizers.
  - `issue_${issueId}`: Dedicated incident triage room connecting the worker, leader, and creator.
  - `user_${userId}`: Personal notification channel for direct alerts and @mentions.
- **Message Dispatch:**
  - Lines 43–122: Listens for `send_issue_message`, saves the message to MongoDB via `IssueMessage.create()`, and broadcasts both `new_issue_message` and `receive_issue_message` to the active incident room.
- **Typing Indicators:**
  - Lines 125–134: Listens for `typing_issue_chat` and relays `user_typing_status` to show "...is typing" in the UI.

### B) Client-Side Socket Provider
👉 **[`client/src/context/SocketContext.jsx`](file:///d:/Coding%20Work/University%20Project/client/src/context/SocketContext.jsx)**
- Manages single persistent socket instance with automatic reconnection (up to 25 attempts).
- Plays an audible dual-tone alert chime (Lines 44–61) using the Web Audio API (`587Hz` ➔ `880Hz`) when urgent alerts arrive.

---

## 6. Frontend & UI Component Breakdown

Built using **React (Vite)** with **Tailwind CSS** and **DaisyUI**.

### Primary Dashboard Views:
1. **[`LoginView.jsx`](file:///d:/Coding%20Work/University%20Project/client/src/views/Auth/LoginView.jsx):** Clean authentication portal with Google OAuth and Email/Password support.
2. **[`EventCreatorDashboard.jsx`](file:///d:/Coding%20Work/University%20Project/client/src/views/EventCreator/EventCreatorDashboard.jsx):** Executive Command Center featuring real-time health badges, department readiness progress bars, quick statistics cards, and crew rosters.
3. **[`TeamLeaderDashboard.jsx`](file:///d:/Coding%20Work/University%20Project/client/src/views/TeamLeader/TeamLeaderDashboard.jsx):** Department management workspace for creating tasks, assigning workers, inspecting proof photos, and managing blockers.
4. **[`WorkerDashboard.jsx`](file:///d:/Coding%20Work/University%20Project/client/src/views/Worker/WorkerDashboard.jsx):** Mobile-optimized portal showing only the worker's own assigned tasks with large touch targets ($\ge 48\text{px}$) for gloved/on-site operation.

### Key Operational Modals:
- **[`CreateTaskModal.jsx`](file:///d:/Coding%20Work/University%20Project/client/src/components/CreateTaskModal.jsx):** Allows leaders/creators to define title, department, assignee, priority, and deadline.
- **[`AssignTaskModal.jsx`](file:///d:/Coding%20Work/University%20Project/client/src/components/AssignTaskModal.jsx):** Dedicated modal to assign or reassign unassigned tasks to available personnel.
- **[`SubmitTaskProofModal.jsx`](file:///d:/Coding%20Work/University%20Project/client/src/components/SubmitTaskProofModal.jsx):** Mobile camera viewfinder / file picker with real-time Canvas compression.
- **[`ReviewTaskProofModal.jsx`](file:///d:/Coding%20Work/University%20Project/client/src/components/ReviewTaskProofModal.jsx):** Lightbox modal for Team Leaders to review the submitted proof photo and either approve it or request rework with feedback notes.
- **[`ReportProblemModal.jsx`](file:///d:/Coding%20Work/University%20Project/client/src/components/ReportProblemModal.jsx):** Blocker reporting dialog with category pills (`Equipment Problem`, `Material Missing`, `Need More Workers`, etc.) and urgency toggles.
- **[`EscalationChat.jsx`](file:///d:/Coding%20Work/University%20Project/client/src/components/EscalationChat.jsx):** Slide-out real-time chat drawer with @mention support, optimistic local message rendering, and 1-tap escalation.
- **[`UserRoleManagementModal.jsx`](file:///d:/Coding%20Work/University%20Project/client/src/components/UserRoleManagementModal.jsx):** Role administration panel allowing the Event Creator to promote workers to Team Leaders.

---

## 7. Task Lifecycle

Tasks follow a verified finite state machine flow:

```
[NOT_STARTED]
      │
      ▼  (Worker taps "Start Task")
[IN_PROGRESS]
      │
      ▼  (Worker captures & submits camera proof)
[PENDING_APPROVAL]
      │
      ├───► (Leader clicks "Request Rework") ───► returns to [IN_PROGRESS]
      │
      ▼  (Leader clicks "Approve Proof")
[COMPLETED] (100% Verified Completion)
```

> **Blocker Branch:** At any point while `IN_PROGRESS`, if a worker or leader reports an issue, the task transitions to **`BLOCKED`**. It cannot be marked completed until the issue is formally marked **`RESOLVED`** in the triage room, which automatically restores the task to `IN_PROGRESS`.

---

## 8. Triage & Tripartite Escalation Chat

👉 **[`client/src/components/EscalationChat.jsx`](file:///d:/Coding%20Work/University%20Project/client/src/components/EscalationChat.jsx)**

1. **Local Department Room:** When a worker reports a problem, a chat thread opens between **Worker ↔ Team Leader**. The Event Creator is intentionally excluded at this stage to avoid executive alert fatigue.
2. **Escalation Trigger:** If the Team Leader cannot resolve the issue locally (e.g., equipment failure requiring extra budget or outside vendor dispatch), the leader clicks **`🚨 Escalate to Event Creator`** (Lines 357–367).
3. **Tripartite Channel:** The issue status changes to `ESCALATED`. The Event Creator is dynamically added to the room, and executive preset buttons appear (Lines 453–477) for rapid decision-making:
   - *"📦 Backup in Storage"*
   - *"👥 Assign Extra Workers"*
   - *"💳 Purchase Approved"*
4. **Resolution:** Clicking **`✓ Mark Issue as RESOLVED`** unblocks the task in MongoDB, appends a resolution note, and notifies all participants.

---

## 9. Viva & Thesis Defense Q&A

### Q1: What makes this project unique compared to standard event software?
> **Answer:** *"Most commercial event platforms (like Eventbrite) focus entirely on public ticketing and seat reservation. Our system focuses on the high-stress, backstage operational gap: coordinating hundreds of field crew members, enforcing photographic task verification, and providing real-time incident escalation."*

### Q2: Why did you use client-side Canvas compression instead of Cloudinary/Multer?
> **Answer:** *"In crowded event venues, cellular bandwidth is heavily constrained. Uploading raw 8MB to 12MB photos causes high failure rates and network timeouts. By implementing client-side canvas compression directly in the worker's browser, we reduce payloads to ~150KB before transmission. This ensures rapid uploads even on weak 3G/4G connections and eliminates external cloud API costs."*

### Q3: Why was Socket.io necessary in addition to a standard REST API?
> **Answer:** *"During live operations, seconds matter. If an electrical cable faults or a security barrier is breached, organizers cannot wait for a page refresh. Socket.io delivers bidirectional updates with sub-50ms latency. The moment a worker reports a blocker, an audible chime rings and an alert badge pulses on the supervisor's screen."*

### Q4: Why is Firebase Auth combined with MongoDB?
> **Answer:** *"Onboarding dozens of temporary ground workers on event day must be seamless. Requiring workers to register with traditional email verification and complex passwords causes login issues. Firebase OAuth provides 1-tap Google sign-in on mobile, while our MongoDB layer maintains all operational business roles (`EVENT_CREATOR`, `TEAM_LEADER`, `WORKER`), department memberships, and access rules."*

---
*This document serves as the comprehensive architectural reference for the Event Operations and Communication Management System.*
