import { anonymizeText, deanonymizeObject, anonymizeStructuredData } from "../lib/anonymizer";

export async function analyzeGrammarAndMissingInfo(structuredData: any) {
  const { maskedData, mappings } = anonymizeStructuredData(structuredData);

  const response = await fetch("/api/analyze-grammar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ structuredData: maskedData }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Falha na revisão gramatical pelo backend Python.");
  }

  const jsonResult = await response.json();
  return deanonymizeObject(jsonResult, mappings);
}

export async function analyzeResume(rawText: string) {
  const { maskedText, mappings } = anonymizeText(rawText);

  const response = await fetch("/api/analyze-resume", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rawText: maskedText }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Falha na análise de currículo pelo backend Python.");
  }

  const jsonResult = await response.json();
  return deanonymizeObject(jsonResult, mappings);
}

