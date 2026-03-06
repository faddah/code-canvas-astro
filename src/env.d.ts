/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    auth: () => {
      userId: string | null;
      sessionId: string | null;
      orgId: string | null;
      orgRole: string | null;
      orgSlug: string | null;
    };
  }
}
