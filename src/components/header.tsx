import Link from "next/link";

export function Header() {
  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-primary">
          Negocia Aí
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/" className="text-sm hover:text-primary transition-colors">
            Início
          </Link>
          <Link href="/consulta" className="text-sm hover:text-primary transition-colors">
            Consultar CPF
          </Link>
        </nav>
      </div>
    </header>
  );
}
