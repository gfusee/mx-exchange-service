import { Test, TestingModule } from '@nestjs/testing';
import { PairService } from '../../pair/services/pair.service';
import { AbiFarmServiceProvider } from '../mocks/abi.farm.service.mock';
import { ElrondApiService } from '../../../services/elrond-communication/elrond-api.service';
import { ElrondApiServiceMock } from '../../../services/elrond-communication/elrond.api.service.mock';
import { CommonAppModule } from '../../../common.app.module';
import { CachingModule } from '../../../services/caching/cache.module';
import { FarmComputeService } from '../base-module/services/farm.compute.service';
import { FarmGetterServiceProvider } from '../mocks/farm.getter.service.mock';
import { PairGetterService } from '../../../modules/pair/services/pair.getter.service';
import { PairGetterServiceStub } from '../../pair/mocks/pair-getter-service-stub.service';
import { PairComputeService } from '../../../modules/pair/services/pair.compute.service';
import { ContextGetterService } from '../../../services/context/context.getter.service';
import { ContextGetterServiceMock } from '../../../services/context/mocks/context.getter.service.mock';
import { WrapService } from '../../wrapping/wrap.service';
import { WrapServiceMock } from '../../wrapping/wrap.test-mocks';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { RouterGetterServiceProvider } from 'src/modules/router/mocks/router.getter.service.stub';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';
import { FarmComputeServiceV1_2 } from '../v1.2/services/farm.v1.2.compute.service';
import { FarmGetterServiceV1_2 } from '../v1.2/services/farm.v1.2.getter.service';
import { FarmGetterServiceMockV1_2 } from '../mocks/farm.v1.2.getter.service.mock';

describe('FarmService', () => {
    let service: FarmComputeServiceV1_2;

    const ElrondApiServiceProvider = {
        provide: ElrondApiService,
        useClass: ElrondApiServiceMock,
    };

    const ContextGetterServiceProvider = {
        provide: ContextGetterService,
        useClass: ContextGetterServiceMock,
    };

    const PairGetterServiceProvider = {
        provide: PairGetterService,
        useClass: PairGetterServiceStub,
    };

    const WrapServiceProvider = {
        provide: WrapService,
        useClass: WrapServiceMock,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [CommonAppModule, CachingModule],
            providers: [
                AbiFarmServiceProvider,
                {
                    provide: FarmGetterServiceV1_2,
                    useClass: FarmGetterServiceMockV1_2,
                },
                ElrondApiServiceProvider,
                ContextGetterServiceProvider,
                PairService,
                PairGetterServiceProvider,
                PairComputeService,
                TokenGetterServiceProvider,
                TokenComputeService,
                RouterGetterServiceProvider,
                WrapServiceProvider,
                FarmComputeServiceV1_2,
            ],
        }).compile();

        service = module.get<FarmComputeServiceV1_2>(FarmComputeServiceV1_2);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should compute farmed token price USD', async () => {
        const farmedTokenPriceUSD = await service.computeFarmedTokenPriceUSD(
            'farm_address_2',
        );
        expect(farmedTokenPriceUSD).toEqual('10');
    });

    it('should compute farming token price USD', async () => {
        const farmingTokenPriceUSD = await service.computeFarmingTokenPriceUSD(
            'farm_address_2',
        );
        expect(farmingTokenPriceUSD).toEqual('40');
    });

    it('should compute farm rewards for position', async () => {
        const farmRewardsForPosition =
            await service.computeFarmRewardsForPosition(
                'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
                '100000000000000000000000000000',
                '100',
            );
        expect(farmRewardsForPosition.toFixed()).toEqual(
            '18333333333333333333333000',
        );
    });

    it('should compute anual rewards USD', async () => {
        const anualRewardsUSD = await service.computeAnualRewardsUSD(
            'erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye',
        );
        expect(anualRewardsUSD).toEqual('2102400000');
    });
});
