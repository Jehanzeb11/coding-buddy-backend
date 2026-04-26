const {
  registerUser,
  loginUser,
  getUser,
  updateUser,
} = require('../Controllers/userController');
const authMiddleware = require('../Middleware/authMiddleware');

const router = require('express').Router();

router.post('/register', registerUser)
router.post('/login', loginUser)
router.get('/user', authMiddleware, getUser)
router.patch('/user', authMiddleware, updateUser)

module.exports = router;