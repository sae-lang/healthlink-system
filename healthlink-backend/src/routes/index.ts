import { Router } from "express";
import { AppointmentController } from "../controllers/appointmentController.js";
import { AuthController } from "../controllers/authController.js";
import { DoctorController } from "../controllers/doctorController.js";
import { HealthController } from "../controllers/healthController.js";
import { PatientController } from "../controllers/patientController.js";
import { ROLES } from "../constants/enums.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import {
  analyzeSymptomsSchema,
  appointmentSchema,
  loginSchema,
  registerSchema,
  reviewCaseSchema,
  ruleCreateSchema,
  ruleUpdateSchema,
} from "./schemas.js";

const router = Router();
const authController = new AuthController();
const patientController = new PatientController();
const doctorController = new DoctorController();
const appointmentController = new AppointmentController();
const healthController = new HealthController();

router.get("/health", asyncHandler(async (req, res) => healthController.ping(req, res)));
router.post("/auth/register", validate(registerSchema), asyncHandler(async (req, res) => authController.register(req, res)));
router.post("/auth/login", validate(loginSchema), asyncHandler(async (req, res) => authController.login(req, res)));

router.post(
  "/symptoms/analyze",
  authenticate,
  authorize(ROLES.PATIENT),
  validate(analyzeSymptomsSchema),
  asyncHandler(async (req, res) => patientController.analyzeSymptoms(req, res)),
);
router.get(
  "/cases/my",
  authenticate,
  authorize(ROLES.PATIENT),
  asyncHandler(async (req, res) => patientController.listMyCases(req, res)),
);
router.get(
  "/cases/:id",
  authenticate,
  authorize(ROLES.PATIENT),
  asyncHandler(async (req, res) => patientController.getMyCase(req, res)),
);

router.get(
  "/doctor/cases",
  authenticate,
  authorize(ROLES.DOCTOR),
  asyncHandler(async (req, res) => doctorController.listCases(req, res)),
);
router.get(
  "/doctor/cases/:id",
  authenticate,
  authorize(ROLES.DOCTOR),
  asyncHandler(async (req, res) => doctorController.getCase(req, res)),
);
router.post(
  "/doctor/review",
  authenticate,
  authorize(ROLES.DOCTOR),
  validate(reviewCaseSchema),
  asyncHandler(async (req, res) => doctorController.reviewCase(req, res)),
);
router.get(
  "/doctor/rules",
  authenticate,
  authorize(ROLES.DOCTOR),
  asyncHandler(async (req, res) => doctorController.listRules(req, res)),
);
router.post(
  "/doctor/rules",
  authenticate,
  authorize(ROLES.DOCTOR),
  validate(ruleCreateSchema),
  asyncHandler(async (req, res) => doctorController.createRule(req, res)),
);
router.put(
  "/doctor/rules/:id",
  authenticate,
  authorize(ROLES.DOCTOR),
  validate(ruleUpdateSchema),
  asyncHandler(async (req, res) => doctorController.updateRule(req, res)),
);
router.delete(
  "/doctor/rules/:id",
  authenticate,
  authorize(ROLES.DOCTOR),
  asyncHandler(async (req, res) => doctorController.deleteRule(req, res)),
);

router.post(
  "/appointments",
  authenticate,
  validate(appointmentSchema),
  asyncHandler(async (req, res) => appointmentController.create(req, res)),
);
router.get("/appointments", authenticate, asyncHandler(async (req, res) => appointmentController.list(req, res)));

export { router };
