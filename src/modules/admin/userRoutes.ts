import express from 'express';
import {  assign, endDelivery, getAllRides } from './UserController';
import { signup, login, logout } from './AuthController';

const router = express.Router();

// Signup route
router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.post('/assign', assign);
router.get('/rides/:adminId', getAllRides);
router.post('/endRide',endDelivery)

export default router;