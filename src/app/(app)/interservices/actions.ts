"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { ActionError } from "@/lib/errors";

export type InterserviceFormState = {
  error?: string;
  success?: boolean;
  fieldErrors?: Record<string, string[]>;
};

const interservicePostSchema = z.object({
  title: z.string().trim().min(3, "Le titre doit contenir au moins 3 caractères.").max(120),
  content: z.string().trim().min(5, "Le message doit contenir au moins 5 caractères.").max(3000),
});

export async function publishInterservicePost(
  _previousState: InterserviceFormState,
  formData: FormData,
): Promise<InterserviceFormState> {
  try {
    const actor = await requireActor();
    const primary =
      actor.memberships.find((membership) => membership.isPrimary && membership.status === "ACTIVE") ??
      actor.memberships.find((membership) => membership.status === "ACTIVE");

    if (!primary || !["POLICE", "EMS"].includes(primary.departmentType)) {
      throw new ActionError("Une affectation Police ou EMS active est nécessaire pour publier.");
    }

    const parsed = interservicePostSchema.safeParse({
      title: formData.get("title"),
      content: formData.get("content"),
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const post = await prisma.announcement.create({
      data: {
        ...parsed.data,
        authorId: actor.id,
        departmentId: null,
        isPinned: false,
      },
    });
    await audit(actor, "interservices.publish", { entity: "Announcement", entityId: post.id });
    revalidatePath("/interservices");
    return { success: true };
  } catch (error) {
    if (error instanceof ActionError) return { error: error.message };
    throw error;
  }
}
