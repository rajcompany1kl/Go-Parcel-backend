import { Request, Response } from 'express';
import Ride, { IRide } from '../ride/Rides';

export const assign = async (req: Request, res: Response) => {
    try {
        const {
            adminId,
            driverId,
            rideStartAt,
            rideEndAt,
            isRideStarted,
            isRideEnded,
            date,
            distance,
            leg,
            lastDriverLocation,
            route
        } = req.body;

        const newRide: IRide = new Ride({
            adminId,
            driverId,
            rideStartAt,
            rideEndAt,
            isRideStarted,
            isRideEnded,
            date,
            distance,
            leg,
            lastDriverLocation,
            route
        });

        await newRide.save();

        return res.status(200).json({
            ride: newRide,
            message: 'Ride assigned successfully'
        });

    } catch (error) {
        console.error('Error assigning driver:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

export const getAllRides = async (req: Request, res: Response) => {
    const adminId = req.params.adminId;
    console.log('Fetching rides for adminId:', adminId);
    try {
        const rides: IRide[] = await Ride.find({ adminId: adminId });
        if (!rides || rides.length === 0) {
            return res.status(404).json({ message: 'No rides found for this admin' });
        }

        res.status(200).json({ rides });
    } catch (error) {
        console.error('Error fetching rides:', error);
        res.status(500).json({ message: 'Server error' });
    }
};