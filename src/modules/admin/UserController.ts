import { Request, Response } from 'express';
import Ride, { IRide } from '../ride/Rides';
import DriverUserAccounts, { DriverRideStatus } from '../driver/DriverUserAccounts';
import moment from 'moment';

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
        await DriverUserAccounts.updateOne(
            { _id: driverId },
            { $set: { status: DriverRideStatus.NOT_AVAILABLE } }
        );
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

export const endDelivery = async (req: Request, res: Response) => {
    const { driverId } = req.body
    console.log('Ending ride for driverId:', driverId);
    try {
        const ride  = await Ride.findOne({ driverId: driverId, isRideEnded: false });
        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }
        ride.isRideEnded = true;
        ride.rideEndAt = moment().valueOf();
        await ride.save();

        // make the driver available again
        const driver = await DriverUserAccounts.findById(ride.driverId);
        if (driver) {
            driver.status = DriverRideStatus.AVAILABLE;
            await driver.save();
        }

        res.status(200).json({ message: 'Ride ended successfully', ride, success: true });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
}