"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActor } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  email: z
    .union([z.string().email("Adresse email invalide."), z.literal("")])
    .transform((value) => value || null),
  avatarUrl: z
    .union([
      z.string().regex(/^\/api\/uploads\/[a-f0-9]{32}\.(png|jpe?g|gif|webp)$/, "Avatar invalide."),
      z.literal(""),
    ])
    .transform((value) => value || null),
});

export type ProfileState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"email" | "avatarUrl", string[]>>;
};

export async function updateProfile(
  _previousState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const actor = await requireActor();
  const parsed = profileSchema.safeParse({
    email: formData.get("email") ?? "",
    avatarUrl: formData.get("avatarUrl") ?? "",
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.user.update({
    where: { id: actor.id },
    data: parsed.data,
  });
  await audit(actor, "profile.update", {
    entity: "User",
    entityId: actor.id,
    metadata: {
      emailChanged: parsed.data.email !== null,
      avatarChanged: parsed.data.avatarUrl !== null,
    },
  });

  revalidatePath("/mon-compte");
  revalidatePath("/", "layout");
  return { success: true };
}
