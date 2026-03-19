import { CASE_STATUS, RECOMMENDATION_SOURCE, TRIAGE_LEVELS, type TriageLevel } from "../constants/enums.js";
import { CaseRepository } from "../repositories/caseRepository.js";
import { RecommendationRepository } from "../repositories/recommendationRepository.js";
import { RuleService } from "./ruleService.js";

const ruleService = new RuleService();
const caseRepository = new CaseRepository();
const recommendationRepository = new RecommendationRepository();

interface AnalysisResult {
  condition: string;
  recommendation: string;
  triageLevel: TriageLevel;
  source: "RULE" | "HEURISTIC";
}

const emergencySymptoms = ["shortness of breath", "chest pain", "bluish lips", "severe bleeding"];
const urgentSymptoms = ["persistent cough", "high fever", "swelling", "blurred vision", "dizziness"];

export class SymptomAnalysisService {
  private runRuleAnalysis(symptoms: string[]): AnalysisResult | null {
    const normalized = symptoms.map((symptom) => symptom.trim().toLowerCase());
    const rules = ruleService.getActiveRules().sort((a, b) => b.symptoms.length - a.symptoms.length);

    for (const rule of rules) {
      if (rule.symptoms.every((symptom) => normalized.includes(symptom.toLowerCase()))) {
        return {
          condition: rule.condition,
          recommendation: rule.recommendation,
          triageLevel: rule.triageLevel,
          source: "RULE",
        };
      }
    }

    return null;
  }

  private runHeuristicAnalysis(symptoms: string[], notes?: string): AnalysisResult {
    const normalizedText = [...symptoms, notes ?? ""].join(" ").toLowerCase();

    if (emergencySymptoms.some((term) => normalizedText.includes(term))) {
      return {
        condition: "Critical symptom cluster",
        recommendation: "Seek emergency care immediately.",
        triageLevel: TRIAGE_LEVELS.EMERGENCY,
        source: "HEURISTIC",
      };
    }

    if (urgentSymptoms.some((term) => normalizedText.includes(term))) {
      return {
        condition: "Symptoms require prompt assessment",
        recommendation: "Arrange urgent clinical review within 24 hours.",
        triageLevel: TRIAGE_LEVELS.URGENT,
        source: "HEURISTIC",
      };
    }

    return {
      condition: "General symptom review",
      recommendation: "Monitor symptoms, rest, hydrate, and arrange a routine medical review if symptoms persist.",
      triageLevel: TRIAGE_LEVELS.ROUTINE,
      source: "HEURISTIC",
    };
  }

  analyzeAndCreateCase(input: { patientId: string; symptoms: string[]; customNotes?: string; language?: string }) {
    const analysis = this.runRuleAnalysis(input.symptoms) ?? this.runHeuristicAnalysis(input.symptoms, input.customNotes);
    const isSevere =
      analysis.triageLevel === TRIAGE_LEVELS.URGENT || analysis.triageLevel === TRIAGE_LEVELS.EMERGENCY;

    const createdCase = caseRepository.create({
      userId: input.patientId,
      symptoms: input.customNotes ? [...input.symptoms, `notes:${input.customNotes}`] : input.symptoms,
      triageLevel: analysis.triageLevel,
      aiResult: {
        condition: analysis.condition,
        recommendation: analysis.recommendation,
        triageLevel: analysis.triageLevel,
        language: input.language ?? "en",
        source: analysis.source,
      },
      status: isSevere ? CASE_STATUS.PENDING_REVIEW : CASE_STATUS.AUTO_RESOLVED,
    });

    recommendationRepository.create({
      caseId: createdCase.id,
      source: RECOMMENDATION_SOURCE.SYSTEM,
      content: analysis.recommendation,
    });

    return {
      caseId: createdCase.id,
      status: createdCase.status,
      triageLevel: analysis.triageLevel,
      condition: analysis.condition,
      recommendation: analysis.recommendation,
      shouldBookAppointment: isSevere,
    };
  }
}
