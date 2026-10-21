type Phase = { phaseNumber: number };

export function BoardViewClient({ board }: { board: Phase }) {
  return <h1 className="text-2xl font-bold">Fase: {board.phaseNumber}</h1>;
}
