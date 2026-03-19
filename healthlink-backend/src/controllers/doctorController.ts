import type { Request, Response } from "express";
import { CaseService } from "../services/caseService.js";
import { RuleService } from "../services/ruleService.js";

const caseService = new CaseService();
const ruleService = new RuleService();

export class DoctorController {
  listCases(_req: Request, res: Response) {
    res.json(caseService.listForDoctor());
  }

  getCase(req: Request, res: Response) {
    res.json(caseService.getDoctorCase(req.params.id));
  }

  reviewCase(req: Request, res: Response) {
    res.json(
      caseService.reviewCase({
        caseId: req.body.caseId,
        doctorId: req.user!.id,
        recommendation: req.body.recommendation,
        recommendAppointment: req.body.recommendAppointment,
      }),
    );
  }

  listRules(_req: Request, res: Response) {
    res.json(ruleService.list(true));
  }

  createRule(req: Request, res: Response) {
    res.status(201).json(ruleService.create(req.body));
  }

  updateRule(req: Request, res: Response) {
    res.json(ruleService.update(req.params.id, req.body));
  }

  deleteRule(req: Request, res: Response) {
    res.json(ruleService.remove(req.params.id));
  }
}
