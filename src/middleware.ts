import { defineMiddleware } from 'astro:middleware';
import { createClerkClient, verifyToken } from '@clerk/backend';

/**
 * Custom Clerk auth middleware that validates session tokens
 * without injecting client-side Clerk scripts into HTML responses.
 *
 * The client-side Clerk initialization is handled solely by
 * ClerkProvider in App.tsx, avoiding double-initialization that
 * causes openSignIn()/openSignUp() to silently fail.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const secretKey = process.env.CLERK_SECRET_KEY || import.meta.env.CLERK_SECRET_KEY;
  const publishableKey = process.env.PUBLIC_CLERK_PUBLISHABLE_KEY || import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY;

  // If Clerk isn't configured, pass through with unauthenticated state
  if (!secretKey) {
    context.locals.auth = () => ({
      userId: null,
      sessionId: null,
      orgId: null,
      orgRole: null,
      orgSlug: null,
    });
    return next();
  }

  // Extract session token from cookie or Authorization header
  const sessionToken =
    context.request.headers.get('cookie')?.match(/__session=([^;]+)/)?.[1] ||
    context.request.headers.get('authorization')?.replace('Bearer ', '');

  if (!sessionToken) {
    context.locals.auth = () => ({
      userId: null,
      sessionId: null,
      orgId: null,
      orgRole: null,
      orgSlug: null,
    });
    return next();
  }

  try {
    const claims = await verifyToken(sessionToken, {
      secretKey,
      publishableKey,
    });

    context.locals.auth = () => ({
      userId: claims.sub,
      sessionId: claims.sid,
      orgId: claims.org_id ?? null,
      orgRole: claims.org_role ?? null,
      orgSlug: claims.org_slug ?? null,
    });
  } catch (err) {
    // Token invalid or expired — treat as signed out
    context.locals.auth = () => ({
      userId: null,
      sessionId: null,
      orgId: null,
      orgRole: null,
      orgSlug: null,
    });
  }

  return next();
});
