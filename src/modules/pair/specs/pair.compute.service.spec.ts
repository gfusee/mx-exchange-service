import { Test, TestingModule } from '@nestjs/testing';
import { ContextService } from 'src/services/context/context.service';
import { WrapService } from 'src/modules/wrapping/wrap.service';
import { CommonAppModule } from 'src/common.app.module';
import { ContextServiceMock } from 'src/services/context/mocks/context.service.mock';
import { WrapServiceMock } from 'src/modules/wrapping/wrap.test-mocks';
import { PairGetterService } from '../services/pair.getter.service';
import { PairGetterServiceMock } from '../mocks/pair.getter.service.mock';
import { PairComputeService } from '../services/pair.compute.service';
import { PairService } from '../services/pair.service';
import { PriceFeedService } from 'src/services/price-feed/price-feed.service';
import { PriceFeedServiceMock } from 'src/services/price-feed/price.feed.service.mock';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';

describe('PairService', () => {
    let service: PairComputeService;

    const PairGetterServiceProvider = {
        provide: PairGetterService,
        useClass: PairGetterServiceMock,
    };

    const ContextServiceProvider = {
        provide: ContextService,
        useClass: ContextServiceMock,
    };

    const WrapServiceProvider = {
        provide: WrapService,
        useClass: WrapServiceMock,
    };

    const PriceFeedProvider = {
        provide: PriceFeedService,
        useClass: PriceFeedServiceMock,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [CommonAppModule],
            providers: [
                PairComputeService,
                PairService,
                PairGetterServiceProvider,
                ContextServiceProvider,
                WrapServiceProvider,
                PriceFeedProvider,
                TokenGetterServiceProvider,
                TokenComputeService,
            ],
        }).compile();

        service = module.get<PairComputeService>(PairComputeService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get lpToken Price in USD from pair', async () => {
        const lpTokenPriceUSD = await service.computeLpTokenPriceUSD(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
        );
        expect(lpTokenPriceUSD).toEqual('400');
    });
});
