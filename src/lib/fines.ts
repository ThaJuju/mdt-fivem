export type FineAmount = { fine: number; count: number };

/** Une charge stocke un montant unitaire : le solde réel inclut toujours les occurrences. */
export function fineAmount(charge: FineAmount): number {
  return charge.fine * charge.count;
}

export function sumFineAmounts(charges: FineAmount[]): number {
  return charges.reduce((total, charge) => total + fineAmount(charge), 0);
}
