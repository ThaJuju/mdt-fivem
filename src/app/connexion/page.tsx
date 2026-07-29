import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Activity, Database, LockKeyhole, Radio, ShieldCheck } from "lucide-react";
import { getActor } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Connexion — MDT",
};

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const depuis = typeof params.depuis === "string" ? params.depuis : undefined;
  const actor = await getActor();
  if (actor) {
    redirect(actor.mustChangePassword ? "/changer-mot-de-passe" : "/");
  }

  return (
    <main className="relative flex min-h-screen flex-1 overflow-hidden">
      <div className="console-grid absolute inset-0 opacity-55" aria-hidden />
      <div className="scanlines pointer-events-none absolute inset-0 z-20 opacity-20" aria-hidden />
      <div
        className="pointer-events-none absolute -top-56 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-department/12 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl items-stretch lg:grid-cols-[1.15fr_0.85fr]">
        <section className="hidden flex-col justify-between px-12 py-14 lg:flex xl:px-20 xl:py-20">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-lg border border-department/30 bg-department/10 text-department shadow-[0_0_32px_color-mix(in_srgb,var(--department-accent)_16%,transparent)]">
              <Radio className="size-5" />
            </span>
            <div>
              <p className="eyebrow">Los Santos Public Safety</p>
              <p className="mt-1 text-sm text-muted-foreground">Réseau opérationnel sécurisé</p>
            </div>
          </div>

          <div className="max-w-xl">
            <div className="mb-5 flex items-center gap-2 font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">
              <span className="status-dot" />
              Système disponible
            </div>
            <h1 className="text-5xl leading-[1.05] font-semibold tracking-[-0.055em] text-balance xl:text-6xl">
              L’information critique,
              <span className="block text-department">au bon moment.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">
              Accédez aux dossiers, coordonnez les unités et gardez une vision claire du terrain
              depuis une interface opérationnelle unifiée.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-3">
              {[
                { icon: ShieldCheck, label: "Accès contrôlé" },
                { icon: Database, label: "Données unifiées" },
                { icon: Activity, label: "Temps réel" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="panel-surface flex flex-col gap-3 rounded-lg p-4">
                  <Icon className="size-4 text-department" />
                  <span className="text-xs font-medium text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="font-mono text-[0.625rem] tracking-[0.14em] text-muted-foreground/65 uppercase">
            Usage strictement réservé au personnel autorisé
          </p>
        </section>

        <section className="flex min-h-screen items-center justify-center p-4 sm:p-8 lg:border-l lg:border-border/60">
          <div className="panel-surface w-full max-w-md rounded-xl p-6 sm:p-9">
            <div className="mb-8">
              <div className="mb-6 flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-lg border border-department/30 bg-department/10 text-department lg:hidden">
                  <Radio className="size-5" />
                </span>
                <span className="eyebrow lg:ml-auto">Terminal MDT / 01</span>
              </div>
              <div className="mb-4 flex size-12 items-center justify-center rounded-lg border border-border bg-background/60 text-department">
                <LockKeyhole className="size-5" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">Identification requise</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Saisissez vos identifiants de service pour ouvrir une session sécurisée.
              </p>
            </div>
            <LoginForm depuis={depuis} />
            <div className="mt-7 flex items-center gap-2 border-t border-border/70 pt-5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 text-department" />
              Session chiffrée et journalisée
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
