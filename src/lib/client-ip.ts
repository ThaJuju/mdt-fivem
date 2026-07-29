import "server-only";

import { headers } from "next/headers";

/**
 * Résolution de l'adresse du client derrière un reverse proxy.
 *
 * Piège central, et raison d'être de ce module : le snippet nginx que tout le
 * monde copie —
 *
 *     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
 *
 * — **ajoute** l'adresse du pair à la fin de ce que le client a envoyé, il ne
 * la remplace pas. Un client qui envoie `X-Forwarded-For: 1.2.3.4` produit
 * donc `1.2.3.4, <adresse réelle>`. Lire l'entrée de *gauche* revient à lire
 * une valeur choisie par le client — exactement ce qu'on ne veut pas pour une
 * limitation de débit ou une trace d'audit.
 *
 * L'entrée fiable est celle qu'a écrite le dernier proxy de confiance, donc
 * comptée **depuis la droite**. Avec un seul nginx devant, c'est la dernière.
 *
 * `TRUSTED_PROXY_HOPS` (défaut : 1) doit valoir le nombre de proxys qui
 * ajoutent leur entrée devant l'application. nginx seul : 1. Un CDN devant
 * nginx : 2. Se tromper vers le haut fait retomber sur « adresse inconnue »
 * (voir plus bas) ; se tromper vers le bas fait confiance à une valeur
 * forgeable — d'où le défaut prudent de 1.
 */
function trustedHops(): number {
  const raw = Number(process.env.TRUSTED_PROXY_HOPS);
  return Number.isInteger(raw) && raw > 0 ? raw : 1;
}

/**
 * Adresse du client, ou `null` si elle ne peut pas être établie de façon
 * fiable.
 *
 * Retourner `null` plutôt qu'une valeur douteuse est délibéré : si la chaîne
 * de proxys ne correspond pas à `TRUSTED_PROXY_HOPS`, mieux vaut une adresse
 * absente — visible dans le journal d'audit, et qui fait tomber tout le monde
 * dans le même seau de limitation — qu'une adresse fausse à laquelle on
 * accorderait du crédit.
 */
export async function clientIp(): Promise<string | null> {
  const headerList = await headers();

  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const entries = forwarded
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    const index = entries.length - trustedHops();
    if (index >= 0) return entries[index];
    // Moins d'entrées que de proxys déclarés : la configuration ne correspond
    // pas à la réalité, on ne devine pas.
    return null;
  }

  // nginx pose `X-Real-IP: $remote_addr`, qui écrase toujours ce que le client
  // aurait envoyé. Utile quand `X-Forwarded-For` n'est pas transmis du tout.
  const realIp = headerList.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  // Accès direct, sans proxy : rien de fiable à en tirer côté HTTP.
  return null;
}

/** Variante pour les clés de limitation de débit, qui ont besoin d'une chaîne. */
export async function clientIpKey(): Promise<string> {
  return (await clientIp()) ?? "inconnue";
}

/**
 * La requête est-elle arrivée en HTTPS ?
 *
 * `X-Forwarded-Proto` est posé avec `$scheme`, qui **remplace** la valeur : une
 * seule entrée, pas de chaîne à démêler comme pour l'adresse. On lit malgré
 * tout la dernière entrée par prudence, au cas où un intermédiaire
 * concatènerait.
 *
 * `SESSION_COOKIE_SECURE=true|false` dans `.env` force le comportement.
 */
export async function isSecureRequest(): Promise<boolean> {
  const forced = process.env.SESSION_COOKIE_SECURE;
  if (forced === "true") return true;
  if (forced === "false") return false;

  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto");
  if (!proto) return false;
  const entries = proto.split(",").map((entry) => entry.trim()).filter(Boolean);
  return entries[entries.length - 1] === "https";
}
