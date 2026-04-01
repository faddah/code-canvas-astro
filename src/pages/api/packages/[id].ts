import type { APIRoute } from 'astro';
import { DatabaseStorage } from '@/lib/db/storage';

export const DELETE: APIRoute = async ({ params: { id }, locals }) => {
    const { userId } = locals.auth();
    if (!userId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const numericId = Number(id);
        if (isNaN(numericId)) {
            return new Response(JSON.stringify({ error: `Invalid package id: "${id}"` }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const storage = new DatabaseStorage();
        await storage.removeProjectPackage(numericId, userId);

        return new Response(null, { status: 204 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};