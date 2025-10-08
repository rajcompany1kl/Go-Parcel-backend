import mongoose, { Schema, Document } from 'mongoose';

export interface Coordinates {
    lat: number;
    lng: number;
}

export interface Leg {
    start_address: string;
    end_address: string;
    start_location: Coordinates;
    end_location: Coordinates;
}

export interface Route {
    legs: Omit<Leg, 'start_address' | 'end_address'>[];
}

export interface IRide extends Document {
    adminId: string;
    driverId: string;
    rideStartAt: number;
    rideEndAt?: number;
    isRideStarted: boolean;
    isRideEnded: boolean;
    date: number;
    distance: string;
    leg?: Leg;
    lastDriverLocation?: Coordinates;
    route?: Route;
}

const RideSchema: Schema<IRide> = new Schema({
    adminId: { type: String, ref: 'AdminUser', required: true },
    driverId: { type: String, ref: 'DriverUser', required: true },
    rideStartAt: { type: Number, required: true },
    rideEndAt: { type: Number },
    isRideStarted: { type: Boolean, default: false },
    isRideEnded: { type: Boolean, default: false },
    date: { type: Number, required: true },
    distance: { type: String, required: true },
    leg: {
        type: {
            start_address: String,
            end_address: String,
            start_location: {
                lat: Number,
                lng: Number,
            },
            end_location: {
                lat: Number,
                lng: Number,
            },
        }
    },
    lastDriverLocation: {
        type: {
            lat: Number,
            lng: Number,
        }
    },
    route: {
        type: {
            legs: [{
                start_location: {
                    lat: Number,
                    lng: Number,
                },
                end_location: {
                    lat: Number,
                    lng: Number,
                },
            }]
        }
    },
}, { timestamps: true });

export default mongoose.model<IRide>('Ride', RideSchema);