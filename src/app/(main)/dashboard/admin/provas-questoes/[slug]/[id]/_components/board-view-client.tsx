type Edition = { editionLabel: string };

export function BoardViewClient({ board }: { board: Edition }) {
  return <h1 className="text-2xl font-bold">Vestibular: {board.editionLabel}</h1>;
}
