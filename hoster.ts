import path from "path";

const PORT = 8081;
const distPath = path.resolve("dist", "index.js");
Bun.serve({
    port: PORT,
    async fetch(req) {
        const url = new URL(req.url);
        const headers = {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "text/plain",
        };

        if (url.pathname === "/") {
            return new Response("Hello from Fishka Client! Please visit 'dist' or 'build' paths.", { headers });
        }

        if (url.pathname === "/dist") {
            try {
                const file = await Bun.file(distPath).text();
                return new Response(file.replace(/export {.*?};?/s, ""), { headers });
            } catch {
                return new Response("Not Found", { status: 404, headers });
            }
        }

        return new Response("Not Found", { status: 404, headers });
    },
});

console.log(`🚀 Server running at http://localhost:${PORT}`);