export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#071B38] text-white overflow-hidden">
      <section className="relative min-h-screen flex items-center justify-center px-6 py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,#0A4F9A_0%,#071B38_35%,#020817_100%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#D4AF37]/25 to-transparent" />

        <div className="relative z-10 grid max-w-7xl w-full grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-[#D4AF37]/40 px-5 py-2 text-[#D4AF37]">
              Marketplace • IA • SaaS • Services numériques
            </div>

            <h1 className="text-5xl md:text-7xl font-black leading-tight">
              MALILINK <br />
              <span className="text-[#D4AF37]">GLOBAL</span>
            </h1>

            <p className="mt-6 text-xl text-blue-100 max-w-xl">
              Connecter l’Afrique, propulser le monde. Une plateforme moderne pour marketplace, entreprises, services, IA, paiements et gestion digitale.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <a href="/login" className="rounded-xl bg-[#D4AF37] px-8 py-4 font-bold text-[#071B38] shadow-lg hover:bg-[#C9A227]">
                Se connecter
              </a>
              <a href="/marketplace" className="rounded-xl border border-white/20 px-8 py-4 font-bold hover:bg-white/10">
                Ouvrir Marketplace
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl p-8 shadow-2xl">
            <div className="rounded-2xl bg-[#020817]/80 p-6 border border-[#D4AF37]/30">
              <h2 className="text-2xl font-black text-[#D4AF37] mb-6">Tableau de bord MaliLink</h2>

              <div className="grid grid-cols-2 gap-4">
                {[
                  ["Utilisateurs", "12,450"],
                  ["Entreprises", "320"],
                  ["Commandes", "1,850"],
                  ["Revenus", "25,850,000 CFA"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-white/10 p-5">
                    <p className="text-sm text-blue-200">{label}</p>
                    <p className="mt-2 text-2xl font-black">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-xl bg-white/10 p-5">
                <p className="text-blue-200 mb-3">Modules principaux</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <span>✅ Marketplace</span>
                  <span>✅ Entreprises</span>
                  <span>✅ Paiements</span>
                  <span>✅ IA & Services</span>
                  <span>✅ Formations</span>
                  <span>✅ Support</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
