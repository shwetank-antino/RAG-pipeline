import http from "node:http";
import app from "./src/app.js";
import config from "./env.config.js";
import { cleanupOrphanedUploads, cleanupOrphanedQdrantCollections } from "./src/utils/cleanup.js";

const runCleanup = async () => {
    await cleanupOrphanedUploads();
    await cleanupOrphanedQdrantCollections();
};

const server = http.createServer(app);

server.on('clientError', (err, socket) => {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

server.listen(config.port, ()=>{
    console.log(`Server is running on port ${config.port}`);

    runCleanup().catch((err) => {
        console.error('[cleanup] Startup cleanup failed: ', err);
    });

    setInterval(()=>{
        runCleanup().catch((err) => {
            console.error('[cleanup] Periodic cleanup failed: ', err);
        });
    }, 600000);
});