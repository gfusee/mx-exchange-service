import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CachingService } from '../caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { ElrondApiService } from '../elrond-communication/elrond-api.service';
import { PUB_SUB } from '../redis.pubSub.module';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { oneMinute, oneSecond } from 'src/helpers/helpers';
import axios from 'axios';
import moment from 'moment';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { RouterService } from 'src/modules/router/services/router.service';
import { MetricsCollector } from 'src/utils/metrics.collector';

@Injectable()
export class CacheWarmerService {
    constructor(
        private readonly apiService: ElrondApiService,
        private readonly cachingService: CachingService,
        private readonly routerService: RouterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) { }

    @Cron('*/6 * * * * *')
    async cacheCurrentEpoch(): Promise<void> {
        const stats = await this.apiService.getStats();
        const ttl = (stats.roundsPerEpoch - stats.roundsPassed) * 6;
        const cacheKey = generateCacheKeyFromParams('context', 'currentEpoch');
        await this.cachingService.setCache(cacheKey, stats.epoch, ttl);
        await this.deleteCacheKeys([cacheKey]);
    }

    @Cron('*/6 * * * * *')
    async cacheGuest(): Promise<void> {
        // recompute cache
        const dateFormat = 'YYYY-MM-DD_HH:mm';
        const currentDate = moment().format(dateFormat);
        const previousMinute = moment().subtract(1, 'minute').format(dateFormat);

        const prefix = 'guestCache';
        const threshold = Number(process.env.ENABLE_CACHE_GUEST_RATE_THRESHOLD || 100);
        const keysToComputeCurrentMinute: string[] = await this.cachingService.executeRemoteRaw('zrange', `${prefix}.${currentDate}`, threshold, '+inf', 'BYSCORE');
        const keysToComputePreviousMinute: string[] = await this.cachingService.executeRemoteRaw('zrange', `${prefix}.${previousMinute}`, threshold, '+inf', 'BYSCORE');

        const keysToCompute = [...new Set([...keysToComputeCurrentMinute, ...keysToComputePreviousMinute])];

        await Promise.allSettled(keysToCompute.map(async key => {
            const parsedKey = `${prefix}.${key}.body`;
            const keyValue: object = await this.cachingService.getCache(parsedKey);

            if (!keyValue) {
                return Promise.resolve();
            }

            console.log(`Using guestCache to warm up query '${JSON.stringify(keyValue)}'`);

            // Get new data without cache and update it
            const { data } = await axios.post(`${process.env.ELRONDDEX_URL}/graphql`, keyValue, {
                headers: {
                    'no-cache': true
                }
            });

            return this.cachingService.setCache(`${prefix}.${key}.response`, data, 12 * oneSecond());
        }));

        MetricsCollector.setGuestHitQueries(keysToCompute.length);
    }

    @Cron('*/6 * * * * *')
    async cacheShardCurrentBlockNonce(): Promise<void> {
        const stats = await this.apiService.getStats();
        const promises: Promise<number>[] = [];
        for (let index = 0; index < stats.shards; index++) {
            promises.push(this.apiService.getCurrentBlockNonce(index));
        }
        const shardsNonces = await Promise.all(promises);
        const invalidatedKeys: string[] = [];
        for (let index = 0; index < stats.shards; index++) {
            const cacheKey = generateCacheKeyFromParams(
                'context',
                'shardBlockNonce',
                index,
            );
            await this.cachingService.setCache(
                cacheKey,
                shardsNonces[index],
                oneMinute(),
            );
        }

        await this.deleteCacheKeys(invalidatedKeys);
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
};
