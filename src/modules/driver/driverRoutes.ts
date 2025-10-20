import express from 'express';
import {  getRide, getAvailableDriver, getDriverDelivery } from './DriverController';
import { signup, login, logout } from './AuthController';

const router = express.Router();

// Signup route
router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.get('/getride/:trackingId', getRide);
router.get('/availableDrivers',getAvailableDriver);
router.get('/ride/:driverId',getDriverDelivery);

export default router; 