import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import routes from "./routes/index";

import nodemailer from "nodemailer";

dotenv.config();

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.get("/", (req: Request, res: Response) => {
  res.send("MERN backend is running");
});

// Email route

app.post("/api/send-email", async (req: Request, res: Response) => {
  const { to, subject, text } = req.body;

  try {
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "rajcompany1kl@gmail.com",
        pass: process.env.PASS,
      },
    });

    await transporter.sendMail({
      from: '"Delivery System" <rajcompany1kl@gmail.com>',
      to,
      subject,
      text,
    });

    res.status(200).json({ message: "Email sent" });
  } catch (err) {
    console.error("Email send failed:", err);
    res.status(500).json({ error: "Email failed to send" });
  }
});
// Register all routes
app.use(routes);

export default app;
