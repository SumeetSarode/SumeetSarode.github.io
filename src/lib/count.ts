/** "Four papers", "One paper". Words up to ten, digits after that, as in most style guides. */
const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

export function countPhrase(count: number, singular: string, plural = `${singular}s`): string {
  return `${WORDS[count] ?? count} ${count === 1 ? singular : plural}`;
}
