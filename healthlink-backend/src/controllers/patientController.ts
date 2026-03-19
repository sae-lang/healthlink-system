import type { Request, Response } from "express";
import { CaseService } from "../services/caseService.js";
import { SymptomAnalysisService } from "../services/symptomAnalysisService.js";

const caseService = new CaseService();
const symptomAnalysisService = new SymptomAnalysisService();

export class PatientController {
  analyzeSymptoms(req: Request, res: Response) {
    res.status(201).json(
      symptomAnalysisService.analyzeAndCreateCase({
        patientId: req.user!.id,
        symptoms: req.body.symptoms,
        customNotes: req.body.customNotes,
        language: req.body.language,
      }),
    );
  }

  listMyCases(req: Request, res: Response) {
    res.json(caseService.listForPatient(req.user!.id));
  }

  getMyCase(req: Request, res: Response) {
    res.json(caseService.getPatientCase(req.user!.id, req.params.id));
  }
}
