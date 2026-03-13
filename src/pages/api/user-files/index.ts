import type { APIRoute } from 'astro';
import { DatabaseStorage } from '@/lib/db/storage';

export const GET: APIRoute = async ({ locals }) => {
    const { userId } = locals.auth();
    console.log(`[GET /api/user-files] userId=${userId ?? '(null)'}`);
    if (!userId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const storage = new DatabaseStorage();
        const files = await storage.getUserFiles(userId);
        console.log(`[GET /api/user-files] Returning ${files.length} files for userId=${userId}`);
        return new Response(JSON.stringify(files), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store',
            }
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[GET /api/user-files] ERROR for userId=${userId}:`, message);
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store',
            }
        });
    }
};
