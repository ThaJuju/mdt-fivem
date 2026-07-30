import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function UserAvatar({
  firstName,
  lastName,
  avatarUrl,
  size = "default",
  className,
}: {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  return (
    <Avatar size={size} className={cn("bg-muted", className)}>
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} alt={`Photo de ${firstName} ${lastName}`} />
      ) : null}
      <AvatarFallback>{initials || "?"}</AvatarFallback>
    </Avatar>
  );
}
