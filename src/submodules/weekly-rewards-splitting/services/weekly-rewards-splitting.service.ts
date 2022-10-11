import { Injectable } from "@nestjs/common";
import { UserWeeklyRewardsSplittingModel, WeeklyRewardsSplittingModel } from "../models/weekly-rewards-splitting.model";
import { WeeklyRewardsSplittingGetterService } from "./weekly-rewards.splitting.getter.service";


@Injectable()
export class WeeklyRewardsSplittingService {
    constructor(
        private readonly weeklyRewardsSplittingGetter: WeeklyRewardsSplittingGetterService,
    ) {}

    async getWeeklyRewardsSplit(scAddress: string, week: number): Promise<WeeklyRewardsSplittingModel> {
        return new WeeklyRewardsSplittingModel({
            scAddress: scAddress,
            week: week,
        });
    }

    async getUserWeeklyRewardsSplit(scAddress: string, userAddress: string, week: number): Promise<UserWeeklyRewardsSplittingModel> {
        const [
            claimProgress,
            energyForWeek,
            lastActiveWeekForUser,
        ] = await Promise.all([
            this.weeklyRewardsSplittingGetter.currentClaimProgress(scAddress, userAddress),
            this.weeklyRewardsSplittingGetter.userEnergyForWeek(scAddress, userAddress, week),
            this.weeklyRewardsSplittingGetter.lastActiveWeekForUser(scAddress, userAddress),
        ]);
        return new UserWeeklyRewardsSplittingModel({
            scAddress: scAddress,
            week: week,
            claimProgress: claimProgress,
            energyForWeek: energyForWeek,
            lastActiveWeekForUser: lastActiveWeekForUser
        });
    }
}
