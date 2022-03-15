import { Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { constantsConfig } from 'src/config';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { Logger } from 'winston';
import { StakingTokenAttributesModel } from '../models/stakingTokenAttributes.model';
import { StakingGetterService } from './staking.getter.service';

@Injectable()
export class StakingComputeService {
    constructor(
        private readonly stakingGetterService: StakingGetterService,
        private readonly contextGetter: ContextGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async computeStakeRewardsForPosition(
        stakeAddress: string,
        liquidity: string,
        decodedAttributes: StakingTokenAttributesModel,
    ): Promise<BigNumber> {
        const [
            futureRewardsPerShare,
            divisionSafetyConstant,
        ] = await Promise.all([
            this.computeFutureRewardsPerShare(stakeAddress),
            this.stakingGetterService.getDivisionSafetyConstant(stakeAddress),
        ]);

        const amountBig = new BigNumber(liquidity);
        const futureRewardsPerShareBig = new BigNumber(futureRewardsPerShare);
        const currentRewardPerShareBig = new BigNumber(
            decodedAttributes.rewardPerShare,
        );

        const rewardPerShareDiff = futureRewardsPerShareBig.minus(
            currentRewardPerShareBig,
        );
        return amountBig
            .multipliedBy(rewardPerShareDiff)
            .dividedBy(divisionSafetyConstant);
    }

    async computeFutureRewardsPerShare(
        stakeAddress: string,
    ): Promise<BigNumber> {
        let extraRewards = await this.computeExtraRewardsSinceLastAllocation(
            stakeAddress,
        );

        const [
            accumulatedRewards,
            rewardsCapacity,
            farmRewardPerShare,
            farmTokenSupply,
            divisionSafetyConstant,
        ] = await Promise.all([
            this.stakingGetterService.getAccumulatedRewards(stakeAddress),
            this.stakingGetterService.getRewardCapacity(stakeAddress),
            this.stakingGetterService.getRewardPerShare(stakeAddress),
            this.stakingGetterService.getFarmTokenSupply(stakeAddress),
            this.stakingGetterService.getDivisionSafetyConstant(stakeAddress),
        ]);

        const farmRewardPerShareBig = new BigNumber(farmRewardPerShare);
        const farmTokenSupplyBig = new BigNumber(farmTokenSupply);
        const divisionSafetyConstantBig = new BigNumber(divisionSafetyConstant);

        if (extraRewards.isGreaterThan(0)) {
            const totalRewards = extraRewards.plus(accumulatedRewards);
            if (totalRewards.isGreaterThan(rewardsCapacity)) {
                const amountOverCapacity = totalRewards.minus(rewardsCapacity);
                extraRewards = extraRewards.minus(amountOverCapacity);
            }

            return farmRewardPerShareBig.plus(
                extraRewards
                    .multipliedBy(divisionSafetyConstantBig)
                    .dividedBy(farmTokenSupplyBig),
            );
        }

        return farmRewardPerShareBig;
    }

    async computeExtraRewardsSinceLastAllocation(
        stakeAddress: string,
    ): Promise<BigNumber> {
        const [
            currentNonce,
            lastRewardBlockNonce,
            perBlockRewardAmount,
            produceRewardsEnabled,
        ] = await Promise.all([
            this.contextGetter.getShardCurrentBlockNonce(1),
            this.stakingGetterService.getLastRewardBlockNonce(stakeAddress),
            this.stakingGetterService.getPerBlockRewardAmount(stakeAddress),
            this.stakingGetterService.getProduceRewardsEnabled(stakeAddress),
        ]);

        const currentBlockBig = new BigNumber(currentNonce);
        const lastRewardBlockNonceBig = new BigNumber(lastRewardBlockNonce);
        const perBlockRewardAmountBig = new BigNumber(perBlockRewardAmount);
        const blockDifferenceBig = currentBlockBig.minus(
            lastRewardBlockNonceBig,
        );
        if (currentNonce > lastRewardBlockNonce && produceRewardsEnabled) {
            const extraRewardsUnbounded = perBlockRewardAmountBig.times(
                blockDifferenceBig,
            );
            const extraRewardsBounded = await this.computeExtraRewardsBounded(
                stakeAddress,
                blockDifferenceBig,
            );

            return extraRewardsUnbounded.isLessThan(extraRewardsBounded)
                ? extraRewardsUnbounded
                : extraRewardsBounded;
        }

        return new BigNumber(0);
    }

    async computeExtraRewardsBounded(
        stakeAddress: string,
        blockDifferenceBig: BigNumber,
    ): Promise<BigNumber> {
        const [farmTokenSupply, annualPercentageRewards] = await Promise.all([
            this.stakingGetterService.getFarmTokenSupply(stakeAddress),
            this.stakingGetterService.getAnnualPercentageRewards(stakeAddress),
        ]);
        const extraRewardsAPRBoundedPerBlock = new BigNumber(farmTokenSupply)
            .multipliedBy(annualPercentageRewards)
            .dividedBy(constantsConfig.MAX_PERCENT)
            .dividedBy(constantsConfig.BLOCKS_IN_YEAR);

        return extraRewardsAPRBoundedPerBlock.multipliedBy(blockDifferenceBig);
    }
}