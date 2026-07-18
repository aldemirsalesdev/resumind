let globalAnonymizeId = 0;

export function anonymizeText(text: string): { maskedText: string, mappings: Record<string, string> } {
  let maskedText = text;
  const mappings: Record<string, string> = {};

  const replaceWithMapping = (match: string, type: string) => {
    // Avoid double masking if it's already a placeholder
    if (match.startsWith('{{MASKED_')) return match;
    const placeholder = `{{MASKED_${type}_${globalAnonymizeId++}}}`;
    mappings[placeholder] = match;
    return placeholder;
  };

  // CPF: 000.000.000-00 or 00000000000 (with word boundaries)
  const cpfRegex = /\b(?:\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})\b/g;
  maskedText = maskedText.replace(cpfRegex, (m) => replaceWithMapping(m, 'CPF'));

  // Email
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  maskedText = maskedText.replace(emailRegex, (m) => replaceWithMapping(m, 'EMAIL'));

  // Phone (Brazil formats roughly)
  const phoneRegex = /(?:\+?\d{2,3}[\s-]?)?(?:\(?\d{2}\)?[\s-]?)?(?:9\d{4}|\d{4})[\s-]?\d{4}/g;
  maskedText = maskedText.replace(phoneRegex, (m) => replaceWithMapping(m, 'PHONE'));

  // Address (Basic heuristic: Rua, Av, CEP, etc)
  const addressRegex = /\b(?:Rua|Avenida|Av\.|Travessa|Praça|Rodovia|CEP:?)\s+[A-Za-z0-9\s,.-]+/gi;
  maskedText = maskedText.replace(addressRegex, (m) => replaceWithMapping(m, 'ADDRESS'));

  return { maskedText, mappings };
}

export function deanonymizeText(text: string, mappings: Record<string, string>): string {
  let result = text;
  for (const [placeholder, original] of Object.entries(mappings)) {
    result = result.split(placeholder).join(original);
  }
  return result;
}

export function deanonymizeObject(obj: any, mappings: Record<string, string>): any {
  if (typeof obj === 'string') {
    return deanonymizeText(obj, mappings);
  } else if (Array.isArray(obj)) {
    return obj.map(item => deanonymizeObject(item, mappings));
  } else if (typeof obj === 'object' && obj !== null) {
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = deanonymizeObject(obj[key], mappings);
    }
    return newObj;
  }
  return obj;
}

export function anonymizeStructuredData(data: any): { maskedData: any, mappings: Record<string, string> } {
  const maskedData = JSON.parse(JSON.stringify(data));
  let mappings: Record<string, string> = {};

  const replaceValue = (obj: any, key: string, type: string) => {
    if (obj && obj[key] && typeof obj[key] === 'string' && obj[key].trim() !== '') {
      const placeholder = `{{MASKED_${type}_${globalAnonymizeId++}}}`;
      mappings[placeholder] = obj[key];
      obj[key] = placeholder;
    }
  };

  // Explicitly mask known fields
  if (maskedData.personalInfo) {
    replaceValue(maskedData.personalInfo, 'email', 'EMAIL');
    replaceValue(maskedData.personalInfo, 'phone', 'PHONE');
    replaceValue(maskedData.personalInfo, 'location', 'ADDRESS');
  }

  // Also apply deep text masking
  function traverse(item: any): any {
    if (typeof item === 'string') {
      const { maskedText, mappings: textMappings } = anonymizeText(item);
      mappings = { ...mappings, ...textMappings };
      return maskedText;
    } else if (Array.isArray(item)) {
      return item.map(i => traverse(i));
    } else if (typeof item === 'object' && item !== null) {
      const newObj: any = {};
      for (const key in item) {
        newObj[key] = traverse(item[key]);
      }
      return newObj;
    }
    return item;
  }

  const finalMaskedData = traverse(maskedData);

  return { maskedData: finalMaskedData, mappings };
}
