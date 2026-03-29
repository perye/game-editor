let counter = 0;

export function generateId(prefix = 'entity'): string {
  counter++;
  return `${prefix}_${Date.now()}_${counter}`;
}
