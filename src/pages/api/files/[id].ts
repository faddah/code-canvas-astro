import type { APIRoute } from 'astro';
import { DatabaseStorage } from '@/lib/db/storage';

export const GET: APIRoute = async ({ params }) => {
    const storage = new DatabaseStorage();
    const file = await storage.getFile(Number(params.id));
    
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

export const PUT: APIRoute = async ({ params: { id }, request  }) => {
    const storage = new DatabaseStorage();
    const file = await storage.getFile(Number(id));
    
    if (!file) {
        return new Response(JSON.stringify({ message: "File not found" }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    const body = await request.json();
    const updatedFile = await storage.updateFile(Number(id), body);
    
    return new Response(JSON.stringify(updatedFile), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
};

export const PATCH: APIRoute = async ({ params: { id }, request  }) => {
    const storage = new DatabaseStorage();
    const file = await storage.getFile(Number(id));
    
    if (!file) {
        return new Response(JSON.stringify({ message: "File not found" }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    const body = await request.json();
    const updatedFile = await storage.updateFile(Number(id), body);
    
    return new Response(JSON.stringify(updatedFile), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
};

export const DELETE: APIRoute = async ({ params: { id } }) => {
    console.log(`[DELETE /api/files/${id}] Request received`);
    try {
        const numericId = Number(id);
        if (isNaN(numericId)) {
            console.error(`[DELETE /api/files/${id}] Invalid id — not a number`);
            return new Response(JSON.stringify({ error: `Invalid file id: "${id}"` }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const storage = new DatabaseStorage();

        console.log(`[DELETE /api/files/${id}] Looking up file id=${numericId}`);
        const file = await storage.getFile(numericId);

        if (!file) {
            console.warn(`[DELETE /api/files/${id}] File id=${numericId} not found in DB`);
            return new Response(JSON.stringify({ error: `File id=${numericId} not found` }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`[DELETE /api/files/${id}] Found file: "${file.name}" — deleting...`);
        await storage.deleteFile(numericId);
        console.log(`[DELETE /api/files/${id}] Successfully deleted file id=${numericId} ("${file.name}")`);

        return new Response(null, { status: 204 });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const stack = err instanceof Error ? err.stack : undefined;
        console.error(`[DELETE /api/files/${id}] FATAL ERROR:`, message);
        if (stack) console.error(stack);
        return new Response(
            JSON.stringify({ error: message, stack }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}