import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { EsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import { WeekTimekeepingComputeService } from '../../week-timekeeping/services/week-timekeeping.compute.service';
import { ProgressComputeService } from './progress.compute.service';
import { TokenDistributionModel } from '../models/weekly-rewards-splitting.model';
import { IWeeklyRewardsSplittingComputeService } from '../interfaces';
import { scAddress } from '../../../config';
import { PairComputeService } from '../../../modules/pair/services/pair.compute.service';
import { EnergyGetterService } from '../../../modules/energy/services/energy.getter.service';
import { TokenComputeService } from '../../../modules/tokens/services/token.compute.service';
import { EnergyType } from '@multiversx/sdk-exchange';

@Injectable()
export class WeeklyRewardsSplittingComputeService
    implements IWeeklyRewardsSplittingComputeService
{
    constructor(
        protected readonly weekTimekeepingCompute: WeekTimekeepingComputeService,
        protected readonly progressCompute: ProgressComputeService,
        protected readonly pairCompute: PairComputeService,
        protected readonly energyGetter: EnergyGetterService,
        protected readonly tokenCompute: TokenComputeService,
    ) {}

    /*
    async computeUserAllRewards(
        scAddress: string,
        userAddress: string,
        currentWeek: number,
        userProgress: ClaimProgress
    ): Promise<EsdtTokenPayment[]> {
        const totalRewards: Map<string, EsdtTokenPayment> = new Map<
            string,
            EsdtTokenPayment
        >();

        const startWeek =
            userProgress.week === 0
                ? currentWeek
                : Math.max(
                      currentWeek - constantsConfig.USER_MAX_CLAIM_WEEKS,
                      userProgress.week,
                  );
        for (let week = startWeek; week < currentWeek; week++) {
            if (week < 1) {
                continue;
            }

            const [rewardsForWeek, newUserProgress] = await Promise.all([
                await this.computeUserRewardsForWeek(
                    scAddress,
                    week,
                    userAddress,
                    userProgress.energy.amount,
                ),
                await this.advanceWeek(scAddress, userAddress, userProgress),
            ]);

            userProgress = newUserProgress;

            for (const esdtReward of rewardsForWeek) {
                const tokenID = esdtReward.tokenID;
                const previousRewards = await totalRewards.get(tokenID);
                if (previousRewards === undefined) {
                    totalRewards.set(tokenID, esdtReward);
                    continue;
                }
                previousRewards.amount = new BigNumber(previousRewards.amount)
                    .plus(new BigNumber(esdtReward.amount))
                    .toFixed();
                totalRewards.set(tokenID, previousRewards);
            }
        }
        return [...totalRewards.values()];
    }
    */

    /*
    async advanceWeek(
        scAddress: string,
        userAddress: string,
        progress: ClaimProgress,
        endEpochForWeek: number,
    ): Promise<ClaimProgress> {
        const nextWeek = progress.week + 1;
        const userEnergyNextWeek =
            await this.weeklyRewardsSplittingGetter.userEnergyForWeek(
                scAddress,
                userAddress,
                nextWeek,
                endEpochForWeek,
            );
        progress = this.progressCompute.advanceWeek(
            progress,
            userEnergyNextWeek,
            this.weekTimekeepingCompute.epochsInWeek,
        );
        return progress;
    }
    */

    async computeUserRewardsForWeek(
        scAddress: string,
        totalRewardsForWeek: EsdtTokenPayment[],
        userEnergyForWeek: EnergyType,
        totalEnergyForWeek: string,
        energyAmount?: string,
        liquidity?: string,
    ): Promise<EsdtTokenPayment[]> {
        const payments: EsdtTokenPayment[] = [];
        if (totalRewardsForWeek.length === 0) {
            return payments;
        }
        if (energyAmount === undefined) {
            energyAmount = userEnergyForWeek.amount;
        }

        if (!new BigNumber(energyAmount).isGreaterThan(0)) {
            return payments;
        }

        for (const weeklyRewards of totalRewardsForWeek) {
            const paymentAmount = new BigNumber(weeklyRewards.amount)
                .multipliedBy(new BigNumber(energyAmount))
                .dividedBy(new BigNumber(totalEnergyForWeek));
            if (paymentAmount.isGreaterThan(0)) {
                payments.push(
                    new EsdtTokenPayment({
                        tokenID: weeklyRewards.tokenID,
                        nonce: 0,
                        amount: paymentAmount.integerValue().toFixed(),
                        tokenType: weeklyRewards.tokenType,
                    }),
                );
            }
        }

        return payments;
    }

    async computeDistribution(
        payments: EsdtTokenPayment[],
    ): Promise<TokenDistributionModel[]> {
        let totalPriceUSD = new BigNumber('0');
        const tokenDistributionModels = [];

        const tokenDistributions = await Promise.all(
            payments.map(async (token) => {
                const tokenPriceUSD =
                    await this.tokenCompute.computeTokenPriceDerivedUSD(
                        token.tokenID,
                    );
                const rewardsPriceUSD = new BigNumber(
                    tokenPriceUSD,
                ).multipliedBy(new BigNumber(token.amount));

                return {
                    tokenID: token.tokenID,
                    rewardsPriceUSD: rewardsPriceUSD,
                };
            }),
        );

        tokenDistributions.forEach((token) => {
            tokenDistributionModels.push(
                new TokenDistributionModel({
                    tokenId: token.tokenID,
                    percentage: token.rewardsPriceUSD.toFixed(),
                }),
            );
            totalPriceUSD = totalPriceUSD.plus(token.rewardsPriceUSD);
        });

        return tokenDistributionModels.map((model: TokenDistributionModel) => {
            model.percentage = new BigNumber(model.percentage)
                .dividedBy(totalPriceUSD)
                .multipliedBy(100)
                .toFixed(4);
            return model;
        });
    }

    async computeTotalRewardsForWeekPriceUSD(
        scAddress: string,
        week: number,
        totalRewardsForWeek: EsdtTokenPayment[],
    ): Promise<string> {
        let totalPriceUSD = new BigNumber('0');

        const totalRewardsArray = await Promise.all(
            totalRewardsForWeek.map(async (token) => {
                const tokenPriceUSD =
                    await this.tokenCompute.computeTokenPriceDerivedUSD(
                        token.tokenID,
                    );
                const rewardsPriceUSD = new BigNumber(
                    tokenPriceUSD,
                ).multipliedBy(new BigNumber(token.amount));
                return rewardsPriceUSD;
            }),
        );

        totalRewardsArray.forEach(
            (reward) => (totalPriceUSD = totalPriceUSD.plus(reward)),
        );
        return totalPriceUSD.toFixed();
    }

    async computeTotalLockedTokensForWeekPriceUSD(
        address: string,
        week: number,
        totalLockedTokensForWeek: string,
    ): Promise<string> {
        const baseAssetTokenID = await this.energyGetter.getBaseAssetTokenID();
        let tokenPriceUSD = '0';
        if (scAddress.has(baseAssetTokenID)) {
            tokenPriceUSD = await this.tokenCompute.computeTokenPriceDerivedUSD(
                baseAssetTokenID,
            );
        }
        return new BigNumber(totalLockedTokensForWeek)
            .multipliedBy(new BigNumber(tokenPriceUSD))
            .toFixed();
    }

    async computeAprGivenLockedTokensAndRewards(
        scAddress: string,
        week: number,
        totalLockedTokensForWeek: string,
        totalRewardsForWeek: EsdtTokenPayment[],
    ): Promise<string> {
        const totalLockedTokensForWeekPriceUSD =
            await this.computeTotalLockedTokensForWeekPriceUSD(
                scAddress,
                week,
                totalLockedTokensForWeek,
            );
        const totalRewardsForWeekPriceUSD =
            await this.computeTotalRewardsForWeekPriceUSD(
                scAddress,
                week,
                totalRewardsForWeek,
            );

        return new BigNumber(totalRewardsForWeekPriceUSD)
            .times(52)
            .div(totalLockedTokensForWeekPriceUSD)
            .toFixed();
    }

    async computeApr(
        scAddress: string,
        week: number,
        totalLockedTokensForWeek: string,
        totalRewardsForWeek: EsdtTokenPayment[],
    ): Promise<string> {
        return this.computeAprGivenLockedTokensAndRewards(
            scAddress,
            week,
            totalLockedTokensForWeek,
            totalRewardsForWeek,
        );
    }

    async computeUserApr(
        scAddress: string,
        week: number,
        totalLockedTokensForWeek: string,
        totalRewardsForWeek: EsdtTokenPayment[],
        totalEnergyForWeek: string,
        userEnergyForWeek: EnergyType,
    ): Promise<string> {
        const globalApr = await this.computeAprGivenLockedTokensAndRewards(
            scAddress,
            week,
            totalLockedTokensForWeek,
            totalRewardsForWeek,
        );

        const apr = new BigNumber(globalApr)
            .multipliedBy(new BigNumber(userEnergyForWeek.amount))
            .multipliedBy(new BigNumber(totalLockedTokensForWeek))
            .div(new BigNumber(totalEnergyForWeek))
            .div(new BigNumber(userEnergyForWeek.totalLockedTokens))
            .toFixed();
        return apr;
    }
}
