# 🏛️ Edusphere - Modern College Management System

> **College Tech Fest 2026 Interactive Demo**  
> An institutional management platform featuring Role-Based Access Control (RBAC), autonomous curriculum tracking, real-time attendance, and integrated Complaint Management schema.

---

## 🚀 Quickstart Guide

This project is configured with `concurrently` so you can install and run the entire full-stack application with single commands from the repository root.

### 1. Prerequisites
- **Node.js**: v18+ (Node 22 or Node 26 recommended for built-in zero-dependency SQLite)
- **NPM**: v9+

### 2. Setup & Installation
Clone the repository and install all dependencies (root, backend, and frontend):

```bash
# Install root orchestration tools
npm install

# Install server and client dependencies
npm run install:all
```

### 3. Database Seeding
Initialize the SQLite database with 2 departments, 1 admin, 2 HODs, 3 faculty, 20 students, 5 courses, enrollments, sample marks, and attendance:

```bash
npm run seed
```

### 4. Run Locally (Development Mode)
Run both backend (`http://localhost:5000`) and frontend (`http://localhost:5173`) concurrently:

```bash
npm run dev
```

Open your browser and navigate to **`http://localhost:5173`**.

---

## 📱 Phone Setup & Live Classroom Attendance

Edusphere's live attendance system allows students to scan a dynamic QR code directly from the classroom projector screen or open the app on their smartphones.

### 1. Connect to the Same Network
- Ensure the instructor's laptop and student smartphones are connected to the **same Wi-Fi router** or a **mobile hotspot** hosted by the laptop/phone.

### 2. Find Your Laptop LAN IP Address
- On Windows, open PowerShell or Command Prompt and run:
  ```powershell
  ipconfig
  ```
- Look for the **IPv4 Address** under your active Wi-Fi or Ethernet adapter (e.g., `192.168.1.15` or `10.0.0.12`).

### 3. Windows Firewall Prompt
- When running `npm run dev` or `node server/src/server.js` for the first time, Windows Defender Firewall may display a prompt asking to allow Node.js to communicate on networks.
- Check the box for **"Private networks (such as my home or work network)"** and click **"Allow access"**.
- If students cannot connect to your laptop, temporarily check that Windows Firewall is not blocking inbound TCP traffic on ports `5173` (Vite) and `5000` (Express API).

### 4. Student Phone Access
- Students can scan the QR code displayed on the projector screen using their phone camera.
- Alternatively, students can open their phone browser and navigate to:
  ```text
  http://<laptop-LAN-IP>:5173
  ```
  *(Example: `http://192.168.1.15:5173`)*
- Students log in with their enrolled credentials (e.g. `student1@edusphere.edu` / `Student@123`), enter the 6-digit rotating code, and check in.
- The anti-proxy engine checks that the student's IP is in the same local subnet, binds the device on first use, and flags unauthorized proxy attempts.

---

## 🔑 Demo Login Accounts

During the tech fest demo, you can either click the **"Quick Demo Accounts"** one-click buttons on the login screen or enter the credentials below:

| Persona | Role | Department | Email | Password | Access Highlights |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **System Administrator** | `admin` | Central Administration | `admin@edusphere.edu` | `Admin@123` | Institution-wide analytics, departments oversight, faculty/student registry |
| **Dr. Rajesh Gupta** | `hod` | Computer Science (`CSE`) | `hod.cse@edusphere.edu` | `Hod@123` | Department student list, faculty roster, course allocations, notices |
| **Dr. Sunita Rao** | `hod` | Electronics & Comm. (`ECE`) | `hod.ece@edusphere.edu` | `Hod@123` | ECE department governance, curriculum modules |
| **Prof. Vikram Sharma** | `faculty` | Computer Science (`CSE`) | `faculty.sharma@edusphere.edu` | `Faculty@123` | Allocated subjects (`CSE-201`, `CSE-203`), class attendance register |
| **Prof. Neha Patel** | `faculty` | Computer Science (`CSE`) | `faculty.patel@edusphere.edu` | `Faculty@123` | Allocated subject (`CSE-202`), student marks entry |
| **Prof. Amit Verma** | `faculty` | Electronics & Comm. (`ECE`) | `faculty.verma@edusphere.edu` | `Faculty@123` | Allocated subjects (`ECE-201`, `ECE-202`), class schedule |
| **Aarav Mehta** | `student` | Computer Science (`CSE`) | `student1@edusphere.edu` | `Student@123` | Enrolled coursework, attendance percentage (92%), internal marks |
| **Ananya Iyer** | `student` | Electronics & Comm. (`ECE`) | `student11@edusphere.edu` | `Student@123` | ECE coursework, semester attendance |

> **Note on Default Passwords for Onboarding:**  
> - Newly added students via the Admin portal receive the default initial password **`Student@123`**.  
> - Newly added faculty members via the Admin portal receive the default initial password **`Faculty@123`**.  
> - Newly created Heads of Department (HOD) receive the default initial password **`Hod@123`**.  
> - Students `student1@edusphere.edu` through `student10@edusphere.edu` (CSE) and `student11@edusphere.edu` through `student20@edusphere.edu` (ECE) all share the password `Student@123`.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**:
  - React 18 with Vite
  - Tailwind CSS with custom `edu` blue design system
  - Lucide React icons
  - React Router DOM v6 with role-guarded routes (`ProtectedRoute`)
