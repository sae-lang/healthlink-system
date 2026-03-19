import { RuleRepository, type RuleRecord } from "../repositories/ruleRepository.js";
import { ApiError } from "../utils/apiError.js";

const ruleRepository = new RuleRepository();

const mapRule = (rule: RuleRecord) => ({
  id: rule.id,
  condition: rule.condition_name,
  symptoms: JSON.parse(rule.symptoms_json) as string[],
  recommendation: rule.recommendation,
  triageLevel: rule.triage_level,
  isActive: Boolean(rule.is_active),
  createdAt: rule.created_at,
  updatedAt: rule.updated_at,
});

export class RuleService {
  list(includeInactive = true) {
    return ruleRepository.list(includeInactive).map(mapRule);
  }

  getActiveRules() {
    return ruleRepository.list(false).map(mapRule);
  }

  create(input: {
    condition: string;
    symptoms: string[];
    recommendation: string;
    triageLevel: "self-care" | "routine" | "urgent" | "emergency";
    isActive: boolean;
  }) {
    return mapRule(
      ruleRepository.create({
        conditionName: input.condition,
        symptoms: input.symptoms,
        recommendation: input.recommendation,
        triageLevel: input.triageLevel,
        isActive: input.isActive,
      }),
    );
  }

  update(
    id: string,
    input: Partial<{
      condition: string;
      symptoms: string[];
      recommendation: string;
      triageLevel: "self-care" | "routine" | "urgent" | "emergency";
      isActive: boolean;
    }>,
  ) {
    const updated = ruleRepository.update(id, {
      conditionName: input.condition,
      symptoms: input.symptoms,
      recommendation: input.recommendation,
      triageLevel: input.triageLevel,
      isActive: input.isActive,
    });

    if (!updated) {
      throw new ApiError(404, "Rule not found");
    }

    return mapRule(updated);
  }

  remove(id: string) {
    const updated = ruleRepository.deactivate(id);
    if (!updated) {
      throw new ApiError(404, "Rule not found");
    }
    return { message: "Rule deactivated" };
  }
}
