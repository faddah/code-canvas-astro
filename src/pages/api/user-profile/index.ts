import type { APIRoute } from 'astro';
import { DatabaseStorage } from '@/lib/db/storage';

export const GET: APIRoute = async ({ locals }) => {
    const { userId } = locals.auth();
    if (!userId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const storage = new DatabaseStorage();
    const profile = await storage.getUserProfile(userId);

    if (!profile) {
        return new Response(JSON.stringify({ message: "Profile not found" }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify(profile), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
};

export const POST: APIRoute = async ({ request, locals }) => {
    const { userId } = locals.auth();
    if (!userId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const storage = new DatabaseStorage();

    // Parse body — fail fast on invalid JSON
    let body: any;
    try {
        body = await request.json();
    } catch {
        return new Response(JSON.stringify({ message: "Invalid JSON" }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Idempotent: return existing profile if one already exists
    const existing = await storage.getUserProfile(userId);
    if (existing) {
        return new Response(JSON.stringify(existing), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const profile = await storage.createUserProfile({
            ...body,
            clerkUserId: userId,
        });
        return new Response(JSON.stringify(profile), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        // UNIQUE constraint race (two concurrent requests) — return existing
        const raceProfile = await storage.getUserProfile(userId);
        if (raceProfile) {
            return new Response(JSON.stringify(raceProfile), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        return new Response(JSON.stringify({ message: "Invalid input" }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

export const PUT: APIRoute = async ({ request, locals }) => {
    const { userId } = locals.auth();
    if (!userId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await request.json();
        const storage = new DatabaseStorage();
        const profile = await storage.updateUserProfile(userId, body);

        if (!profile) {
            return new Response(JSON.stringify({ message: "Profile not found" }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify(profile), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ message: "Invalid input" }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

export const DELETE: APIRoute = async ({ locals }) => {
    const { userId } = locals.auth();
    if (!userId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const storage = new DatabaseStorage();
        // Delete all user files first, then the profile
        await storage.deleteAllUserFiles(userId);
        await storage.deleteUserProfile(userId);

        return new Response(null, { status: 204 });
    } catch (err) {
        console.error('Failed to delete user profile:', err);
        return new Response(JSON.stringify({ message: 'Failed to delete profile' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