- **Backend**:
  - Node.js + Express
  - JWT Authentication (`jsonwebtoken`) + Password Hashing (`bcryptjs`)
  - CORS middleware
- **Database**:
  - SQLite running via Node's native `node:sqlite` (zero external C++ compilation dependencies, zero node-gyp issues on Windows) with automatic WAL mode and foreign key constraints enabled.
- **Orchestration**:
  - `concurrently` in root `package.json` to boot both client and server with a single terminal command.

---

## 🗄️ Database Schema Design (All 14 Tables)

The database file is located at `server/data/edusphere.db`.

```
departments
 ├── id (INTEGER PRIMARY KEY)
 ├── name (TEXT)
 ├── code (TEXT UNIQUE)
 └── created_at (DATETIME)

users
 ├── id (INTEGER PRIMARY KEY)
 ├── name (TEXT)
 ├── email (TEXT UNIQUE)
 ├── password_hash (TEXT)
 ├── role ('admin' | 'hod' | 'faculty' | 'student')
 ├── department_id (FK -> departments.id, NULL for admin)
 ├── phone (TEXT)
 ├── avatar_url (TEXT)
 └── created_at (DATETIME)

courses
 ├── id (INTEGER PRIMARY KEY)
 ├── name (TEXT)
 ├── code (TEXT UNIQUE)
 ├── department_id (FK -> departments.id)
 ├── faculty_id (FK -> users.id)
 ├── credits (INTEGER)
 ├── semester (INTEGER)
 └── created_at (DATETIME)

enrollments
 ├── id (INTEGER PRIMARY KEY)
 ├── student_id (FK -> users.id)
 ├── course_id (FK -> courses.id)
 ├── semester (INTEGER)
 ├── academic_year (TEXT)
 ├── status ('active' | 'completed' | 'dropped')
 └── enrolled_at (DATETIME)

attendance
 ├── id (INTEGER PRIMARY KEY)
 ├── student_id (FK -> users.id)
 ├── course_id (FK -> courses.id)
 ├── date (TEXT)
 ├── status ('present' | 'absent' | 'late')
 ├── marked_by (FK -> users.id)
 ├── remarks (TEXT)
 └── created_at (DATETIME)

marks
 ├── id (INTEGER PRIMARY KEY)
 ├── student_id (FK -> users.id)
 ├── course_id (FK -> courses.id)
 ├── exam_type ('internal_1' | 'internal_2' | 'assignment' | 'final')
 ├── score (REAL)
 ├── max_score (REAL)
 ├── remarks (TEXT)
 └── updated_at (DATETIME)

notices
 ├── id (INTEGER PRIMARY KEY)
 ├── title (TEXT)
 ├── content (TEXT)
 ├── target_role ('all' | 'student' | 'faculty' | 'hod')
 ├── department_id (FK -> departments.id, NULL for institute-wide)
 ├── author_id (FK -> users.id)
 └── created_at (DATETIME)

complaints (Phase 2 Active)
 ├── id (INTEGER PRIMARY KEY)
 ├── ticket_no (TEXT UNIQUE, e.g. CMP-0001)
 ├── title (TEXT)
 ├── description (TEXT)
 ├── category ('academic' | 'faculty' | 'hostel' | 'canteen' | 'infrastructure' | 'library' | 'other')
 ├── status ('submitted' | 'under_review' | 'in_progress' | 'resolved')
 ├── is_anonymous (INTEGER 0/1)
 ├── escalated (INTEGER 0/1)
 ├── escalated_at (DATETIME NULLABLE)
 ├── assigned_role ('hod' | 'admin')
 ├── submitted_by (FK -> users.id)
 ├── assigned_to (FK -> users.id)
 ├── department_id (FK -> departments.id)
 ├── created_at (DATETIME)
 └── updated_at (DATETIME)

complaint_updates (Phase 2 Active)
 ├── id (INTEGER PRIMARY KEY)
 ├── complaint_id (FK -> complaints.id)
 ├── new_status (TEXT)
 ├── remark (TEXT)
 ├── updated_by (FK -> users.id)
 └── created_at (DATETIME)

assignments (Phase 7 Active)
 ├── id (INTEGER PRIMARY KEY)
 ├── course_id (FK -> courses.id)
 ├── title (TEXT)
 ├── description (TEXT)
 ├── due_date (DATETIME)
 ├── max_marks (REAL)
 ├── attachment_path (TEXT)
 ├── attachment_name (TEXT)
 ├── created_by (FK -> users.id)
 └── created_at (DATETIME)

assignment_submissions (Phase 7 Active)
 ├── id (INTEGER PRIMARY KEY)
 ├── assignment_id (FK -> assignments.id)
 ├── student_id (FK -> users.id)
 ├── file_path (TEXT)
 ├── original_filename (TEXT)
 ├── file_size (INTEGER)
 ├── mime_type (TEXT)
 ├── extracted_text (TEXT)
 ├── is_late (INTEGER 0/1)
 ├── marks (REAL)
 ├── feedback (TEXT)
 ├── graded_by (FK -> users.id)
 ├── graded_at (DATETIME)
 ├── review_decision ('flagged' | 'needs_discussion' | 'cleared')
 ├── review_notes (TEXT)
 ├── reviewed_at (DATETIME)
 └── submitted_at (DATETIME)

integrity_pairs (Phase 8 Active)
 ├── id (INTEGER PRIMARY KEY)
 ├── assignment_id (FK -> assignments.id)
 ├── sub_a_id (FK -> assignment_submissions.id)
 ├── sub_b_id (FK -> assignment_submissions.id)
 ├── score (REAL)
 ├── match_summary (TEXT)
 ├── ai_likelihood (REAL)
 └── checked_at (DATETIME)

resources (Phase 9 Active)
 ├── id (INTEGER PRIMARY KEY)
 ├── course_id (FK -> courses.id)
 ├── title (TEXT)
 ├── description (TEXT)
 ├── category ('notes' | 'slides' | 'previous_paper' | 'reference' | 'other')
 ├── file_path (TEXT)
 ├── file_name (TEXT)
 ├── file_size (INTEGER)
 ├── external_url (TEXT)
 ├── uploaded_by (FK -> users.id)
 ├── download_count (INTEGER DEFAULT 0)
 └── created_at (DATETIME)

timetable_slots (Phase 10 Active)
 ├── id (INTEGER PRIMARY KEY)
 ├── course_id (FK -> courses.id)
 ├── day_of_week (INTEGER 1-6: Mon-Sat)
 ├── start_time (TEXT, HH:MM 24h)
 ├── end_time (TEXT, HH:MM 24h)
 ├── room (TEXT)
 ├── slot_type ('lecture' | 'lab' | 'tutorial')
 ├── created_by (FK -> users.id)
 └── created_at (DATETIME)
```

