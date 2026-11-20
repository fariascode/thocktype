// Mobile keyboards don't send usable keydown events and may rewrite the composing word
// (e.g. "h" -> "ho" -> "hol"). Turn the change between two input values into key presses.
export function inputDiff(prev: string, next: string): string[] {
  let common = 0
  while (common < prev.length && common < next.length && prev[common] === next[common]) common++
  const backspaces = Array<string>(prev.length - common).fill('Backspace')
  return [...backspaces, ...next.slice(common)]
}
