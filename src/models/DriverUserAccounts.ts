import mongoose, { Schema, Document } from 'mongoose';

export const DriverRideStatus = {
    AVAILABLE: 'AVAILABLE',
    NOT_AVAILABLE: 'NOT_AVAILABLE'
} as const;

export type DriverRideStatus = typeof DriverRideStatus[keyof typeof DriverRideStatus];

export interface Location {
    lat: number;
    lng: number;
}

export interface IDriverUser extends Document {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: number;
    password: string;
    status: DriverRideStatus;
    currentLoc: Location;
}

const DriverUserSchema: Schema<IDriverUser> = new Schema(
    {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        phone: { type: Number, required: true, unique: true },
        password: { type: String, required: true },
        status: {
            type: String,
            enum: Object.values(DriverRideStatus),
            default: DriverRideStatus.AVAILABLE
        },
        currentLoc: {
            lat: { type: Number, default: 0.0 },
            lng: { type: Number, default: 0.0 }
        }
    },
    { timestamps: true }
);

export default mongoose.model<IDriverUser>('DriverUser', DriverUserSchema);