---

## 📢 Phase 2: Complaint Management Module (Student & Routing)

### 1. Automated Routing Rules
- **Department HOD**: Complaints in categories `'academic'` and `'faculty'` are automatically routed to the student's respective Head of Department (`department_id` = student's department, `assigned_role` = `'hod'`).
- **Central Administration**: Complaints in categories `'hostel'`, `'canteen'`, `'infrastructure'`, `'library'`, and `'other'` are assigned to Central Administration (`assigned_role` = `'admin'`).

### 2. Anonymity Protection
- If `is_anonymous` is toggled on, the student's identity is masked across:
  - The complaint's `submitter_name` $\rightarrow$ `"Anonymous"`.
  - In `complaint_updates` where the student logged an update $\rightarrow$ `updater_name` is masked to `"Anonymous"`.
- Handled through a reusable helper (`maskComplaintForUser`) that Phase 3 HOD/Admin endpoints will consume.

### 3. Student Interface Pages
- **New Complaint** (`/student/complaints/new`): Interactive category selector with live routing preview, title, description, anonymous toggle, and success modal with generated ticket number.
- **My Complaints** (`/student/complaints`): Filterable registry by status (`All`, `Submitted`, `Under Review`, `In Progress`, `Resolved`), category dropdown, search bar, and color-coded status badges.
- **Complaint Detail & Timeline** (`/student/complaints/:ticket_no`): Vertical chronological update audit log and a milestone stepper that accounts for skipped stages (e.g. `CMP-0007`).

