import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary/10 to-background py-20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Negocie suas dívidas com <span className="text-primary">facilidade</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Consulte seu CPF e descubra as melhores condições para quitar suas dívidas.
              Processo 100% online, rápido e seguro.
            </p>
            <Button asChild size="lg" className="text-lg px-8">
              <Link href="/consulta">Consultar meu CPF</Link>
            </Button>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              Por que escolher o Negocia Aí?
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">🔒</span>
                    Seguro
                  </CardTitle>
                  <CardDescription>
                    Seus dados estão protegidos com a mais alta tecnologia de segurança.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Utilizamos criptografia de ponta a ponta para garantir a privacidade
                    das suas informações.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">⚡</span>
                    Rápido
                  </CardTitle>
                  <CardDescription>
                    Consulte suas dívidas em segundos e negocie na hora.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Processo 100% digital, sem burocracia. Você pode resolver tudo
                    pelo celular ou computador.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">💰</span>
                    Econômico
                  </CardTitle>
                  <CardDescription>
                    Descontos exclusivos para pagamento à vista ou parcelado.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Negocie diretamente com os credores e obtenha as melhores
                    condições de pagamento.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Pronto para limpar seu nome?
            </h2>
            <p className="text-primary-foreground/90 mb-8 max-w-xl mx-auto">
              Milhares de pessoas já negociaram suas dívidas conosco.
              Comece agora mesmo!
            </p>
            <Button asChild size="lg" variant="secondary" className="text-lg px-8">
              <Link href="/consulta">Começar agora</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
