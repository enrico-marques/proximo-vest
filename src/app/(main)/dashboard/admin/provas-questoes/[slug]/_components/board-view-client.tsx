type Board = { name: string };

export function BoardViewClient({ board }: { board: Board }) {
  return <h1 className="text-2xl font-bold">Vestibular: {board.name}</h1>;
}
