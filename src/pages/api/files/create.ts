import type { APIRoute } from 'astro';
import { storage } from '../../../lib/db/storage';

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const file = await storage.createFile(body);
        return new Response(JSON.stringify(file), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ message: "Invalid input" }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
