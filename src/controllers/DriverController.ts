import { Request, Response } from 'express';
import DriverUserAccount, { DriverRideStatus, IDriverUser } from '../models/DriverUserAccounts';
import Ride from '../models/Rides';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import DriverUserAccounts from '../models/DriverUserAccounts';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Signup controller
export const signup = async (req: Request, res: Response) => {
    try {
        const { firstName, lastName, email, password, phone } = req.body;

        // Check if user already exists
        const existingDriver: IDriverUser | null = await DriverUserAccount.findOne({ email });
        if (existingDriver) {
            return res.status(400).json({ message: 'Driver already exists' });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newDriver: IDriverUser = new DriverUserAccount({
            firstName,
            lastName,
            email,
            phone,
            password: hashedPassword,
        });

        await newDriver.save();

        // Create JWT
        const driverToken = jwt.sign(
            { id: newDriver._id, email: newDriver.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Set cookie (httpOnly for security)
        res.cookie('driverToken', driverToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // true in prod (HTTPS)
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Fetch the full document including defaults
        const savedDriver: IDriverUser | null = await DriverUserAccount.findById(newDriver._id);
        if (!savedDriver) {
            throw new Error("Driver not found after save");
        }

        const driverObj = savedDriver.toObject();

        // Remove password
        const { password: _, ...driverWithoutPassword } = driverObj;
        res.status(201).json({ message: 'Driver registered successfully', driver: driverWithoutPassword });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Login controller
export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // 1. Check if user exists
        const driver: IDriverUser | null = await DriverUserAccount.findOne({ email });
        if (!driver) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // 2. Compare password
        const isMatch = await bcrypt.compare(password, driver.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // 3. Generate JWT
        const driverToken = jwt.sign(
            { id: driver._id, email: driver.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // 4. Set cookie
        res.cookie('driverToken', driverToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        const driverObj = driver.toObject();

        // Remove password
        const { password: _, ...driverWithoutPassword } = driverObj;
        res.status(200).json({ message: 'Login successful', driver: driverWithoutPassword });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Logout controller
export const logout = (req: Request, res: Response) => {
    // Clear the cookie
    res.cookie('driverToken', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        expires: new Date(0) // expire immediately
    });

    res.status(200).json({ message: 'Logged out successfully' });
};

export const getRide = async (req: Request, res: Response) => {
    const trackingId = req.params.trackingId;
    console.log('Fetching rides for trackingId:', trackingId);
    try {
        const ride = await Ride.findById(trackingId);
        if (!ride) {
            return res.status(404).json({ message: 'No rides found for this trackingId' });
        }

        res.status(200).json({ ride });
    } catch (error) {
        console.error('Error fetching rides:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getAvailableDriver = async(req: Request, res: Response) => {
    try {
        const drivers = await DriverUserAccounts.find();
        if(drivers.length > 0 ) {
            res.status(200).json({ data: drivers.filter(driver => driver.status === DriverRideStatus.AVAILABLE)})
        } else {
            res.status(404).json({ message: 'No drivers are available at the moment' })
        }
    } catch (error) {
        console.log("Error fetching drivers")
        res.status(500).json({ message: error });
    }
}