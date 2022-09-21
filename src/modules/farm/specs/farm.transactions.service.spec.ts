import { Test, TestingModule } from '@nestjs/testing';
import { PairService } from '../../pair/services/pair.service';
import { FarmService } from '../services/farm.service';
import { AbiFarmService } from '../services/abi-farm.service';
import { AbiFarmServiceMock } from '../mocks/abi.farm.service.mock';
import { CachingModule } from '../../../services/caching/cache.module';
import { FarmGetterService } from '../services/farm.getter.service';
import { FarmComputeService } from '../services/farm.compute.service';
import { FarmGetterServiceMock } from '../mocks/farm.getter.service.mock';
import { Address } from '@elrondnetwork/erdjs/out';
import { ApiConfigService } from '../../../helpers/api.config.service';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';
import { PairComputeService } from '../../pair/services/pair.compute.service';
import { PairGetterService } from '../../pair/services/pair.getter.service';
import { PairGetterServiceMock } from '../../pair/mocks/pair.getter.service.mock';
import { WrapService } from '../../wrapping/wrap.service';
import { WrapServiceMock } from '../../wrapping/wrap.test-mocks';
import { ContextGetterService } from '../../../services/context/context.getter.service';
import { ContextGetterServiceMock } from '../../../services/context/mocks/context.getter.service.mock';
import { TransactionsFarmService } from '../../farm/services/transactions-farm.service';
import { ElrondProxyServiceMock } from '../../../services/elrond-communication/elrond.proxy.service.mock';
import { ElrondApiService } from '../../../services/elrond-communication/elrond-api.service';
import { encodeTransactionData } from '../../../helpers/helpers';
import { elrondConfig, gasConfig } from '../../../config';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { RouterGetterServiceProvider } from 'src/modules/router/mocks/router.getter.service.mock';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';

