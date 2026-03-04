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
    const files = await storage.getUserFiles(userId);
    return new Response(JSON.stringify(files), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
};
