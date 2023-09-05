import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProxyAbiService } from 'src/modules/proxy/services/proxy.abi.service';
import { ProxyPairAbiService } from 'src/modules/proxy/services/proxy-pair/proxy.pair.abi.service';
import { ProxyFarmAbiService } from 'src/modules/proxy/services/proxy-farm/proxy.farm.abi.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { CachingService } from '../caching/cache.service';
import { cacheConfig, scAddress } from 'src/config';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from '../redis.pubSub.module';
import { oneHour } from '../../helpers/helpers';
import { CacheTtlInfo } from '../caching/cache.ttl.info';

@Injectable()
export class ProxyCacheWarmerService {
    private invalidatedKeys = [];

    constructor(
        private readonly proxyAbi: ProxyAbiService,
        private readonly proxyPairAbi: ProxyPairAbiService,
        private readonly proxyFarmAbi: ProxyFarmAbiService,
        private readonly cachingService: CachingService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    @Cron(CronExpression.EVERY_HOUR)
    async cacheProxy(): Promise<void> {
        for (const version of Object.keys(scAddress.proxyDexAddress)) {
            const [
                assetTokenID,
                wrappedLpTokenID,
                intermediatedPairs,
                wrappedFarmTokenID,
                intermediatedFarms,
            ] = await Promise.all([
                this.proxyAbi.getAssetTokenIDRaw(
                    scAddress.proxyDexAddress[version],
                ),
                this.proxyPairAbi.getWrappedLpTokenIDRaw(
                    scAddress.proxyDexAddress[version],
                ),
                this.proxyPairAbi.getIntermediatedPairsRaw(
                    scAddress.proxyDexAddress[version],
                ),
                this.proxyFarmAbi.getWrappedFarmTokenIDRaw(
                    scAddress.proxyDexAddress[version],
                ),
                this.proxyFarmAbi.getIntermediatedFarmsRaw(
                    scAddress.proxyDexAddress[version],
                ),
            ]);

            await Promise.all([
                this.setProxyCache(
                    'proxy',
                    'assetTokenID',
                    assetTokenID,
                    CacheTtlInfo.Token.remoteTtl,
                    CacheTtlInfo.Token.localTtl,
                ),
                this.setProxyCache(
                    'proxyPair',
                    'wrappedLpTokenID',
                    wrappedLpTokenID,
                    CacheTtlInfo.Token.remoteTtl,
                    CacheTtlInfo.Token.localTtl,
                ),
                this.setProxyCache(
                    'proxyPair',
                    'intermediatedPairs',
                    intermediatedPairs,
                    oneHour(),
                ),
                this.setProxyCache(
                    'proxyFarm',
                    'wrappedFarmTokenID',
                    wrappedFarmTokenID,
                    CacheTtlInfo.Token.remoteTtl,
                    CacheTtlInfo.Token.localTtl,
                ),
                this.setProxyCache(
                    'proxyFarm',
                    'intermediatedFarms',
                    intermediatedFarms,
                    oneHour(),
                ),
            ]);
            await this.deleteCacheKeys();
        }
    }

    private async setProxyCache(
        proxy: string,
        key: string,
        value: any,
        remoteTtl: number = cacheConfig.default,
        localTtl?: number,
    ) {
        const cacheKey = generateCacheKeyFromParams(proxy, key);
        await this.cachingService.setCache(
            cacheKey,
            value,
            remoteTtl,
            localTtl,
        );
        this.invalidatedKeys.push(cacheKey);
    }

    private async deleteCacheKeys() {
        await this.pubSub.publish('deleteCacheKeys', this.invalidatedKeys);
        this.invalidatedKeys = [];
    }
}
