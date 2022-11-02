import {
    Address,
    AddressValue,
    BigUIntType,
    BigUIntValue,
    Field,
    FieldDefinition,
    Interaction,
    Struct,
    StructType,
    U32Value,
    U64Type,
    U64Value,
} from '@elrondnetwork/erdjs/out';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { CalculateRewardsArgs } from '../../models/farm.args';
import { AbiFarmService } from '../../base-module/services/farm.abi.service';
import { FarmTokenAttributesV1_3 } from '@elrondnetwork/erdjs-dex';
import { FarmRewardType } from '../../models/farm.model';
import { farmType } from 'src/utils/farm.utils';
import { BoostedYieldsFactors } from '../../models/farm.v2.model';

@Injectable()
export class FarmAbiServiceV2 extends AbiFarmService {
    async getBoostedYieldsRewardsPercenatage(
        farmAddress: string,
    ): Promise<number> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );

        const interaction: Interaction =
            contract.methodsExplicit.getBoostedYieldsRewardsPercenatage();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    async getLockingScAddress(farmAddress: string): Promise<string> {
        if (farmType(farmAddress) === FarmRewardType.UNLOCKED_REWARDS) {
            return undefined;
        }

        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );

        const interaction: Interaction =
            contract.methodsExplicit.getLockingScAddress();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().bech32();
    }

    async getLockEpochs(farmAddress: string): Promise<number> {
        if (farmType(farmAddress) === FarmRewardType.UNLOCKED_REWARDS) {
            return undefined;
        }

        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );

        const interaction: Interaction =
            contract.methodsExplicit.getLockEpochs();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    async getRemainingBoostedRewardsToDistribute(
        farmAddress: string,
        week: number,
    ): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );

        const interaction: Interaction =
            contract.methodsExplicit.getRemainingBoostedRewardsToDistribute([
                new U32Value(new BigNumber(week)),
            ]);
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getUndistributedBoostedRewards(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );

        const interaction: Interaction =
            contract.methodsExplicit.getUndistributedBoostedRewards();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getBoostedYieldsFactors(
        farmAddress: string,
    ): Promise<BoostedYieldsFactors> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );

        const interaction: Interaction =
            contract.methodsExplicit.getBoostedYieldsFactors();
        const response = await this.getGenericData(interaction);
        const rawBoostedYieldsFactors = response.firstValue.valueOf();
        return new BoostedYieldsFactors({
            userRewardsBase:
                rawBoostedYieldsFactors.user_rewards_base_const.toFixed(),
            userRewardsEnergy:
                rawBoostedYieldsFactors.user_rewards_energy_const.toFixed(),
            userRewardsFarm:
                rawBoostedYieldsFactors.user_rewards_farm_const.toFixed(),
            minEnergyAmount:
                rawBoostedYieldsFactors.min_energy_amount.toFixed(),
            minFarmAmount: rawBoostedYieldsFactors.min_farm_amount.toFixed(),
        });
    }

    async getEnergyFactoryAddress(farmAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );

        const interaction: Interaction =
            contract.methodsExplicit.getEnergyFactoryAddress();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().bech32();
    }

    async calculateRewardsForGivenPosition(
        args: CalculateRewardsArgs,
    ): Promise<BigNumber> {
        console.log({
            service: FarmAbiServiceV2.name,
            method: this.calculateRewardsForGivenPosition.name,
        });
        const contract = await this.elrondProxy.getFarmSmartContract(
            args.farmAddress,
        );
        const decodedAttributes = FarmTokenAttributesV1_3.fromAttributes(
            args.attributes,
        );
        const interaction: Interaction =
            contract.methodsExplicit.calculateRewardsForGivenPosition([
                new AddressValue(Address.fromString(args.user)),
                new BigUIntValue(new BigNumber(args.liquidity)),
                new Struct(
                    new StructType('FarmTokenAttributes', [
                        new FieldDefinition(
                            'reward_per_share',
                            '',
                            new BigUIntType(),
                        ),
                        new FieldDefinition(
                            'original_entering_epoch',
                            '',
                            new U64Type(),
                        ),
                        new FieldDefinition(
                            'entering_epoch',
                            '',
                            new U64Type(),
                        ),
                        new FieldDefinition(
                            'initial_farming_amount',
                            '',
                            new BigUIntType(),
                        ),
                        new FieldDefinition(
                            'compounded_reward',
                            '',
                            new BigUIntType(),
                        ),
                        new FieldDefinition(
                            'current_farm_amount',
                            '',
                            new BigUIntType(),
                        ),
                    ]),
                    [
                        new Field(
                            new BigUIntValue(
                                new BigNumber(decodedAttributes.rewardPerShare),
                            ),
                            'reward_per_share',
                        ),
                        new Field(
                            new U64Value(
                                new BigNumber(
                                    decodedAttributes.originalEnteringEpoch,
                                ),
                            ),
                            'original_entering_epoch',
                        ),
                        new Field(
                            new U64Value(
                                new BigNumber(decodedAttributes.enteringEpoch),
                            ),
                            'entering_epoch',
                        ),
                        new Field(
                            new BigUIntValue(
                                new BigNumber(
                                    decodedAttributes.initialFarmingAmount,
                                ),
                            ),
                            'initial_farming_amount',
                        ),
                        new Field(
                            new BigUIntValue(
                                new BigNumber(
                                    decodedAttributes.compoundedReward,
                                ),
                            ),
                            'compounded_reward',
                        ),
                        new Field(
                            new BigUIntValue(
                                new BigNumber(
                                    decodedAttributes.currentFarmAmount,
                                ),
                            ),
                            'current_farm_amount',
                        ),
                    ],
                ),
            ]);
        const response = await this.getGenericData(interaction);
        console.log(response);
        return response.firstValue.valueOf();
    }
}
