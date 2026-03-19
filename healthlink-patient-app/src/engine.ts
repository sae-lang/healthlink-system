import rules from './rules.json';

export interface DiagnosticResult {
  condition: string;
  recommendation: string;
  triageLevel: 'emergency' | 'urgent' | 'routine' | 'self-care';
}

export function runRules(selectedSymptoms: string[]): DiagnosticResult {
  // Simple rule engine: find the rule where all required symptoms are present in the selected list
  // We prioritize rules with more symptoms for better specificity
  const sortedRules = [...rules].sort((a, b) => b.symptoms.length - a.symptoms.length);

  for (const rule of sortedRules) {
    const hasAllSymptoms = rule.symptoms.every((s) => selectedSymptoms.includes(s));
    if (hasAllSymptoms) {
      return {
        condition: rule.condition,
        recommendation: rule.recommendation,
        triageLevel: rule.triageLevel as any,
      };
    }
  }

  // Default if no specific rule matches
  return {
    condition: "Unknown",
    recommendation: "Your symptoms do not match a specific common condition in our database. Please monitor your health and consult a professional if you feel worse.",
    triageLevel: "routine",
  };
}
