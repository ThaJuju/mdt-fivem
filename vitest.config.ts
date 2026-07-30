import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.join(import.meta.dirname, "src"),
      /**
       * `server-only` lève volontairement une erreur quand il est importé hors
       * du bundle serveur : c'est sa raison d'être. Sous Vitest, on n'est ni
       * client ni serveur React, et l'import ferait échouer tout test touchant
       * `auth.ts` ou `rate-limit.ts`. On le remplace par un module vide — le
       * marqueur garde tout son sens là où il compte, dans le build Next.
       */
      "server-only": path.join(import.meta.dirname, "src/test/server-only-stub.ts"),
    },
  },
});
