/** Shared mutable timeline state for Dimension 02. */
export type Journey = {
  p: number; rise: number; go: number; rejected: number;
  gate: number; token: number; query: number; fetch: number;
  slow: number; zoom: number;
};
export const createJourney = (): Journey => ({
  p: 0, rise: 0, go: 0, rejected: 0, gate: 0, token: 0,
  query: 0, fetch: 0, slow: 0, zoom: 0,
});
export const resetJourney = (j: Journey) => { Object.assign(j, createJourney()); };
const at = (i: number) => i / 9;
export const MARKS = {
  landed: at(2), gate: at(3), stop: 0.305, bounce: 0.235,
  junction: at(5), archive: at(8), rings: [0.6, 0.675, 0.75] as const,
};
