import IORedis from 'ioredis';
import config from '../../env.config.js';

const valkeyBullMQConnection = new IORedis(config.valkeyUrl, {
    maxRetriesPerRequest: null
});

export default valkeyBullMQConnection;