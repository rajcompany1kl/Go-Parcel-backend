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

app.post("/api/send-email", async (req, res) => {
  const { to, subject, text } = req.body;

  if (!to || !subject || !text) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const emailResponse = await resend.emails.send({
      from: "Delivery System <onboarding@resend.dev>", 
      // ✔ MUST be Resend address or your verified domain
      to,
      subject,
      text,
    });

    console.log("📧 Email sent:", emailResponse);

    return res.status(200).json({
      success: true,
      message: "Email sent successfully",
      data: emailResponse,
    });
  } catch (error: any) {
    console.error("❌ Email send failed:", error);

    return res.status(500).json({
      success: false,
      error: error?.message || "Email failed to send",
    });
  }
});
// Register all routes
app.use(routes);

export default app;
