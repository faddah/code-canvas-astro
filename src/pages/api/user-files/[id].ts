import type { APIRoute } from 'astro';
import { DatabaseStorage } from '@/lib/db/storage';

export const GET: APIRoute = async ({ params, locals }) => {
    const { userId } = locals.auth();
    if (!userId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const storage = new DatabaseStorage();
    const file = await storage.getUserFile(Number(params.id), userId);

    if (!file) {
        return new Response(JSON.stringify({ message: "File not found" }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify(file), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
};

export const PUT: APIRoute = async ({ params: { id }, request, locals }) => {
    const { userId } = locals.auth();
    if (!userId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const storage = new DatabaseStorage();
    const file = await storage.getUserFile(Number(id), userId);

    if (!file) {
        return new Response(JSON.stringify({ message: "File not found" }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const body = await request.json();
    const updatedFile = await storage.updateUserFile(Number(id), userId, body);

    return new Response(JSON.stringify(updatedFile), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
};

export const PATCH: APIRoute = async ({ params: { id }, request, locals }) => {
    const { userId } = locals.auth();
    if (!userId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const storage = new DatabaseStorage();
    const file = await storage.getUserFile(Number(id), userId);

    if (!file) {
        return new Response(JSON.stringify({ message: "File not found" }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const body = await request.json();
    const updatedFile = await storage.updateUserFile(Number(id), userId, body);

    return new Response(JSON.stringify(updatedFile), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
};

export const DELETE: APIRoute = async ({ params: { id }, locals }) => {
    console.log(`[DELETE /api/user-files/${id}] Request received`);
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
            console.error(`[DELETE /api/user-files/${id}] Invalid id — not a number`);
            return new Response(JSON.stringify({ error: `Invalid file id: "${id}"` }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const storage = new DatabaseStorage();

        console.log(`[DELETE /api/user-files/${id}] Looking up file id=${numericId} for user=${userId}`);
        const file = await storage.getUserFile(numericId, userId);

        if (!file) {
            console.warn(`[DELETE /api/user-files/${id}] File id=${numericId} not found for user=${userId}`);
            return new Response(JSON.stringify({ error: `File id=${numericId} not found` }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`[DELETE /api/user-files/${id}] Found file: "${file.name}" — deleting...`);
        await storage.deleteUserFile(numericId, userId);
        console.log(`[DELETE /api/user-files/${id}] Successfully deleted file id=${numericId} ("${file.name}")`);

        return new Response(null, { status: 204 });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const stack = err instanceof Error ? err.stack : undefined;
        console.error(`[DELETE /api/user-files/${id}] FATAL ERROR:`, message);
        if (stack) console.error(stack);
        return new Response(
            JSON.stringify({ error: message, stack }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
