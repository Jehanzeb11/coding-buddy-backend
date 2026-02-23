const { registerUser, loginUser, getUser } = require('../Controllers/userController');
const authMiddleware = require('../Middleware/authMiddleware');

const router = require('express').Router();

router.post('/register', registerUser)
router.post('/login', loginUser)
router.get('/user', authMiddleware, getUser)

module.exports = router;