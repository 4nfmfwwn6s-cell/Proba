/**
 * Appends a newly finalized speech-recognition segment onto the transcript
 * accumulated so far, trimming and spacing correctly. Used to concatenate
 * segments across transparent recognizer restarts into one utterance.
 */
export function appendTranscriptSegment(existing: string, segment: string): string {
  const trimmedSegment = segment.trim();
  const trimmedExisting = existing.trim();

  if (!trimmedSegment) return trimmedExisting;
  if (!trimmedExisting) return trimmedSegment;

  return `${trimmedExisting} ${trimmedSegment}`;
}
