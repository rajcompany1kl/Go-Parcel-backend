import { Router } from "express";
import adminRoutes from "../modules/admin/userRoutes";
import driverRoutes from "../modules/driver/driverRoutes";
// import rideRoutes from "../modules/ride/ride.routes";
import faqRoutes from "../modules/faq/faqRoutes";

const router = Router();

router.use("/AdminUser", adminRoutes);
router.use("/DriverUser", driverRoutes);
// router.use("/Ride", rideRoutes);
router.use("/api/Faq", faqRoutes);

export default router;
