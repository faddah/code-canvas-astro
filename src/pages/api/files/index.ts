import type { APIRoute } from 'astro';
import { DatabaseStorage } from '@/lib/db/storage';

export const GET: APIRoute = async () => {
    const storage = new DatabaseStorage();
    const existingFiles = await storage.getFiles();
    
    if (existingFiles.length === 0) {
        await storage.createFile({
            name: "main.py",
            content: `import sys
                import js

                # This is the main entry point
                print("Hello from Python!")
                print("<h1>This is HTML output</h1>")

                # Example of using the 'js' module to interact with the DOM directly
                # (This works in Pyodide!)
                # js.document.title = "Updated from Python"
                `
        });
        
        await storage.createFile({
            name: "utils.py",
            content: `def greet(name):
                        return f"Hello, {name}!"
                    `
        });
    }
    
    const files = await storage.getFiles();
    return new Response(JSON.stringify(files), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
};