import { describe, expect, it } from "vitest";
import { detectImageFormat, isSafeUploadName, mimeForExtension } from "./uploads";

function bytes(...values: number[]): Uint8Array {
  // Les signatures WebP se lisent jusqu'à l'octet 11 : on complète toujours à
  // 12 pour que `detectImageFormat` ne refuse pas sur la longueur.
  const buffer = new Uint8Array(12);
  buffer.set(values.slice(0, 12));
  return buffer;
}

describe("isSafeUploadName", () => {
  it("accepte un nom généré par la route d'envoi", () => {
    expect(isSafeUploadName("0123456789abcdef0123456789abcdef.png")).toBe(true);
    expect(isSafeUploadName("0123456789abcdef0123456789abcdef.webp")).toBe(true);
  });

  it("refuse toute tentative de traversée de chemin", () => {
    expect(isSafeUploadName("../../etc/passwd")).toBe(false);
    expect(isSafeUploadName("../0123456789abcdef0123456789abcdef.png")).toBe(false);
    expect(isSafeUploadName("sous/dossier/0123456789abcdef0123456789abcdef.png")).toBe(false);
  });

  it("refuse le SVG et les extensions exécutables", () => {
    // Un SVG est un document XML capable de porter du script : servi depuis
    // notre origine, c'est une faille XSS.
    expect(isSafeUploadName("0123456789abcdef0123456789abcdef.svg")).toBe(false);
    expect(isSafeUploadName("0123456789abcdef0123456789abcdef.html")).toBe(false);
    expect(isSafeUploadName("0123456789abcdef0123456789abcdef.php")).toBe(false);
  });

  it("refuse un nom qui n'a pas la forme attendue", () => {
    expect(isSafeUploadName("photo.png")).toBe(false);
    expect(isSafeUploadName("0123456789ABCDEF0123456789ABCDEF.png")).toBe(false);
    expect(isSafeUploadName("0123456789abcdef0123456789abcde.png")).toBe(false);
    expect(isSafeUploadName("")).toBe(false);
  });
});

describe("detectImageFormat", () => {
  it("reconnaît les formats matriciels acceptés à leurs octets d'en-tête", () => {
    expect(detectImageFormat(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a))?.extension).toBe("png");
    expect(detectImageFormat(bytes(0xff, 0xd8, 0xff))?.extension).toBe("jpg");
    expect(detectImageFormat(bytes(0x47, 0x49, 0x46, 0x38))?.extension).toBe("gif");
    expect(
      detectImageFormat(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50))?.extension,
    ).toBe("webp");
  });

  it("ignore le type annoncé par le client et lit les octets", () => {
    // Un SVG renommé en .png et déclaré image/png : seul l'en-tête tranche.
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg">');
    expect(detectImageFormat(svg)).toBeNull();
  });

  it("refuse un fichier trop court pour porter une signature", () => {
    expect(detectImageFormat(new Uint8Array([0x89, 0x50, 0x4e]))).toBeNull();
    expect(detectImageFormat(new Uint8Array())).toBeNull();
  });
});

describe("mimeForExtension", () => {
  it("associe chaque extension acceptée à son type MIME", () => {
    expect(mimeForExtension("a.png")).toBe("image/png");
    expect(mimeForExtension("a.jpg")).toBe("image/jpeg");
    expect(mimeForExtension("a.gif")).toBe("image/gif");
    expect(mimeForExtension("a.webp")).toBe("image/webp");
  });
});
