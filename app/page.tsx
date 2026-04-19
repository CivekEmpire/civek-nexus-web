export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold mb-4 text-center">
          CIVEK NEXUS
        </h1>
        <p className="text-xl mb-8 text-center">
          La primera red social que unifica Vida + Negocios + Élite
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-2">🏡 Círculo Vida</h2>
            <p>Familia, amigos, eventos personales</p>
          </div>

          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-2">💼 Círculo Negocios</h2>
            <p>Proyectos, clientes, oportunidades</p>
          </div>

          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-2">👑 Círculo Élite</h2>
            <p>Inversiones, legacy, estrategia</p>
          </div>
        </div>

        <div className="mt-12 text-center text-sm opacity-70">
          <p>CIVEK OS PRIMERO — SIEMPRE</p>
          <p className="mt-2">Sprint 15 — Version 0.1.0</p>
          <p className="mt-1">19 Abril 2026</p>
        </div>
      </div>
    </main>
  );
}
