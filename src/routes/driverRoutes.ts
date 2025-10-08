import express from 'express';
import { signup, login, logout, getRide } from '../controllers/DriverController';

const router = express.Router();

// Signup route
router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.get('/getride/:trackingId', getRide);

export default router;