import { createClient } from 'redis';
import config from '../../env.config.js';

const valkey = createClient({
    url: config.valkeyUrl
});

valkey.on('error', (err) => {
    console.error('Valkey error: ', err);
});

await valkey.connect();

export default valkey;