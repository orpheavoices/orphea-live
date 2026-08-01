import Header from "@/components/Header";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-12 w-full max-w-xl text-center">

        <Header />

        <p className="text-slate-700 text-xl font-semibold mb-2">
          Rechercher une chanson
        </p>

        <p className="text-slate-600 mb-8">
          ou utiliser les filtres
        </p>

        <Link href="/recherche">
          <button className="bg-red-600 hover:bg-red-700 transition-colors duration-300 text-white font-bold px-10 py-4 rounded-xl text-lg shadow-lg">
            Trouver une chanson
          </button>
        </Link>

        <p className="mt-10 text-slate-500">
          ou
        </p>

        <Link
          href="/recherche"
          className="mt-5 inline-block text-slate-700 underline hover:text-red-600 transition-colors duration-300"
        >
          Explorer tout le répertoire
        </Link>

      </div>
    </main>
  );
}