describe('FarmService', () => {
    let service: TransactionsFarmService;

    const AbiFarmServiceProvider = {
        provide: AbiFarmService,
        useClass: AbiFarmServiceMock,
    };

    const FarmGetterServiceProvider = {
        provide: FarmGetterService,
        useClass: FarmGetterServiceMock,
    };

    const ContextGetterServiceProvider = {
        provide: ContextGetterService,
        useClass: ContextGetterServiceMock,
    };

    const PairGetterServiceProvider = {
        provide: PairGetterService,
        useClass: PairGetterServiceMock,
    };

    const WrapServiceProvider = {
        provide: WrapService,
        useClass: WrapServiceMock,
    };

    const ElrondProxyServiceProvider = {
        provide: ElrondProxyService,
        useClass: ElrondProxyServiceMock,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [CachingModule],
            providers: [
                AbiFarmServiceProvider,
                ApiConfigService,
                ElrondApiService,
                FarmGetterServiceProvider,
                FarmComputeService,
                ContextGetterServiceProvider,
                PairService,
                PairGetterServiceProvider,
                PairComputeService,
                TokenComputeService,
                TokenGetterServiceProvider,
                RouterGetterServiceProvider,
                WrapServiceProvider,
                ElrondProxyServiceProvider,
                TransactionsFarmService,
                FarmService,
            ],
        }).compile();

        service = module.get<TransactionsFarmService>(TransactionsFarmService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get enter farm transaction', async () => {
        const transaction = await service.enterFarm(Address.Zero().bech32(), {
            farmAddress:
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
            tokens: [
                { tokenID: 'TOK1TOK4LP', nonce: 0, amount: '1000000000000' },
            ],
            lockRewards: true,
        });
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.farms['v1.2'].enterFarm.default,
            data: encodeTransactionData(
                'MultiESDTNFTTransfer@erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye@01@TOK1TOK4LP@@1000000000000@enterFarmAndLockRewards',
            ),
            chainID: elrondConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get exit farm transaction', async () => {
        const transaction = await service.exitFarm(Address.Zero().bech32(), {
            farmAddress:
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
            farmTokenID: 'TOK1TOK4LPStaked',
            farmTokenNonce: 1,
            amount: '1000000000000',
            withPenalty: false,
            lockRewards: true,
        });
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit:
                gasConfig.farms['v1.2']['lockedRewards'].exitFarm.default +
                gasConfig.lockedAssetCreate,
            data: encodeTransactionData(
                'ESDTNFTTransfer@TOK1TOK4LPStaked@01@1000000000000@erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye@07311709943153914477',
            ),
            chainID: elrondConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get claim rewards transaction', async () => {
        const transaction = await service.claimRewards(
            Address.Zero().bech32(),
            {
                farmAddress:
                    'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
                farmTokenID: 'TOK1TOK4LPStaked',
                farmTokenNonce: 1,
                amount: '1000000000000',
                lockRewards: true,
            },
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit:
                gasConfig.farms['v1.2']['lockedRewards'].claimRewards +
                gasConfig.lockedAssetCreate,
            data: encodeTransactionData(
                'ESDTNFTTransfer@TOK1TOK4LPStaked@01@1000000000000@erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye@claimRewards',
            ),
            chainID: elrondConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get compound rewards transaction error', async () => {
        let error;
        try {
            const transaction = await service.compoundRewards(
                Address.Zero().bech32(),
                {
                    farmAddress:
                        'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
                    farmTokenID: 'farmTokenID',
                    farmTokenNonce: 1,
                    amount: '1000000000000',
                    lockRewards: true,
                },
            );
        } catch (err) {
            error = err;
        }
        expect(error).toBeDefined();
    });

    it('should get migrate to new farm transaction', async () => {
        const transaction = await service.migrateToNewFarm(
            Address.Zero().bech32(),
            {
                farmAddress:
                    'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
                farmTokenID: 'TOK1TOK4LPStaked',
                farmTokenNonce: 1,
                amount: '1000000000000',
                withPenalty: false,
                lockRewards: true,
            },
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.farms['v1.2'].migrateToNewFarm,
            data: encodeTransactionData(
                'ESDTNFTTransfer@TOK1TOK4LPStaked@01@1000000000000@erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye@migrateToNewFarm@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            ),
            chainID: elrondConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set farm migration config transaction', async () => {
        const transaction = await service.setFarmMigrationConfig({
            oldFarmAddress:
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
            oldFarmTokenID: 'TOK1TOK4LPStaked',
            newFarmAddress: Address.Zero().bech32(),
            newLockedFarmAddress: Address.Zero().bech32(),
        });
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.farms.admin.setFarmMigrationConfig,
            data: encodeTransactionData(
                'setFarmMigrationConfig@erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye@TOK1TOK4LPStaked@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu@erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            ),
            chainID: elrondConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get stop rewards and migrate Rps transaction', async () => {
        const transaction = await service.stopRewardsAndMigrateRps(
            'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.farms['v1.2'].stopRewards,
            data: encodeTransactionData('stopRewardsAndMigrateRps'),
            chainID: elrondConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get end produce rewards transaction', async () => {
        let error = null;
        try {
            await service.endProduceRewards(
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
            );
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();

        const transaction = await service.endProduceRewards(
            'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.farms.admin.end_produce_rewards,
            data: encodeTransactionData('end_produce_rewards'),
            chainID: elrondConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get start produce rewards transaction', async () => {
        let error = null;
        try {
            await service.startProduceRewards(
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
            );
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();

        const transaction = await service.startProduceRewards(
            'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.farms.admin.start_produce_rewards,
            data: encodeTransactionData('start_produce_rewards'),
            chainID: elrondConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set per block reward amount transaction', async () => {
        let error = null;
        try {
            await service.setPerBlockRewardAmount(
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
                '1000000000000',
            );
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();

        const transaction = await service.setPerBlockRewardAmount(
            'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
            '1000000000000',
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.farms.admin.setPerBlockRewardAmount,
            data: encodeTransactionData(
                'setPerBlockRewardAmount@1000000000000',
            ),
            chainID: elrondConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set penalty percent transaction', async () => {
        let error = null;
        try {
            await service.setPenaltyPercent(
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
                5,
            );
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();

        const transaction = await service.setPenaltyPercent(
            'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
            5,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.farms.admin.set_penalty_percent,
            data: encodeTransactionData('set_penalty_percent@05'),
            chainID: elrondConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set minimum farming epochs transaction', async () => {
        let error = null;
        try {
            await service.setMinimumFarmingEpochs(
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
                10,
            );
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();

        const transaction = await service.setMinimumFarmingEpochs(
            'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
            10,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.farms.admin.set_minimum_farming_epochs,
            data: encodeTransactionData('set_minimum_farming_epochs@10'),
            chainID: elrondConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set transfer exec gas limit transaction', async () => {
        let error = null;
        try {
            await service.setTransferExecGasLimit(
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
                100000000,
            );
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();

        const transaction = await service.setTransferExecGasLimit(
            'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
            100000000,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.farms.admin.set_transfer_exec_gas_limit,
            data: encodeTransactionData(
                'set_transfer_exec_gas_limit@0100000000',
            ),
            chainID: elrondConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set burn gas limit transaction', async () => {
        let error = null;
        try {
            await service.setBurnGasLimit(
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
                100000000,
            );
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();

        const transaction = await service.setBurnGasLimit(
            'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
            100000000,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.farms.admin.set_burn_gas_limit,
            data: encodeTransactionData('set_burn_gas_limit@0100000000'),
            chainID: elrondConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get pause transaction', async () => {
        let error = null;
        try {
            await service.pause(
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
            );
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();

        const transaction = await service.pause(
            'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.farms.admin.pause,
            data: encodeTransactionData('pause'),
            chainID: elrondConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get resume transaction', async () => {
        let error = null;
        try {
            await service.resume(
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
            );
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();

        const transaction = await service.resume(
            'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.farms.admin.resume,
            data: encodeTransactionData('resume'),
            chainID: elrondConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get register farm token transaction', async () => {
        let error = null;
        try {
            await service.registerFarmToken(
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
                'FarmingToken12',
                'T1T2-1234',
                18,
            );
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();

        const transaction = await service.registerFarmToken(
            'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
            'FarmingToken12',
            'T1T2-1234',
            18,
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.farms.admin.registerFarmToken,
            data: encodeTransactionData(
                'registerFarmToken@FarmingToken12@T1T2-1234@18',
            ),
            chainID: elrondConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get set local roles farm token transaction', async () => {
        let error = null;
        try {
            await service.setLocalRolesFarmToken(
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
            );
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();

        const transaction = await service.setLocalRolesFarmToken(
            'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.farms.admin.setLocalRolesFarmToken,
            data: encodeTransactionData('setLocalRolesFarmToken'),
            chainID: elrondConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });

    it('should get merge farm tokens transaction', async () => {
        let error = null;
        try {
            await service.mergeFarmTokens(
                Address.Zero().bech32(),
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
                [
                    {
                        tokenID: 'TOK1TOK4LPStaked',
                        nonce: 0,
                        amount: '1000000000000',
                    },
                    {
                        tokenID: 'TOK1TOK4LPStaked',
                        nonce: 0,
                        amount: '1000000000000',
                    },
                ],
            );
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();

        const transaction = await service.mergeFarmTokens(
            Address.Zero().bech32(),
            'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
            [
                {
                    tokenID: 'TOK1TOK4LPStaked',
                    nonce: 0,
                    amount: '1000000000000',
                },
                {
                    tokenID: 'TOK1TOK4LPStaked',
                    nonce: 0,
                    amount: '1000000000000',
                },
            ],
        );
        expect(transaction).toEqual({
            nonce: 0,
            value: '0',
            receiver:
                'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            gasPrice: 1000000000,
            gasLimit: gasConfig.farms.admin.mergeFarmTokensMultiplier * 2,
            data: encodeTransactionData(
                'MultiESDTNFTTransfer@erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u@02@TOK1TOK4LPStaked@@01000000000000@TOK1TOK4LPStaked@@01000000000000@mergeFarmTokens',
            ),
            chainID: elrondConfig.chainID,
            version: 1,
            options: undefined,
            signature: undefined,
        });
    });
});