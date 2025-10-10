import express from 'express';
import { signup, login, logout, getRide, getAvailableDriver, getDriverDelivery } from '../controllers/DriverController';

const router = express.Router();

// Signup route
router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.get('/getride/:trackingId', getRide);
router.get('/availableDrivers',getAvailableDriver);
router.get('/ride/:driverId',getDriverDelivery);

export default router;