import type { APIRoute } from 'astro';
import { DatabaseStorage } from '@/lib/db/storage';

export const GET: APIRoute = async ({ locals, url }) => {
    const { userId } = locals.auth();
    if (!userId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const storage = new DatabaseStorage();
        const projectIdParam = url.searchParams.get('projectId');

        let packages;
        if (projectIdParam !== null) {
            const projectId = projectIdParam === '' ? null : Number(projectIdParam);
            packages = await storage.getProjectPackages(userId, projectId);
        } else {
            packages = await storage.getAllUserPackages(userId);
        }

        return new Response(JSON.stringify(packages), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store',
            }
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[GET /api/packages] ERROR for userId=${userId}:`, message);
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store',
            }
        });
    }
};
