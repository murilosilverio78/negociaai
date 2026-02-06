export function Footer() {
  return (
    <footer className="border-t bg-gray-50 py-8">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Negocia Aí. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
