import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "../../shared/schema";

const tursoUrl = process.env.TURSO_DATABASE_URL || import.meta.env?.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN || import.meta.env?.TURSO_AUTH_TOKEN;

if (!tursoUrl) {
    throw new Error(
        "TURSO_DATABASE_URL must be set. Did you forget to configure Turso?",
    );
}

if (!tursoToken) {
    throw new Error(
        "TURSO_AUTH_TOKEN must be set. Did you forget to configure Turso?",
    );
}

const client = createClient({
    url: tursoUrl,
    authToken: tursoToken,
});

export const db = drizzle(client, { schema });
