import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneMinute } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';

@Injectable()
export class StakingSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
    }

    async setPairContractManagedAddress(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'pairAddress'),
            value,
            oneHour(),
        );
    }

    async setFarmTokenID(stakeAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'farmTokenID'),
            value,
            oneHour(),
        );
    }

    async setFarmingTokenID(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'farmingTokenID'),
            value,
            oneHour(),
        );
    }

    async setRewardTokenID(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'rewardTokenID'),
            value,
            oneHour(),
        );
    }

    async setFarmTokenSupply(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'farmTokenSupply'),
            value,
            oneMinute(),
        );
    }

    async setRewardPerShare(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'rewardPerShare'),
            value,
            oneMinute(),
        );
    }

    async setAccumulatedRewards(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'accumulatedRewards'),
            value,
            oneMinute(),
        );
    }

    async setRewardCapacity(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'rewardCapacity'),
            value,
            oneMinute(),
        );
    }

    async setAnnualPercentageRewards(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'annualPercentageRewards'),
            value,
            oneMinute(),
        );
    }

    async setMinUnbondEpochs(
        stakeAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'minUnboundEpochs'),
            value,
            oneMinute(),
        );
    }

    async setPenaltyPercent(
        stakeAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'penaltyPercent'),
            value,
            oneMinute(),
        );
    }

    async setMinimumFarmingEpoch(
        stakeAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'minimumFarmingEpochs'),
            value,
            oneMinute(),
        );
    }

    async setPerBlockRewardAmount(
        stakeAddress: string,
        value: string,
    ): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'perBlockRewards'),
            value,
            oneMinute(),
        );
    }

    async setLastRewardBlockNonce(
        stakeAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'lastRewardBlockNonce'),
            value,
            oneMinute(),
        );
    }

    async setDivisionSafetyConstant(
        stakeAddress: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'divisionSafetyConstant'),
            value,
            oneMinute(),
        );
    }

    async setState(stakeAddress: string, value: string): Promise<string> {
        return await this.setData(
            this.getStakeCacheKey(stakeAddress, 'state'),
            value,
            oneMinute(),
        );
    }

    private getStakeCacheKey(stakeAddress: string, ...args: any) {
        return generateCacheKeyFromParams('stake', stakeAddress, ...args);
    }
}
