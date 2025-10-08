import express from 'express';
import { signup, login, logout, assign, getAllRides } from '../controllers/UserController';

const router = express.Router();

// Signup route
router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.post('/assign', assign);
router.get('/rides/:adminId', getAllRides);

export default router;