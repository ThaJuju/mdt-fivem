/**
 * Erreur "attendue" d'une action serveur : son message est en français et
 * peut être affiché tel quel à l'utilisateur (permission refusée, saisie
 * invalide, règle métier violée...). Toute autre erreur doit être traitée
 * comme un bug et ne pas fuiter son message brut vers le client.
 */
export class ActionError extends Error {}
