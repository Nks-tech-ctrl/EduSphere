require('dotenv').config();
const express = require('express');
const cors = require('cors');
const initDb = require('./db/initDb');

const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const adminRoutes = require('./routes/adminRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const marksRoutes = require('./routes/marksRoutes');
const noticeRoutes = require('./routes/noticeRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const timetableRoutes = require('./routes/timetableRoutes');
const liveAttendanceRoutes = require('./routes/liveAttendanceRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const { startEscalationScheduler } = require('./services/escalationService');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend client (localhost, 127.0.0.1, and private LAN origins)
const lanOriginRegex = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || lanOriginRegex.test(origin) || origin === 'null') {
      return callback(null, true);
    }
    return callback(null, true); // Fallback to avoid blocking offline local interfaces
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Initialize SQLite schema if not already present
try {
  initDb();
} catch (err) {
  console.error('[Edusphere Server] Database initialization warning:', err.message);
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/attendance/live', liveAttendanceRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/marks', marksRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/timetable', timetableRoutes);


// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    system: 'Edusphere College Management System API',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(` 🚀 Edusphere Server running on http://0.0.0.0:${PORT}`);
  console.log(` 🏛️  College Management System Backend Active`);
  console.log(`====================================================`);

  // Start SLA escalation scheduler (respects AUTO_ESCALATION env flag)
  startEscalationScheduler();
});