### 4. Seeded Complaints Catalog
1. `CMP-0001`: AC malfunctioning in CSE Lab 3 (`infrastructure`, `under_review`, 5 days old, un-escalated initially).
2. `CMP-0002`: Wi-Fi signal drop on Library 2nd Floor (`library`, `submitted`, 2 days old, **Anonymous #1**).
3. `CMP-0003`: Schedule conflict between DSA & OS Lab (`academic`, `in_progress`, 4 days old, routes to HOD CSE, un-escalated initially).
4. `CMP-0004`: Food hygiene inspection in Central Canteen (`canteen`, `resolved`, 6 days old, routes to Admin).
5. `CMP-0005`: Clarification on DBMS assignment 2 grading rubric (`faculty`, `under_review`, 1 day old, **Anonymous #2**, routes to HOD CSE).
6. `CMP-0006`: Inconsistent water pressure in Boys Hostel Wing B (`hostel`, `in_progress`, 3 days old, pre-escalated).
7. `CMP-0007`: VLSI workshop reference materials (`academic`, `resolved`, 4 days old, **Skipped stage**: submitted → in_progress → resolved).
8. `CMP-0008`: Evening campus shuttle bus frequency (`other`, `submitted`, 1 day old, routes to Admin).

---

## ⚡ Phase 3: HOD & Admin Complaint Handling & SLA Escalation

### 1. Forward-Only Status Progression
Admins and HODs manage complaints through a strict forward lifecycle:
$$\text{Submitted} \longrightarrow \text{Under Review} \longrightarrow \text{In Progress} \longrightarrow \text{Resolved}$$
- **Forward-only Rule**: Statuses can only move forward (`Submitted` → `Under Review` → `In Progress` → `Resolved`).
- **Stage Skipping Allowed**: A complaint can skip directly from `Submitted` to `In Progress` or `Resolved` (e.g. `CMP-0007`).
- **Backward Movement Rejected**: Attempting to move backward returns HTTP 400.
- **Resolved is Final**: Resolved complaints are permanently locked and cannot be edited.
- **Mandatory Audit Remark**: Every status transition requires an explanation remark of at least 5 characters.

### 2. Automated 3-Day SLA Escalation Engine
- **SLA Rule**: Any unresolved complaint older than **3 days** is flagged overdue.
  - Complaints assigned to **HOD** are reassigned to `assigned_role = 'admin'` with `escalated = 1` and `escalated_at = CURRENT_TIMESTAMP`. A system timeline update is added: *"Auto-escalated to Central Administration due to exceeding 3-day resolution SLA."*
  - Complaints already assigned to **Admin** remain with Admin but are flagged `escalated = 1` and `escalated_at = CURRENT_TIMESTAMP`. A system timeline update is added: *"Complaint flagged as Overdue (exceeded 3-day SLA threshold)."*
- **`AUTO_ESCALATION` Environment Flag**:
  - Configured in `server/.env` (`AUTO_ESCALATION=false` by default).
  - When `false`, the automated startup check and hourly timer do **not** run.
  - The **on-demand Admin button** always works immediately, guaranteeing demo data remains un-escalated until you click the button live during the exhibition.
- **Dynamic Relative Dates**: `seed.js` uses relative timestamps (`Date.now() - X days`), ensuring `CMP-0001` (5 days old) and `CMP-0003` (4 days old) are guaranteed >3 days old whenever seeded or reset.

### 3. Read-Only HOD Visibility for Escalated Tickets
- When a complaint is escalated from HOD to Admin (e.g., `CMP-0003`), the HOD **still retains visibility** in their Department Complaints list.
- An **"Escalated to Admin"** badge appears in their queue.
- Clicking the complaint opens a read-only detail view (`is_read_only = true`) with the status update panel disabled and an explanation banner.
- Any direct API attempt by HOD to modify an escalated complaint is rejected with **HTTP 403 Forbidden**.

### 4. Admin "Reset Demo Data" Feature
- On the Admin Dashboard (`/admin/dashboard`), an **Admin-only "Reset Demo Data"** button with a confirmation dialog re-runs `seedDatabase()` on demand.
- Re-seeds all tables and resets `sqlite_sequence` auto-increment counters, restoring the exact initial state so the escalation demo can be repeated repeatedly during the exhibition.

---

## 📊 Phase 4: Role-Based Analytics & BI Dashboards (Recharts)

Edusphere provides centralized business intelligence across institutional grievances and academic attendance:

### 1. Key Performance Indicators (Top Strip)
- **Total Complaints Registered**: Aggregate volume across the institution (Admin) or department (HOD).
- **Resolved Percentage**: Percentage of registered grievances brought to resolution.
- **Average Resolution Time**: Continuous duration in days or hours from submission to resolution.
- **Escalation Rate**: Proportion of complaints exceeding the 3-day SLA threshold.

### 2. Interactive Recharts Visualizations
- **Status Donut Chart**: Proportional breakdown of complaints (`Submitted` `#3b82f6`, `Under Review` `#f59e0b`, `In Progress` `#6366f1`, `Resolved` `#10b981`) with central total display and tooltips.
- **Category Bar Chart**: Grievance volume categorized by operational domain (`academic`, `faculty`, `infrastructure`, `library`, `hostel`, `canteen`, `other`).
- **14-Day Grievance Trend Curve**: Continuous area chart with linear gradient fill and zero-filled empty calendar days.
- **Academic Attendance Bar Chart**: Average course attendance comparison featuring a 75% minimum academic requirement reference line, and a Department vs. Course toggle for Admin.
- **Admin Stacked Status Bar Chart**: Multi-segment comparison across CSE, ECE, and Central Administration showing volume across lifecycle stages.

### 3. Real-Time Engine & Data Safeguards
- **First-load Animation**: Smooth entrance animations play once on initial mount (`isAnimationActive`); subsequent auto-refreshes update data smoothly without replaying the animation.
- **Smart 30s Auto-Refresh**: Pauses the countdown automatically when the browser tab is hidden (`document.hidden`).
- **Aggregate CSV Reporting**: One-click download of timestamped institutional analytics (`edusphere-analytics-YYYY-MM-DD.csv`). Strictly aggregate data with zero submitter identity or PII.
- **Admin Dashboard Snapshot**: Compact preview of the Status Donut and Trend curve directly on the Admin home page.

---

## 📡 Complete System API Reference

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Authenticate user and receive JWT session token |
| `GET` | `/api/dashboard/summary` | Authenticated | Role-specific dashboard metrics and bullet notices |
| `POST` | `/api/complaints` | `student` | Submit new grievance with automated routing |
| `GET` | `/api/complaints/mine` | `student` | View student's own grievances |
| `GET` | `/api/complaints/:ticket_no` | Authenticated | View grievance details & masked timeline |
| `GET` | `/api/complaints/assigned` | `hod`, `admin` | Department or institutional grievance queue |
| `GET` | `/api/complaints/manage/:ticket_no` | `hod`, `admin` | Detailed view with escalation & read-only status |
| `PATCH` | `/api/complaints/manage/:ticket_no/status` | `hod`, `admin` | Forward-only lifecycle update with audit remark |
| `POST` | `/api/complaints/escalation/run` | `admin` | Trigger on-demand 3-day SLA escalation check |
| `POST` | `/api/admin/reset-demo` | `admin` | Reset database to pristine state for live demos |
| `GET` | `/api/analytics/complaints` | `hod`, `admin` | Comprehensive grievance metrics and chart datasets |
| `GET` | `/api/analytics/attendance` | `hod`, `admin` | Course and department attendance percentages |
| `GET` | `/api/attendance/courses` | `faculty` | List courses taught by the authenticated faculty |
| `GET` | `/api/attendance/sheet` | `faculty` | Get attendance sheet for course & date (enforces faculty course ownership) |
| `POST` | `/api/attendance/mark` | `faculty` | Transactional upsert of student attendance (no future dates allowed) |
| `GET` | `/api/attendance/mine` | `student` | Student personal attendance (overall %, course %, recent sessions) |
| `GET` | `/api/attendance/department` | `hod` | Department-wide attendance statistics and at-risk (<75%) students |
| `GET` | `/api/marks/sheet` | `faculty` | Gradebook entry sheet for course & exam type (internal_1, internal_2, assignment, final) |
| `POST` | `/api/marks/save` | `faculty` | Transactional upsert of student marks (0 <= score <= max_score) |
| `GET` | `/api/marks/mine` | `student` | Student gradebook (evaluated courses, marks, GPA summary) |
| `GET` | `/api/marks/department` | `hod` | Department academic course stats (average, highest, lowest marks) |
| `GET` | `/api/notices` | Authenticated | Notices feed (Admin sees ALL; non-admin sees audience-targeted notices) |
| `POST` | `/api/notices` | `faculty`, `hod`, `admin` | Broadcast official notice with strict role-based targeting |
| `DELETE` | `/api/notices/:id` | `faculty`, `hod`, `admin` | Delete notice (allowed for notice author or admin) |
| `GET` | `/api/admin/users` | `admin` | Institutional directory with role/department filtering (never exposes hashes) |
| `POST` | `/api/admin/students` | `admin` | Register new student (auto-enrolls in department courses; default `Student@123`) |

---

## 🎪 Step-by-Step Exhibition Demo Script

### Part 1: Complaint Management & SLA Escalation
1. **Log in as Student (`student1@edusphere.edu` / `Student@123`)**:
   - Go to **"New Complaint"**. Notice the category selector shows live routing info (e.g. *Academic → HOD*, *Infrastructure → Admin*).
   - Toggle **"Submit Anonymously"** and submit a test ticket.
   - Go to **"My Complaints"** to view the timeline and milestone progress tracker.

2. **Log in as HOD CSE (`hod.cse@edusphere.edu` / `Hod@123`)**:
   - On the HOD Dashboard, see the **"Department Grievance Queue"** section showing real ticket counts.
   - Click **"Manage Department Complaints"** (`/hod/complaints`).
   - Notice `CMP-0003` (4 days old) is currently assigned to HOD CSE and is **un-escalated**.
   - Notice `CMP-0005` (Anonymous Faculty complaint) shows student identity masked as **"Anonymous"**.

3. **Log in as Admin (`admin@edusphere.edu` / `Admin@123`)**:
   - On the Admin Dashboard (`/admin/dashboard`), view the live **Complaint Governance KPI strip**.
   - Go to **"All Complaints"** (`/admin/complaints`).
   - Click the **"Run Escalation Check"** button with the lightning bolt.
   - Watch the toast notification confirm: **"SLA check completed: 2 overdue complaints were successfully escalated."**
   - In the complaints list, `CMP-0003` has now been reassigned to **Admin** and flagged with the red **"Escalated (>3d)"** badge.
   - Click on `CMP-0003`. See the timeline entry added by the system: *"Auto-escalated to Central Administration due to exceeding 3-day resolution SLA."*
   - Advance its status from `in_progress` to `resolved` with the remark: *"Dean Academic approved revised timetable grid."*

4. **Log back in as HOD CSE**:
   - Go to **"Department Complaints"**.
   - `CMP-0003` is **still in the HOD's list**, now marked with the amber badge: **"Escalated to Admin"**.
   - Click on `CMP-0003`. Note the read-only alert banner: *"This complaint has been escalated to Central Administration and is in read-only mode for HOD."*
   - Notice the status update panel is hidden, ensuring clear governance boundaries.

### Part 2: Academic Management (Attendance & Marks Live Demo)
1. **Log in as Faculty (`faculty.sharma@edusphere.edu` / `Faculty@123`)**:
   - Click **"Attendance"** in the sidebar (`/faculty/attendance`).
   - Notice that for today's date, all student attendance statuses are unrecorded (empty status).
   - Click **"Mark All Present"** or toggle specific students to **Present**, **Late**, or **Absent**.
   - Click **"Save Attendance"**. Notice the instant confirmation toast.
   - Click **"Marks"** in the sidebar (`/faculty/marks`).
   - Select Course: `CSE-201: Data Structures & Algorithms`, and Exam Type: **`Final Exam`**.
   - Notice that the final exam marks are completely blank and ready for evaluation.
   - Enter scores (e.g., `85`, `92`, `78`) and click **"Save Gradebook"**.
   - Switch to **`Internal 1`** to see pre-seeded comparison marks.

2. **Log in as Student (`student1@edusphere.edu` / `Student@123`)**:
   - Navigate to **"My Attendance"** (`/student/attendance`).
   - View the overall circular progress gauge (with 75% mandatory threshold indicator), per-course breakdown, and the attendance session just marked by faculty.
   - Navigate to **"My Marks"** (`/student/marks`).
   - View overall average GPA card, course grade cards, and the newly entered **Final Exam** score.

3. **Log in as Admin (`admin@edusphere.edu` / `Admin@123`)**:
   - Go to **"Notices"** (`/notices`). Notice Admin sees **ALL notices** across all departments and audiences without any restriction, allowing full management.
   - Go to **"Directory"** (`/admin/users`). View the institutional roster with search and department filtering (passwords are safely concealed).
   - Click **"Add Student"**, enter details, and create an account. The student is instantly enrolled in their department's courses with default password `Student@123`.

### Part 3: Submission Integrity Check (Phase 8 Offline Live Demo)
1. **Log in as Faculty (`faculty.sharma@edusphere.edu` / `Faculty@123`)**:
   - Go to **"Assignments"** (`/faculty/assignments`).
   - For `Assignment 1: Implementation of Red-Black Trees in C++`, click **"View Submissions"**.
   - Notice the **5 pre-seeded submissions** representing distinct academic integrity scenarios:
     - **Aarav Mehta**: High similarity (~85%) matching Diya Sen (graded 94/100, on time).
     - **Diya Sen**: High similarity (~85%) matching Aarav Mehta (submitted late).
     - **Rohan Joshi**: Medium similarity (~34%) matching Diya Sen.
     - **Ishita Roy**: Low similarity (~17%) independently authored.
     - **Kavya Nair**: "Not checkable" (scanned/empty PDF without extractable text).
   - Click the blue **"Run Integrity Check"** button.
   - The system executes offline word 5-gram Jaccard shingles combined with word-frequency cosine similarity and local AI heuristic estimates.
   - See the 5-statistic integrity strip: **Checked**, **High (>60%)**, **Medium (30–59%)**, **Low (<30%)**, and **Not Checkable**.
   - Click **"Compare"** next to Aarav Mehta or Diya Sen to open the side-by-side **Matching Passages Inspection Modal**:
     - View side-by-side matching text highlighted in amber.
     - View advisory notice: *"AI detection is not reliable. Use this only as a hint and review the work yourself."*
     - Choose a teacher review action: **Flagged**, **Needs Discussion**, or **Cleared**, enter a faculty note, and click **"Save Review Decision"**.
   - In the submissions table, toggle **"Show only Medium/High"** to instantly filter candidates needing attention.

2. **Log in as Admin (`admin@edusphere.edu` / `Admin@123`)**:
   - Navigate to `/api/assignments/1/integrity` or review the audit summary.
   - Admin receives **only aggregated counts** (total submissions, checked, high/medium/low counts) with **zero student names or extracted texts**, protecting student privacy.

3. **Log in as Student (`student1@edusphere.edu` / `Student@123`)**:
   - View `/student/assignments`. Confirm that similarity scores, AI likelihood estimates, and internal peer comparisons are completely hidden from students.

### Part 4: Study Resources Module (Phase 9 Live Demo)
1. **Log in as Student (`student1@edusphere.edu` / `Student@123`)**:
   - On the Student Dashboard (`/student/dashboard`), see the **"New Study Resources"** widget displaying the 3 most recently published materials for enrolled courses with direct access links.
   - Click **"Study Resources"** in the sidebar (`/student/resources`).
   - Notice the pre-seeded materials for enrolled courses (`CSE-201`, `CSE-202`, `CSE-203`):
     - Lecture Notes (e.g., Balanced Search Trees & Red-Black Invariants)
     - Previous Solved Papers (Midterm Exam 2025 Solved Paper)
     - Lecture Slides (Relational Normalization 1NF to BCNF)
     - Reference Material (Interactive SQL Schema & Query Practice Lab)
   - Click **"Download"** on a course file: the file is fetched as an authenticated blob with the token and saved directly to disk. Notice the download count badge increments immediately.
   - Click **"Open Link"** on the reference lab: opens `https://sqlbolt.com/` in a new tab with `target="_blank"` and `rel="noopener noreferrer"`.
   - Use the search bar or category pills (Notes, Slides, Papers, Reference, Other) to filter instantly.

2. **Log in as Faculty (`faculty.sharma@edusphere.edu` / `Faculty@123`)**:
   - Click **"Study Resources"** in the sidebar (`/faculty/resources`).
   - View uploaded resources for assigned courses (`CSE-201`, `CSE-203`) with student download counters.
   - Click **"Upload New Resource"**:
     - Select an assigned course, enter a title, choose a category (`notes`, `slides`, `previous_paper`, `reference`, `other`), and upload a file (up to 20MB) or provide an external URL (`http://` or `https://`).
     - Submit the form and see the newly published resource appear immediately.
   - Click the red trash icon on a resource to delete it with a confirm dialog: both the record and the physical file are removed cleanly.

### Part 5: Academic Timetable Module (Phase 10 Live Demo)
1. **Log in as Student (`student1@edusphere.edu` / `Student@123`)**:
   - On the Student Dashboard (`/student/dashboard`), see the **"Today's Classes"** card showing the daily schedule with room numbers and timings:
     - The upcoming or ongoing class is marked with a clean, solid **"NEXT"** highlight (no pulsing animations).
     - If all classes for the day have finished, it displays *"No more classes today"* along with the next working day's upcoming schedule.
   - Click **"Timetable"** in the sidebar or *"View Full Timetable"* on the card (`/student/timetable`).
   - View the weekly schedule rendered with **minute-accurate vertical positioning** (80px per hour; e.g., 11:15–13:15 labs and 11:30–12:30 lectures render at their exact minute offsets).
   - On mobile screens, use the responsive day pills (Mon–Sat) with active "Today" indicator.
   - Click **"Print Schedule"**: prints a clean, high-contrast black-and-white grid formatted to fit on a single A4 landscape page, even when dark mode is enabled, with overlapping lanes printed side by side.

2. **Log in as Faculty (`faculty.sharma@edusphere.edu` / `Faculty@123`)**:
   - On the Faculty Dashboard (`/faculty/dashboard`), see the **"Today's Classes"** card highlighting your next lecture or lab session.
   - Click **"Teaching Schedule"** (`/faculty/timetable`) to view your weekly lecture allocation across all assigned courses (`CSE-201`, `CSE-203`).

3. **Log in as HOD CSE (`hod.cse@edusphere.edu` / `Hod@123`)**:
   - Click **"Timetable"** in the sidebar (`/hod/timetable`) to view **Department Timetable** for Computer Science & Engineering (no department dropdown).
   - Notice the prominent primary **"Add Slot"** button in the header next to Print Schedule, always visible even on narrow screens.
   - Click any **empty cell** in the grid: opens the Add Slot form with the clicked day and start time pre-filled (end time defaults to one hour later).
   - Notice the **lane layout** for overlapping classes: slots on the same day that overlap in time divide the column width equally and render side by side.
   - Tap or hover any slot card: opens a viewport-clamped **details popover** showing the full course title, faculty, timings, and room. In narrow lanes, Edit and Delete buttons are located cleanly inside this popover so they never cover text.
   - Test the **3-Tier Conflict Detection Engine**:
     - **Faculty Clash Test**: Try to schedule Prof. Vikram Sharma on Monday from 09:30 to 10:30 in room `LH-201`. The backend detects the conflict with existing slot `09:00 - 10:00` and displays a prominent inline error banner: *"Faculty clash: Prof. Vikram Sharma is already scheduled to teach CSE-201 in LH-101 from 09:00 to 10:00 on Monday."*
     - **Room Clash Test**: Try to book room `LH-101` (case-insensitive) on Monday from 09:30 to 10:30. The backend rejects with: *"Room clash: Room LH-101 is already booked for CSE-201 (lecture) from 09:00 to 10:00 on Monday."*
     - **Student Batch Clash Test**: Try to schedule another CSE Semester 3 course (`CSE-202`) on Monday from 09:15 to 10:15 in a different room (`LH-102`). The backend rejects with: *"Batch clash: CSE Semester 3 students already have CSE-201 scheduled from 09:00 to 10:00 on Monday."*
     - **Touching Slots (Allowed)**: Try scheduling a slot starting exactly at 10:00 in `LH-101` when another slot ends at 10:00. The engine recognizes touching boundaries as completely valid and allows scheduling with zero conflict.
   - Notice HODs manage the timetable exclusively for courses within their own department (strictly enforced with 403 on POST, PUT, DELETE, and GET /department).

4. **Optional Demo Preview Clock (`DEMO_NOW`)**:
   - In `server/.env`, the optional `DEMO_NOW=` variable allows setting an arbitrary ISO timestamp (e.g. `DEMO_NOW=2026-10-19T09:30:00`) so evaluators can inspect `/today` and live "Next" class states at any hour of the day or night. It is empty by default and used exclusively by the `/today` endpoint.

5. **Reset Anytime**:
   - On the Admin Dashboard, click **"Reset Demo Data"** to restore pristine seed records at any time. The reset re-seeds the exact conflict-free 25-slot weekly schedule and confirms that `runEscalationCheck()` escalates exactly 2 complaints (`CMP-0001` and `CMP-0003`).

### Part 6: Institutional Admin Management (Phase 12A Live Demo)
1. **Log in as Administrator (`admin@edusphere.edu` / `Admin@123`)**:
   - Notice the new navigation items in the sidebar: **"Departments"**, **"Courses"**, and **"Rooms"**.
   - **Departments Management (`/admin/departments`)**:
     - View all departments with counts of students, faculty, courses, and designated HOD.
     - When a department lacks an HOD, an *"Unassigned"* badge is shown with a **"+ Create HOD"** button.
     - Create HOD account modal enforces one HOD per department, with default password `Hod@123`.
     - Deleting a department checks references: refuses with exact counts if users, courses, notices, or complaints still reference the department.
   - **Courses Management (`/admin/courses`)**:
     - Filter courses dynamically by Department and Semester.
     - Add Course modal includes: Code, Name, Department, Semester, Credits, Course Type (`theory`, `lab`, `both`), Weekly Lectures, Lab Hours/Week, and Assigned Faculty (strictly filtered to chosen department).
     - *"Enroll current students of this department"* checkbox defaults to OFF and dynamically displays the active student count that will be enrolled before saving.
     - Course faculty reassignment: if the course has timetable slots, the backend conflict engine runs against the new faculty's schedule on every slot; refuses with a conflict description if any clash occurs.
     - Course delete checks `attendance`, `attendance_sessions`, `marks`, `assignments`, `resources`, and `timetable_slots`.
   - **Rooms & Facilities Management (`/admin/rooms`)**:
     - View lecture halls and laboratories with seating/workstation capacity and scheduled timetable slot counts.
     - **Room Rename Sync**: When a room is renamed, all matching `timetable_slots.room` text entries update synchronously in the same database transaction.
     - **Room Type Change Safeguard**: Changing a room's type (e.g. lecture to lab) is refused with a clear error message if existing timetable slots would become invalid.
   - **Dynamic Architecture**:
     - All departmental dropdowns, dashboards, notices, and analytics legends are completely dynamic.
     - Timetable grid features a stable 10-color palette derived from `course_id`.
   - **Pristine Reset Validation**:
     - Reset Demo Data deletes every table in exact foreign key order (`attendance_checkins` down to `rooms`), deletes uploaded files, runs `PRAGMA foreign_key_check` (confirming zero violations), keeps today's attendance blank, restores the seeded timetable untouched, and escalates exactly 2 complaints (`CMP-0001` and `CMP-0003`).

### Part 7: Automatic Timetable Generation for HOD (Phase 12B Live Demo)
1. **Log in as HOD (`hod.cse@edusphere.edu` / `Hod@123`)**:
   - Navigate to **"Timetable"** (`/hod/timetable`).
   - Notice the prominent **"Auto-Generate"** button in the header right next to "Add Slot" with a sparkles icon.
   - Click **"Auto-Generate"** to open the modal:
     - **Target Semesters**: Select target semesters (e.g. Semesters 3 & 4 for CSE).
     - **Working Days**: Choose active days (Monday–Friday default, Saturday toggleable).
     - **Configurable Break Window**: Strict break hours (default `13:15` to `14:00`) that no class may overlap.
     - **Daily Faculty Teaching Cap**: Max daily hours per faculty member (default 4 hours).
     - **Replace Existing Slots**: Toggle with clear warning indicating exact count of existing slots to be replaced.
   - Click **"Generate Preview"**:
     - Runs the plain deterministic backtracking algorithm (`server/src/services/timetableGenerator.js`) within strict 3-second / 5,000-attempt limits.
     - 100% offline, zero AI, zero API, zero new packages.
     - Evaluates 5-tier constraints: faculty overlap, room overlap & matching room types (`lecture` in lecture halls, `lab` in laboratories), batch (department + semester) overlap, maximum 1 lecture per day per course (labs excluded), and faculty daily teaching cap.
     - Odd lab hours are scheduled faithfully as 120-minute sessions plus a 60-minute odd remainder session (zero lost hours).
   - **Interactive Preview & Diagnostics**:
     - View placement stats (e.g. *"16 of 16 sessions placed (100%)"*).
     - Read-only weekly grid preview displaying proposed slots with distinct dashed borders and `NEW` badges alongside preserved existing slots.
     - Any unplaced sessions are listed with course code, faculty name, session type, duration, and human-readable diagnostic reasons (including infeasible configurations such as 5 lectures across 4 days).
     - **"Regenerate"**: Explores alternative conflict-free arrangements with a new deterministic seed.
     - **"Apply Timetable"**: Prompts with confirmation dialog repeating deleted slot count or partial unplaced notices.
   - **Atomic Transaction & Server-Side Verification**:
     - Persists all slots in a single SQLite transaction with full server-side re-validation against the 3-tier conflict engine.
     - Replaces only the HOD's own department and chosen semesters; other departments are never touched.

### Running Built-In Test Suite
Edusphere includes an automated offline test suite powered by Node.js's built-in `node:test` runner (zero external testing packages required).
Tests do not run at server start. To execute the test suite:
```bash
# In server directory:
node --test-concurrency=1 --test src/**/*.test.js
```




 