const express = require('express');
const router = express.Router();
const {
  resetDemoData,
  getUsers,
  createStudent,
  createFaculty,
  resetStudentDevice,
  getAdminDepartments,
  createDepartment,
  createDepartmentHod,
  updateDepartment,
  deleteDepartment,
  getAdminCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getAdminRooms,
  createRoom,
  updateRoom,
  deleteRoom
} = require('../controllers/adminController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);
router.use(authorizeRoles('admin'));

// Admin Demo Reset
router.post('/reset-demo', resetDemoData);

// Admin Directory & User Management
router.get('/users', getUsers);
router.post('/students', createStudent);
router.post('/students/:id/reset-device', resetStudentDevice);
router.post('/faculty', createFaculty);

// Admin Departments Management (Phase 12A)
router.get('/departments', getAdminDepartments);
router.post('/departments', createDepartment);
router.post('/departments/:id/hod', createDepartmentHod);
router.put('/departments/:id', updateDepartment);
router.delete('/departments/:id', deleteDepartment);

// Admin Courses Management (Phase 12A)
router.get('/courses', getAdminCourses);
router.post('/courses', createCourse);
router.put('/courses/:id', updateCourse);
router.delete('/courses/:id', deleteCourse);

// Admin Rooms Management (Phase 12A)
router.get('/rooms', getAdminRooms);
router.post('/rooms', createRoom);
router.put('/rooms/:id', updateRoom);
router.delete('/rooms/:id', deleteRoom);

module.exports = router;

