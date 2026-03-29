export function hexToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

export function numberToHex(num: number): string {
  return '#' + num.toString(16).padStart(6, '0');
}

const ENTITY_COLORS = [
  '#7c5cfc', '#fc5c7c', '#5cfc7c', '#fca85c',
  '#5cacfc', '#fc5cec', '#5cfcdc', '#fcdc5c',
];

let colorIndex = 0;
export function nextEntityColor(): string {
  const color = ENTITY_COLORS[colorIndex % ENTITY_COLORS.length];
  colorIndex++;
  return color;
}
