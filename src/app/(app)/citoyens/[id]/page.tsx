import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { differenceInYears, format } from "date-fns";
import { fr } from "date-fns/locale";
import { requireActor, requirePagePermission, can } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CitizenForm } from "../citizen-form";
import { NotesSection } from "./notes-section";
import { LicensesSection } from "./licenses-section";
import { DeceasedToggle } from "./deceased-toggle";

export const metadata: Metadata = { title: "Fiche citoyen — MDT" };

export default async function CitizenDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  requirePagePermission(actor, "citizens.view");

  const { id } = await params;

  const citizen = await prisma.citizen.findUnique({
    where: { id },
    include: {
      notes: { orderBy: { createdAt: "desc" }, include: { author: true } },
      licenses: { orderBy: { issuedAt: "desc" } },
      ownedVehicles: { orderBy: { plate: "asc" } },
      ownedWeapons: { orderBy: { serialNumber: "asc" } },
      warrants: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" } },
      medicalRecord: { select: { isFitForDuty: true } },
    },
  });

  if (!citizen) notFound();

  await audit(actor, "citizen.view", { entity: "Citizen", entityId: citizen.id });

  const flaggedNotes = citizen.notes.filter((note) => note.isFlagged);

  const activeWarrants = can(actor, "warrants.view") ? citizen.warrants : [];

  return (
    <div className="flex flex-col gap-6">
      {activeWarrants.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-md border border-alert bg-alert/10 p-4">
          <div className="flex items-center gap-2 text-alert">
            <AlertTriangle className="size-4" />
            <span className="font-medium">
              {activeWarrants.length} mandat{activeWarrants.length > 1 ? "s" : ""} actif
              {activeWarrants.length > 1 ? "s" : ""}
            </span>
          </div>
          {activeWarrants.map((warrant) => (
            <p key={warrant.id} className="text-sm">
              {warrant.type === "ARREST" ? "Mandat d'arrêt" : "Perquisition"} — {warrant.reason}
            </p>
          ))}
        </div>
      ) : null}

      {flaggedNotes.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-md border border-department/60 bg-department/10 p-4">
          <div className="flex items-center gap-2 text-department">
            <AlertTriangle className="size-4" />
            <span className="font-medium">
              {flaggedNotes.length} note{flaggedNotes.length > 1 ? "s" : ""} signalée
              {flaggedNotes.length > 1 ? "s" : ""}
            </span>
          </div>
          {flaggedNotes.map((note) => (
            <p key={note.id} className="text-sm text-foreground">
              {note.content}
            </p>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {citizen.firstName} {citizen.lastName}
          </h1>
          <span className="text-muted-foreground">{differenceInYears(new Date(), citizen.dob)} ans</span>
          {citizen.isDeceased ? <Badge variant="outline">Décédé</Badge> : null}
          {/* L'aptitude conditionne le permis de port d'arme : utile côté police. */}
          {citizen.medicalRecord?.isFitForDuty === false ? (
            <Badge className="bg-destructive text-destructive-foreground">
              Inapte au port d&apos;arme
            </Badge>
          ) : citizen.medicalRecord?.isFitForDuty === true ? (
            <Badge variant="outline">Apte au port d&apos;arme</Badge>
          ) : null}
        </div>
        {can(actor, "citizens.edit") ? (
          <DeceasedToggle citizenId={citizen.id} isDeceased={citizen.isDeceased} />
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent>
            {can(actor, "citizens.edit") ? (
              <CitizenForm
                citizen={{
                  id: citizen.id,
                  firstName: citizen.firstName,
                  lastName: citizen.lastName,
                  dob: citizen.dob.toISOString().slice(0, 10),
                  gender: citizen.gender,
                  height: citizen.height,
                  weight: citizen.weight,
                  hairColor: citizen.hairColor,
                  eyeColor: citizen.eyeColor,
                  address: citizen.address,
                  postal: citizen.postal,
                  phone: citizen.phone,
                  occupation: citizen.occupation,
                  imageUrl: citizen.imageUrl,
                  fingerprint: citizen.fingerprint,
                }}
              />
            ) : (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Date de naissance</dt>
                  <dd>{format(citizen.dob, "dd/MM/yyyy", { locale: fr })}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Genre</dt>
                  <dd>{citizen.gender}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Adresse</dt>
                  <dd>{citizen.address ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Téléphone</dt>
                  <dd className="font-mono">{citizen.phone ?? "—"}</dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Véhicules</CardTitle>
            </CardHeader>
            <CardContent>
              {citizen.ownedVehicles.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun véhicule enregistré à ce nom.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {citizen.ownedVehicles.map((vehicle) => (
                    <li key={vehicle.id}>
                      <Link href={`/vehicules/${vehicle.id}`} className="text-sm hover:underline">
                        <span className="font-mono">{vehicle.plate}</span> — {vehicle.make} {vehicle.model}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Armes</CardTitle>
            </CardHeader>
            <CardContent>
              {citizen.ownedWeapons.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune arme enregistrée à ce nom.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {citizen.ownedWeapons.map((weapon) => (
                    <li key={weapon.id}>
                      <Link href={`/armes/${weapon.id}`} className="text-sm hover:underline">
                        <span className="font-mono">{weapon.serialNumber}</span> — {weapon.model}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <LicensesSection
        citizenId={citizen.id}
        licenses={citizen.licenses.map((license) => ({
          id: license.id,
          type: license.type,
          status: license.status,
          points: license.points,
          issuedAt: license.issuedAt.toISOString().slice(0, 10),
          expiresAt: license.expiresAt ? license.expiresAt.toISOString().slice(0, 10) : null,
        }))}
        canManage={can(actor, "citizens.licenses.manage")}
      />

      <NotesSection
        citizenId={citizen.id}
        notes={citizen.notes.map((note) => ({
          id: note.id,
          content: note.content,
          isFlagged: note.isFlagged,
          createdAt: note.createdAt,
          authorName: `${note.author.firstName} ${note.author.lastName}`,
        }))}
        canCreate={can(actor, "citizens.notes.create")}
        canDelete={can(actor, "citizens.notes.delete")}
      />
    </div>
  );
}
