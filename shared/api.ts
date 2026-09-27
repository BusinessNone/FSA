// Wire format for POST /api/place. Kept free of runtime dependencies so the client
// bundle never pulls in zod or anything from the Worker.
export type Answers = Record<string, string>;

export interface PlacementRequest {
  answers: Answers;
}

// The response carries only the cell and a plain-English rationale. No scores.
export interface PlacementResponse {
  cell: string;
  rationale: string;
}

export const cellId = (row: string, column: string) => `${row}__${column}`;
