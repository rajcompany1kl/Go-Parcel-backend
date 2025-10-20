
import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminUser extends Document {
  
  firstName: string;
  lastName: string;
  email: string;
  phone: number;
  password: string;
}

const AdminUserSchema: Schema<IAdminUser> = new Schema({
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  email:     { type: String, required: true, unique: true },
  phone:     { type: Number, required: true, unique: true  },
  password:  { type: String, required: true },
}, { timestamps: true });

export default mongoose.model<IAdminUser>('AdminUser', AdminUserSchema);