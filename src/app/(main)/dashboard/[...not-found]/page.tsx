"use client";

export default function DashboardNotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center space-y-2 text-center">
      <h1 className="text-2xl font-semibold">Página não encontrada.</h1>
      <p className="text-muted-foreground">Esta seção não existe ou ainda não está disponível.</p>
    </div>
  );
}
