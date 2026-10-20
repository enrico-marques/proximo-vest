import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SectionCardsProps = {
  userNumber: number;
};

export function SectionCards({ userNumber }: SectionCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Usuários cadastrados</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{userNumber}</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
