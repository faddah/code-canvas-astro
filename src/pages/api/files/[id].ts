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
    const storage = new DatabaseStorage();
    const file = await storage.getFile(Number(id));
    
    if (!file) {
        return new Response(JSON.stringify({ message: "File not found" }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    await storage.deleteFile(Number(id));
    
    return new Response(null, { status: 204 });
}