import { Request, Response } from 'express';
import { DriverRideStatus } from './DriverUserAccounts';
import Ride from '../ride/Rides';
import DriverUserAccounts from './DriverUserAccounts';
import Rides from '../ride/Rides';


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

export const getDriverDelivery = async (req: Request, res: Response) => {
    const driverId = req.params.driverId;
    console.log('Fetching delivery for driverId:', driverId);
    try {
        const delivery = await Rides.findOne({ driverId });
        if (!delivery) {
            return res.status(404).json({ message: 'No delivery found for this driverId' });
        }

        res.status(200).json({ ride: delivery });
    } catch (error) {
        console.error('Error fetching delivery:', error);
        res.status(500).json({ message: 'Server error' });
    }
};