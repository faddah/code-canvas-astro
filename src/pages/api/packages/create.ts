import type { APIRoute } from 'astro';
import { DatabaseStorage } from '@/lib/db/storage';

export const POST: APIRoute = async ({ request, locals }) => {
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
        const pkg = await storage.addProjectPackage({
            ...body,
            clerkUserId: userId,
        });
        return new Response(JSON.stringify(pkg), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ message: "Invalid input" }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
