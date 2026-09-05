import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#080808] text-white">

      {/* CADRE OR */}
      <div className="min-h-screen border border-[#c9a227]">

        {/* LOGO */}
        <header className="bg-black border-b border-[#c9a227]/40">
          <div className="flex justify-center px-5 py-8 md:py-10">

            <img
              src="/images/orphea-logo.png"
              alt="Orphea Live"
              className="w-auto h-44 md:h-56 object-contain"
            />

          </div>
        </header>

        {/* CONTENU */}
        <div className="max-w-3xl mx-auto px-6 py-12 md:py-20">

          {/* INTRODUCTION */}
          <div className="text-center">

            <p className="text-[#d4af37] uppercase tracking-[0.35em] text-sm md:text-base mb-5">
              Orphea Live
            </p>

            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
              Choisissez votre chanson
            </h1>

            {/* FILETS + NOTE */}
            <div className="flex justify-center items-center gap-5 mt-6">

              <span className="h-px w-16 md:w-24 bg-[#d4af37]" />

              <span className="text-[#d4af37] text-2xl">
                ♪
              </span>

              <span className="h-px w-16 md:w-24 bg-[#d4af37]" />

            </div>

            <p className="text-gray-300 text-lg md:text-xl mt-8 max-w-xl mx-auto leading-relaxed">
              C'est vous qui faites le spectacle !
            </p>

          </div>

          {/* BOUTON PRINCIPAL */}
          <div className="flex justify-center mt-12">

            <Link
              href="/recherche"
              className="w-full max-w-md flex items-center justify-center gap-3 bg-[#d4af37] hover:bg-[#f0d36b] text-black font-bold text-xl md:text-2xl px-8 py-5 rounded-2xl shadow-2xl transition transform hover:scale-[1.02]"
            >
              <span>🎤</span>
              <span>CHOISIR MA CHANSON</span>
            </Link>

          </div>

          {/* PETITE INFO */}
          <div className="mt-12 text-center">

            <div className="inline-block bg-[#111111] border border-[#333] rounded-2xl px-6 py-5">

              <p className="text-gray-300 text-sm md:text-base">
                ❤️ Toutes vos demandes sont gratuites
              </p>

              <p className="text-gray-500 text-sm mt-2">
                Choisissez votre chanson et envoyez-moi votre demande.
              </p>

            </div>

          </div>

          {/* FOOTER */}
          <footer className="text-center mt-16">

            <div className="flex justify-center items-center gap-4 mb-5">

              <span className="h-px w-14 bg-[#c9a227]" />

              <span className="text-[#d4af37] text-xl">
                ♪
              </span>

              <span className="h-px w-14 bg-[#c9a227]" />

            </div>

            <p className="text-[#d4af37] text-sm tracking-[0.25em] uppercase">
              Orphea Live
            </p>

          </footer>

        </div>
      </div>
    </main>
  );
}