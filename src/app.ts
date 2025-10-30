import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import * as dotenv from "dotenv";
import routes from "./routes/index";
import { Resend } from "resend";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.get("/", (req: Request, res: Response) => {
  res.send("MERN backend is running");
});

// Email route

// initialize resend client
const resend = new Resend(process.env.RESEND_API_KEY);

app.post("/api/send-email", async (req: Request, res: Response) => {
  const { to, subject, text } = req.body;

  try {
    const data = await resend.emails.send({
      from: '"Delivery System" <rajcompany1kl@gmail.com>', // or use your verified domain
      to,
      subject,
      text,
    });

    console.log("Email sent:", data);
    res.status(200).json({ message: "Email sent successfully" });
  } catch (err) {
    console.error("Email send failed:", err);
    res.status(500).json({ error: "Email failed to send" });
  }
});
// Register all routes
app.use(routes);

export default app;
