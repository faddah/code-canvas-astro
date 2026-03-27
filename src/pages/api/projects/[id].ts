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
    const project = await storage.getProject(Number(params.id), userId);

    if (!project) {
        return new Response(JSON.stringify({ message: "Project not found" }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify(project), {
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
    const project = await storage.getProject(Number(id), userId);

    if (!project) {
        return new Response(JSON.stringify({ message: "Project not found" }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const body = await request.json();
    const updated = await storage.updateProject(Number(id), userId, body);

    return new Response(JSON.stringify(updated), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
};

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
            return new Response(JSON.stringify({ error: `Invalid project id: "${id}"` }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const storage = new DatabaseStorage();
        const project = await storage.getProject(numericId, userId);

        if (!project) {
            return new Response(JSON.stringify({ error: `Project id=${numericId} not found` }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Delete all files in the project first, then the project itself
        await storage.deleteAllProjectFiles(numericId, userId);
        await storage.deleteProject(numericId, userId);

        return new Response(null, { status: 204 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
