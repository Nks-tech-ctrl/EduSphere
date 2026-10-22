const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');

function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const query = `
      SELECT u.id, u.name, u.email, u.password_hash, u.role, u.department_id, u.phone, u.avatar_url,
             d.name as department_name, d.code as department_code
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE LOWER(u.email) = LOWER(?)
    `;

    const user = db.prepare(query).get(email.trim());

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User with this email was not found.'
      });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password. Please verify and try again.'
      });
    }

    // Build payload
    const tokenPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department_id: user.department_id,
      department_name: user.department_name,
      department_code: user.department_code
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    // Clean user object for client
    const { password_hash, ...safeUser } = user;

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('Error in login controller:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while processing login.'
    });
  }
}

function getMe(req, res) {
  try {
    const query = `
      SELECT u.id, u.name, u.email, u.role, u.department_id, u.phone, u.avatar_url, u.created_at,
             d.name as department_name, d.code as department_code
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = ?
    `;

    const user = db.prepare(query).get(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.'
      });
    }

    return res.status(200).json({
      success: true,
      user
    });
  } catch (err) {
    console.error('Error in getMe controller:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile.'
    });
  }
}

function getDemoLogins(req, res) {
  try {
    const adminUser = db.prepare("SELECT name, email, avatar_url FROM users WHERE role = 'admin' LIMIT 1").get();
    const hodUser = db.prepare("SELECT u.name, u.email, u.avatar_url, d.name as dept_name, d.code as dept_code FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE u.role = 'hod' ORDER BY u.id ASC LIMIT 1").get();
    const facultyUser = db.prepare("SELECT u.name, u.email, u.avatar_url, d.name as dept_name, d.code as dept_code FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE u.role = 'faculty' ORDER BY u.id ASC LIMIT 1").get();
    const studentUser = db.prepare("SELECT u.name, u.email, u.avatar_url, d.name as dept_name, d.code as dept_code FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE u.role = 'student' ORDER BY u.id ASC LIMIT 1").get();

    const demoAccounts = [
      {
        role: 'admin',
        roleLabel: 'Central Administrator',
        name: adminUser?.name || 'System Administrator',
        email: adminUser?.email || 'admin@edusphere.edu',
        password: 'Admin@123',
        dept: 'Central Admin',
        badge: 'Admin Access',
        avatar: adminUser?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
      },
      {
        role: 'hod',
        roleLabel: hodUser ? `HOD (${hodUser.dept_code})` : 'Head of Department',
        name: hodUser?.name || 'Dr. Rajesh Gupta',
        email: hodUser?.email || 'hod.cse@edusphere.edu',
        password: 'Hod@123',
        dept: hodUser?.dept_name || 'Academic Department',
        badge: hodUser ? `HOD ${hodUser.dept_code}` : 'HOD',
        avatar: hodUser?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
      },
      {
        role: 'faculty',
        roleLabel: facultyUser ? `Faculty (${facultyUser.dept_code})` : 'Faculty Member',
        name: facultyUser?.name || 'Prof. Vikram Sharma',
        email: facultyUser?.email || 'faculty.sharma@edusphere.edu',
        password: 'Faculty@123',
        dept: facultyUser?.dept_name || 'Academic Department',
        badge: 'Faculty',
        avatar: facultyUser?.avatar_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
      },
      {
        role: 'student',
        roleLabel: studentUser ? `Student (${studentUser.dept_code})` : 'Student',
        name: studentUser?.name || 'Aarav Mehta',
        email: studentUser?.email || 'student1@edusphere.edu',
        password: 'Student@123',
        dept: studentUser?.dept_name || 'Academic Department',
        badge: 'Student',
        avatar: studentUser?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aarav%20Mehta'
      }
    ];

    return res.status(200).json({
      success: true,
      demoAccounts
    });
  } catch (err) {
    console.error('Error fetching demo logins:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch demo logins.' });
  }
}

module.exports = {
  login,
  getMe,
  getDemoLogins
};
