import type { Request, Response } from "express";
import { AppointmentService } from "../services/appointmentService.js";

const appointmentService = new AppointmentService();

export class AppointmentController {
  create(req: Request, res: Response) {
    res.status(201).json(
      appointmentService.create({
        caseId: req.body.caseId,
        patientId: req.user!.id,
        doctorId: req.body.doctorId,
        date: req.body.date,
      }),
    );
  }

  list(req: Request, res: Response) {
    res.json(appointmentService.list(req.user!));
  }
}
