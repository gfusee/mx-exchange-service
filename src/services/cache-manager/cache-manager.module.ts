import { CacheModule, Module } from '@nestjs/common';
import { CacheManagerService } from './cache-manager.service';
import * as redisStore from 'cache-manager-redis-store';

@Module({
    providers: [CacheManagerService],
    imports: [
        CacheModule.register({
            ttl: 60 * 5,
            store: redisStore,
            host: process.env.REDIS_URL,
            port: process.env.REDIS_PORT,
        }),
    ],
    exports: [CacheManagerService],
})
export class CacheManagerModule {}
