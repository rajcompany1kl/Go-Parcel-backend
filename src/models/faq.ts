import mongoose, { Schema, Document } from 'mongoose';

export interface IFaq extends Document {
  question: string;
  answer: string;
  tags: string[];
  createdAt: Date;
}

const FaqSchema: Schema<IFaq> = new Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  tags: [String],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IFaq>('Faq', FaqSchema);