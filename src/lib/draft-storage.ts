"use client";

/**
 * Brouillons de formulaire, conservés dans le navigateur.
 *
 * Ils permettent de quitter une page de rédaction et d'y revenir sans perdre
 * sa saisie. Le stockage est volontairement local : un brouillon n'a pas à
 * exister côté serveur tant que l'agent n'a pas validé sa rédaction, sinon la
 * liste des rapports se remplirait d'ébauches accidentelles.
 *
 * Corollaire de sécurité : sur un poste partagé, un brouillon survivrait à la
 * déconnexion. `clearAllDrafts()` est donc appelé à la déconnexion, pour ne
 * pas laisser le texte d'un rapport au collègue suivant.
 */

const PREFIX = "mdt:draft:";

export function readDraft<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeDraft<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Quota dépassé ou stockage refusé : le brouillon est un confort, pas une
    // garantie. On ne casse pas la saisie en cours pour autant.
  }
}

export function clearDraft(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignoré */
  }
}

/** Efface tous les brouillons — appelé à la déconnexion. */
export function clearAllDrafts(): void {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(PREFIX)) keys.push(key);
    }
    for (const key of keys) window.localStorage.removeItem(key);
  } catch {
    /* ignoré */
  }
}
