import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import app from "./app";
import { connectDB } from "./config/db";
import { initSocket } from "./services/socket.service";
import axios from "axios";

dotenv.config();

const PORT = process.env.PORT || 8080;
const MONGO_URI = process.env.MONGO_URI as string;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI not found in .env");
  process.exit(1);
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ["GET", "POST"],
  },
});

initSocket(io);

connectDB(MONGO_URI).then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});

////////////////


app.get("/api/nominatim/search", async (req, res) => {
  const { q } = req.query;

  // 1️⃣ Validate query
  if (!q) {
    return res.status(400).json({ error: "Missing query parameter 'q'" });
  }

  try {
    // 2️⃣ Call Nominatim safely
    const response = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        format: "json",
        addressdetails: 1,
        limit: 6,
        q,
      },
      headers: {
        "User-Agent": "CommuteDeliveryApp/1.0 (rajcompany1kl@gmail.com)", // required
        "Accept-Language": "en",
      },
      timeout: 10000, // safety timeout
      validateStatus: (status) => status >= 200 && status < 500, // don't throw for 404/429
    });

    // 3️⃣ Handle rate limit or bad responses
    if (response.status !== 200) {
      console.error("Nominatim error:", response.status, response.data);
      return res.status(response.status).json({
        error: `Nominatim returned ${response.status}`,
        details: response.data,
      });
    }

    // 4️⃣ Send data back
    res.json(response.data);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error("Nominatim proxy failed:", errorMessage);
    res.status(500).json({
      error: "Failed to fetch from Nominatim",
      message: errorMessage,
    });
  }
});

app.get("/api/nominatim/reverse", async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: "Missing latitude or longitude" });
  }

  try {
    const response = await axios.get("https://nominatim.openstreetmap.org/reverse", {
      params: { format: "json", lat, lon },
      headers: {
        "User-Agent": "CommuteDeliveryApp/1.0 (rajcompany1kl@gmail.com)",
      },
      timeout: 10000,
      validateStatus: (status) => status >= 200 && status < 500,
    });

    if (response.status !== 200) {
      console.error("Reverse lookup error:", response.status, response.data);
      return res.status(response.status).json({
        error: `Nominatim returned ${response.status}`,
        details: response.data,
      });
    }

    res.json(response.data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error("Reverse proxy failed:", errorMessage);
    res.status(500).json({
      error: "Failed to fetch from Nominatim",
      message: errorMessage,
    });
  }
});

