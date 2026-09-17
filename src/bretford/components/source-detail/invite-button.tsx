"use client";

import { useState } from "react";
import { Button } from "@/bretford/components/ui/button";
import { Icon } from "@/bretford/components/ui/icon";
import { Toast } from "@/bretford/components/ui/toast";
import { InviteModal } from "@/bretford/components/source-detail/invite-modal";

function sentMessage(emails: string[]) {
  const [first, ...rest] = emails;
  if (rest.length === 0) return `Invitation sent to ${first}`;
  if (rest.length === 1) return `Invitations sent to ${first} and ${rest[0]}`;
  return `Invitations sent to ${first} and ${rest.length} others`;
}

/**
 * "Invite" action of the info column: owns the Adding Member dialog and the
 * confirmation toast shown once the invitation has been sent.
 */
export function InviteButton() {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

  return (
    <>
      {/* The mobile frame keeps this full-width button at the 32px desktop size (834:23545) */}
      <Button variant="secondary" touch={false} className="w-full" onClick={() => setOpen(true)}>
        <Icon name="user-plus-01" size={14} />
        Invite
      </Button>

      <InviteModal
        open={open}
        onClose={() => setOpen(false)}
        onSent={(emails) => setToast({ id: Date.now(), message: sentMessage(emails) })}
      />

      {/* keyed by id so a second invite replays the entrance with the new message */}
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          // only clear if this toast is still the current one (a newer one may have replaced it)
          onDismiss={() => setToast((current) => (current?.id === toast.id ? null : current))}
        />
      )}
    </>
  );
}
