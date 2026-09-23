"use client";

import type { MouseEvent } from "react";

type Props = {
  token: string;
};

function contactHref(token: string): string {
  return `/api/cards/${encodeURIComponent(token)}/contact.vcf`;
}

function isAppleDevice(): boolean {
  return /iPad|iPhone|iPod/i.test(navigator.userAgent);
}

export function AddToContactsButton({ token }: Props) {
  const href = contactHref(token);

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (isAppleDevice()) return;

    event.preventDefault();
    const link = document.createElement("a");
    link.href = href;
    link.download = "contact.vcf";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <a
      href={href}
      onClick={onClick}
      className="mt-4 flex min-h-12 items-center justify-center rounded-2xl bg-foreground text-sm font-semibold text-white transition hover:bg-primary"
    >
      Ajouter aux contacts
    </a>
  );
}
