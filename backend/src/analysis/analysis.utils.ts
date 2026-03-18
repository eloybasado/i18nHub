export function flattenJsonToMap(value: unknown): Map<string, string> {
  const result = new Map<string, string>();

  walkJson(value, '', result);

  return result;
}

export function extractInterpolationVars(value: string): string[] {
  const matches = value.matchAll(/\{([a-zA-Z0-9_.$-]+)\}/g);
  return Array.from(new Set(Array.from(matches, (match) => match[1]))).sort();
}

export function hasInterpolationMismatch(
  referenceValue: string,
  targetValue: string,
): boolean {
  const referenceVars = extractInterpolationVars(referenceValue);
  const targetVars = extractInterpolationVars(targetValue);

  if (referenceVars.length !== targetVars.length) {
    return true;
  }

  return referenceVars.some((value, index) => value !== targetVars[index]);
}

function walkJson(
  value: unknown,
  currentPath: string,
  output: Map<string, string>,
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const nextPath = currentPath ? `${currentPath}.${index}` : `${index}`;
      walkJson(item, nextPath, output);
    });
    return;
  }

  if (isPlainObject(value)) {
    Object.entries(value).forEach(([key, nestedValue]) => {
      const nextPath = currentPath ? `${currentPath}.${key}` : key;
      walkJson(nestedValue, nextPath, output);
    });
    return;
  }

  if (!currentPath) {
    return;
  }

  output.set(currentPath, primitiveToString(value));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function primitiveToString(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value === null) {
    return 'null';
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }

  return '';
}
