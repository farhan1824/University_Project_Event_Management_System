# Event Operations and Communication Management System - Project Tracker

## 📌 Project Overview
A centralized, hierarchical event operations and coordination platform connecting:
**Single Event Creator (Super Admin) ➔ Team Leaders (Department Managers) ➔ Ground Workers (Field Operators)**.

### Clean Slate Mode (Zero Demo Data)
1. **100% MongoDB Persistence:** All data is stored in MongoDB via structured Mongoose models. Zero JSON mock files.
2. **Clean Database:** Starts with zero demo records so you can build your real events, departments, and teams.
3. **First-User Super Admin Rule:** The very first user to register via Firebase is automatically designated as the **Event Creator (Super Admin)**.
4. **Worker Registration:** All subsequent users register as **Ground Workers**.
5. **Creator Promotion & Delegation:** The Event Creator can create events, add departments, assign workers to departments, promote workers to **Team Leaders**, and assign operational tasks with deadlines.

---

## 🛠️ Technology Stack
* **Frontend**: React (Vite), DaisyUI, Tailwind CSS, Lucide Icons, Axios, Socket.io-client, Firebase Auth SDK.
* **Backend**: Node.js, Express.js, Socket.io (WebSockets), **MongoDB with Mongoose ODM**.
* **Authentication**: Firebase Authentication (Email/Password & Google Sign-In) synced with MongoDB User records.

---

## 🗄️ MongoDB Database Architecture (Mongoose Models)
* [`server/models/User.js`](file:///d:/Coding%20Work/University%20Project/server/models/User.js): User profiles, Firebase UID mapping, system roles (`EVENT_CREATOR`, `TEAM_LEADER`, `WORKER`).
* [`server/models/Event.js`](file:///d:/Coding%20Work/University%20Project/server/models/Event.js): Multi-event operational units with dates, locations, and status.
* [`server/models/Department.js`](file:///d:/Coding%20Work/University%20Project/server/models/Department.js): Functional teams within an event (e.g., Logistics, Stage, Catering, Security) with assigned Team Leaders.
* [`server/models/TeamMembership.js`](file:///d:/Coding%20Work/University%20Project/server/models/TeamMembership.js): Worker-to-Department associations with role access scopes.
* [`server/models/Task.js`](file:///d:/Coding%20Work/University%20Project/server/models/Task.js): Granular work items with priority, deadlines, assignees, and live progress.
* [`server/models/Issue.js`](file:///d:/Coding%20Work/University%20Project/server/models/Issue.js): Operational problem reports with categorization, priority levels, and escalation status.
* [`server/models/IssueMessage.js`](file:///d:/Coding%20Work/University%20Project/server/models/IssueMessage.js): Real-time contextual triage chat threads between Worker ↔ Team Leader ↔ Event Creator.
* [`server/models/Notification.js`](file:///d:/Coding%20Work/University%20Project/server/models/Notification.js): In-app alerts for assignments, escalations, problem reports, and team changes.
* [`server/models/CollaborationRequest.js`](file:///d:/Coding%20Work/University%20Project/server/models/CollaborationRequest.js): Cross-creator event collaboration & volunteer pool sharing invitations.
* [`server/models/ActivityLog.js`](file:///d:/Coding%20Work/University%20Project/server/models/ActivityLog.js): Audit trails and live event timeline activity.

---

## 📂 Configuration & Connection
* **MongoDB URI:** Configured in [`server/.env`](file:///d:/Coding%20Work/University%20Project/server/.env) via `MONGODB_URI` (supports local `mongodb://127.0.0.1:27017/eventops` or MongoDB Atlas cloud `mongodb+srv://...`).
* **Firebase Config:** [`client/.env`](file:///d:/Coding%20Work/University%20Project/client/.env)
* **Auth Gate:** [`client/src/views/Auth/LoginView.jsx`](file:///d:/Coding%20Work/University%20Project/client/src/views/Auth/LoginView.jsx)
* **Event Creator Hub:** [`client/src/views/EventCreator/EventCreatorDashboard.jsx`](file:///d:/Coding%20Work/University%20Project/client/src/views/EventCreator/EventCreatorDashboard.jsx)
