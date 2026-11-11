/** A piece of text, flagged when it is a number worth emphasising. */
export interface TextPart {
  text: string;
  metric: boolean;
}

// Money ("~$100M", "$16M") and percentages ("40%", "85%").
const METRIC = /(~?\$\d+(?:\.\d+)?[MBK]?|\d+(?:\.\d+)?%)/g;

/**
 * Splits text into plain and metric parts, keeping every character in order.
 * `split` with a capture group puts each match at an odd index.
 */
export function splitMetrics(text: string): TextPart[] {
  return text
    .split(METRIC)
    .map((part, index) => ({ text: part, metric: index % 2 === 1 }))
    .filter((part) => part.text !== '');
}
