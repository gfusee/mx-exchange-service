import { Test, TestingModule } from '@nestjs/testing';
import { PairService } from '../../pair/services/pair.service';
import { FarmAbiServiceMock } from '../mocks/farm.abi.service.mock';
import { MXApiServiceProvider } from '../../../services/multiversx-communication/mx.api.service.mock';
import { CommonAppModule } from '../../../common.app.module';
import { CachingModule } from '../../../services/caching/cache.module';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { Address } from '@multiversx/sdk-core';
import { FarmServiceV1_2 } from '../v1.2/services/farm.v1.2.service';
import { FarmComputeServiceV1_2 } from '../v1.2/services/farm.v1.2.compute.service';
import { FarmServiceV1_3 } from '../v1.3/services/farm.v1.3.service';
import { FarmComputeServiceV1_3 } from '../v1.3/services/farm.v1.3.compute.service';
import { FarmFactoryService } from '../farm.factory';
import { FarmServiceV2 } from '../v2/services/farm.v2.service';
import { FarmAbiServiceV2 } from '../v2/services/farm.v2.abi.service';
import { FarmComputeServiceV2 } from '../v2/services/farm.v2.compute.service';
import { RewardsModel } from '../models/farm.model';
import { WeekTimekeepingComputeService } from '../../../submodules/week-timekeeping/services/week-timekeeping.compute.service';
import { ProgressComputeService } from '../../../submodules/weekly-rewards-splitting/services/progress.compute.service';
import { MXDataApiServiceProvider } from 'src/services/multiversx-communication/mx.data.api.service.mock';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { WeekTimekeepingAbiServiceProvider } from 'src/submodules/week-timekeeping/mocks/week.timekeeping.abi.service.mock';
import { EnergyAbiServiceProvider } from 'src/modules/energy/mocks/energy.abi.service.mock';
import { WeeklyRewardsSplittingAbiServiceProvider } from 'src/submodules/weekly-rewards-splitting/mocks/weekly.rewards.splitting.abi.mock';
import { EnergyComputeService } from 'src/modules/energy/services/energy.compute.service';
import { ContextGetterServiceProvider } from 'src/services/context/mocks/context.getter.service.mock';
import { PairAbiServiceProvider } from 'src/modules/pair/mocks/pair.abi.service.mock';
import { PairComputeServiceProvider } from 'src/modules/pair/mocks/pair.compute.service.mock';
import { RouterAbiServiceProvider } from 'src/modules/router/mocks/router.abi.service.mock';
import { FarmAbiFactory } from '../farm.abi.factory';
import { FarmAbiServiceProviderV1_2 } from '../mocks/farm.v1.2.abi.service.mock';
import { FarmAbiServiceProviderV1_3 } from '../mocks/farm.v1.3.abi.service.mock';
import { FarmCustomAbiService } from '../custom/services/farm.custom.abi.service';
import { FarmCustomService } from '../custom/services/farm.custom.service';
import { WeeklyRewardsSplittingComputeService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.compute.service';
import { FarmCustomComputeService } from '../custom/services/farm.custom.compute.service';

describe('FarmService', () => {
    let module: TestingModule;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [CommonAppModule, CachingModule],
            providers: [
                FarmFactoryService,
                FarmAbiFactory,
                {
                    provide: FarmCustomAbiService,
                    useClass: FarmAbiServiceMock,
                },
                FarmAbiServiceProviderV1_2,
                FarmAbiServiceProviderV1_3,
                {
                    provide: FarmAbiServiceV2,
                    useClass: FarmAbiServiceMock,
                },
                {
                    provide: FarmAbiServiceV2,
                    useClass: FarmAbiServiceMock,
                },
                FarmCustomService,
                FarmServiceV1_2,
                FarmServiceV1_3,
                FarmServiceV2,
                FarmCustomComputeService,
                FarmComputeServiceV1_2,
                FarmComputeServiceV1_3,
                FarmComputeServiceV2,
                MXApiServiceProvider,
                ContextGetterServiceProvider,
                RouterAbiServiceProvider,
                TokenComputeService,
                TokenGetterServiceProvider,
                PairService,
                PairAbiServiceProvider,
                PairComputeServiceProvider,
                WrapAbiServiceProvider,
                WeekTimekeepingComputeService,
                WeekTimekeepingAbiServiceProvider,
                WeeklyRewardsSplittingAbiServiceProvider,
                WeeklyRewardsSplittingComputeService,
                ProgressComputeService,
                EnergyAbiServiceProvider,
                EnergyComputeService,
                MXDataApiServiceProvider,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const serviceV1_2 = module.get<FarmServiceV1_2>(FarmServiceV1_2);
        expect(serviceV1_2).toBeDefined();
    });

    it('should get rewards with locked rewards', async () => {
        const attributes =
            'AAAABwc+9Mqu1tkAAAAAAAAAAQAAAAAAAAABAgEAAAAIiscjBInoAAAAAAAAAAAACQEVjkYJE9AAAA==';
        const identifier = 'MEXFARM-abcd-01';
        const liquidity = '2000000000000000000';

        const serviceV1_2 = module.get<FarmServiceV1_2>(FarmServiceV1_2);

        const rewards = await serviceV1_2.getRewardsForPosition({
            farmAddress:
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
            identifier: identifier,
            attributes: attributes,
            liquidity: liquidity,
            vmQuery: true,
            user: Address.Zero().bech32(),
        });

        expect(rewards).toEqual(
            new RewardsModel({
                identifier: 'MEXFARM-abcd-01',
                remainingFarmingEpochs: 3,
                rewards: '1000000000000000000',
            }),
        );
    });

    it('should get farms', async () => {
        const factory = module.get<FarmFactoryService>(FarmFactoryService);
        const farms = factory.getFarms();
        expect(farms).toEqual([
            {
                address:
                    'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
                rewardType: undefined,
                version: 'v1.2',
            },
            {
                address: 'farm_address_2',
                rewardType: 'unlockedRewards',
                version: 'v1.3',
            },
            {
                address: 'farm_address_3',
                rewardType: 'lockedRewards',
                version: 'v1.3',
            },
            {
                address:
                    'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
                rewardType: 'customRewards',
                version: 'v1.3',
            },
        ]);
    });

    it('should check if farm token', async () => {
        const farmAbiFactory = module.get<FarmAbiFactory>(FarmAbiFactory);
        const isFarmToken_0 = await farmAbiFactory.isFarmToken(
            'TOK1TOK9LPStaked',
        );
        expect(isFarmToken_0).toEqual(false);

        const isFarmToken_1 = await farmAbiFactory.isFarmToken(
            'TOK1TOK4LPStaked',
        );
        expect(isFarmToken_1).toEqual(true);
    });

    it('should get farm address by farm token ID', async () => {
        const farmAbiFactory = module.get<FarmAbiFactory>(FarmAbiFactory);
        const farmAddress = await farmAbiFactory.getFarmAddressByFarmTokenID(
            'TOK1TOK4LPStaked',
        );
        expect(farmAddress).toEqual(
            'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
        );
    });

    it('should get batch rewards for position', async () => {
        const serviceV1_3 = module.get<FarmServiceV1_3>(FarmServiceV1_3);
        const batchRewardsForPosition =
            await serviceV1_3.getBatchRewardsForPosition([
                {
                    farmAddress:
                        'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
                    liquidity: '1000000000000000',
                    identifier: 'EGLDMEXFL-a329b6-0b',
                    attributes:
                        'AAAAAAAAAAAAAAQVAAAAAAAABBUAAAAIEW8LcTY8qMwAAAAAAAAACBFvC3E2PKjM',
                    vmQuery: false,
                    user: Address.Zero().bech32(),
                },
            ]);

        expect(batchRewardsForPosition).toEqual([
            new RewardsModel({
                identifier: 'EGLDMEXFL-a329b6-0b',
                remainingFarmingEpochs: 1047,
                rewards: '110000000000000000100000000000',
            }),
        ]);
    });

    it('should get tokens for exit farm', async () => {
        const serviceV1_3 = module.get<FarmServiceV1_3>(FarmServiceV1_3);
        const tokensForExitFarm = await serviceV1_3.getTokensForExitFarm({
            farmAddress:
                'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
            liquidity: '1000000000000000',
            identifier: 'EGLDMEXFL-a329b6-0b',
            attributes:
                'AAAAAAAAAAAAAAQVAAAAAAAABBUAAAAIEW8LcTY8qMwAAAAAAAAACBFvC3E2PKjM',
            vmQuery: false,
            user: Address.Zero().bech32(),
        });
        expect(tokensForExitFarm).toEqual({
            farmingTokens: '999000000000000',
            rewards: '110000000000000000100000000000',
        });
    });

    it('should get tokens for exit farm', async () => {
        const serviceV1_3 = module.get<FarmServiceV1_3>(FarmServiceV1_3);
        const tokensForExitFarm = serviceV1_3.decodeFarmTokenAttributes(
            'EGLDMEXFL-a329b6-0b',
            'AAAAAAAAAAAAAAQVAAAAAAAABBUAAAAIEW8LcTY8qMwAAAAAAAAACBFvC3E2PKjM',
        );
        expect(tokensForExitFarm).toEqual({
            attributes:
                'AAAAAAAAAAAAAAQVAAAAAAAABBUAAAAIEW8LcTY8qMwAAAAAAAAACBFvC3E2PKjM',
            compoundedReward: '0',
            currentFarmAmount: '1256235401928812748',
            enteringEpoch: 1045,
            identifier: 'EGLDMEXFL-a329b6-0b',
            initialFarmingAmount: '1256235401928812748',
            originalEnteringEpoch: 1045,
            rewardPerShare: '0',
        });
    });
});
