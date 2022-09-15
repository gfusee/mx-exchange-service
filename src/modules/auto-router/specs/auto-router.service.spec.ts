import { Test, TestingModule } from '@nestjs/testing';
import { AutoRouterService } from '../services/auto-router.service';
import { PairGetterServiceMock } from 'src/modules/pair/mocks/pair.getter.service.mock';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ContextGetterServiceMock } from 'src/services/context/mocks/context.getter.service.mock';
import { WrapService } from 'src/modules/wrapping/wrap.service';
import { WrapServiceMock } from 'src/modules/wrapping/wrap.test-mocks';
import winston from 'winston';
import {
    utilities as nestWinstonModuleUtilities,
    WinstonModule,
} from 'nest-winston';
import * as Transport from 'winston-transport';
import { AutoRouterComputeService } from '../services/auto-router.compute.service';
import { AutoRouterTransactionService } from '../services/auto-router.transactions.service';
import { PairTransactionService } from 'src/modules/pair/services/pair.transactions.service';
import { RouterGetterService } from 'src/modules/router/services/router.getter.service';
import { RouterGetterServiceMock } from 'src/modules/router/mocks/router.getter.service.mock';
import { CommonAppModule } from 'src/common.app.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { ElrondProxyServiceMock } from 'src/services/elrond-communication/elrond.proxy.service.mock';
import { PairService } from 'src/modules/pair/services/pair.service';
import { TransactionRouterService } from 'src/modules/router/services/transactions.router.service';
import { TransactionsWrapService } from 'src/modules/wrapping/transactions-wrap.service';
import { RouterService } from 'src/modules/router/services/router.service';
import { AutoRouteModel } from '../models/auto-route.model';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { Address } from '@elrondnetwork/erdjs/out';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { RemoteConfigGetterServiceMock } from 'src/modules/remote-config/mocks/remote-config.getter.mock';
import {
    AssetsModel,
    EsdtToken,
    RolesModel,
} from 'src/modules/tokens/models/esdtToken.model';
import { PairInfoModel } from 'src/modules/pair/models/pair-info.model';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';
import { Tokens } from 'src/modules/pair/mocks/pair.constants';
import { encodeTransactionData } from 'src/helpers/helpers';
import { gasConfig } from 'src/config';

describe('AutoRouterService', () => {
    let service: AutoRouterService;

    const ContextGetterServiceProvider = {
        provide: ContextGetterService,
        useClass: ContextGetterServiceMock,
    };

    const PairGetterServiceProvider = {
        provide: PairGetterService,
        useClass: PairGetterServiceMock,
    };

    const RouterGetterServiceProvider = {
        provide: RouterGetterService,
        useClass: RouterGetterServiceMock,
    };

    const WrapServiceProvider = {
        provide: WrapService,
        useClass: WrapServiceMock,
    };

    const ElrondProxyServiceProvider = {
        provide: ElrondProxyService,
        useClass: ElrondProxyServiceMock,
    };

    const RemoteConfigGetterServiceProvider = {
        provide: RemoteConfigGetterService,
        useClass: RemoteConfigGetterServiceMock,
    };

    const logTransports: Transport[] = [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp(),
                nestWinstonModuleUtilities.format.nestLike(),
            ),
        }),
    ];

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                WinstonModule.forRoot({
                    transports: logTransports,
                }),
                CommonAppModule,
                CachingModule,
            ],
            providers: [
                RouterService,
                RouterGetterServiceProvider,
                ContextGetterServiceProvider,
                ElrondProxyServiceProvider,
                TokenGetterServiceProvider,
                PairGetterServiceProvider,
                PairService,
                PairTransactionService,
                WrapServiceProvider,
                TransactionsWrapService,
                TransactionRouterService,
                RemoteConfigGetterServiceProvider,
                AutoRouterService,
                AutoRouterComputeService,
                AutoRouterTransactionService,
            ],
            exports: [],
        }).compile();

        service = module.get<AutoRouterService>(AutoRouterService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get swap data for simple swap with default inputs', async () => {
        const swap = await service.swap({
            tokenInID: 'USDC-1111',
            tokenOutID: 'TOK1-1111',
            tolerance: 0.01,
        });

        expect(swap).toEqual(
            new AutoRouteModel({
                swapType: 0,
                tokenInID: 'USDC-1111',
                tokenOutID: 'TOK1-1111',
                tokenInExchangeRate: '4960273038901078',
                tokenOutExchangeRate: '201601805416248751341',
                tokenInExchangeRateDenom: '0.004960273038901078',
                tokenOutExchangeRateDenom: '201.601805416248751341',
                tokenInPriceUSD: '1',
                tokenOutPriceUSD: '200',
                amountIn: '1000000000000000000',
                amountOut: '4960273038901078',
                intermediaryAmounts: [
                    '1000000000000000000',
                    '4960273038901078',
                ],
                tokenRoute: ['USDC-1111', 'TOK1-1111'],
                pairs: [
                    new PairModel({
                        address:
                            'erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx',
                        firstToken: Tokens('TOK1-1111'),
                        secondToken: Tokens('USDC-1111'),
                        info: new PairInfoModel({
                            reserves0: '1000000000000000000',
                            reserves1: '200000000000000000000',
                            totalSupply: '1000000000000000000',
                        }),
                        totalFeePercent: 0.003,
                    }),
                ],
                tolerance: 0.01,
                maxPriceDeviationPercent: 1,
                tokensPriceDeviationPercent: undefined,
            }),
        );
    });

    it('should get swap data for simple swap with amountIn', async () => {
        const swap = await service.swap({
            amountIn: '2000000000000000000',
            tokenInID: 'USDC-1111',
            tokenOutID: 'TOK1-1111',
            tolerance: 0.01,
        });
        expect(swap).toEqual(
            new AutoRouteModel({
                swapType: 0,
                tokenInID: 'USDC-1111',
                tokenOutID: 'TOK1-1111',
                tokenInExchangeRate: '4935790171985306',
                tokenOutExchangeRate: '202601805416248766526',
                tokenInExchangeRateDenom: '0.004935790171985306',
                tokenOutExchangeRateDenom: '202.601805416248766526',
                tokenInPriceUSD: '1',
                tokenOutPriceUSD: '200',
                amountIn: '2000000000000000000',
                amountOut: '9871580343970612',
                intermediaryAmounts: [
                    '2000000000000000000',
                    '9871580343970612',
                ],
                tokenRoute: ['USDC-1111', 'TOK1-1111'],
                pairs: [
                    new PairModel({
                        address:
                            'erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx',
                        firstToken: Tokens('TOK1-1111'),
                        secondToken: Tokens('USDC-1111'),
                        info: new PairInfoModel({
                            reserves0: '1000000000000000000',
                            reserves1: '200000000000000000000',
                            totalSupply: '1000000000000000000',
                        }),
                        totalFeePercent: 0.003,
                    }),
                ],
                tolerance: 0.01,
                maxPriceDeviationPercent: 1,
                tokensPriceDeviationPercent: undefined,
            }),
        );
    });

    it('should get swap data for multi swap with amountOut', async () => {
        const swap = await service.swap({
            amountOut: '500000000000000000',
            tokenInID: 'USDC-1111',
            tokenOutID: 'TOK2-2222',
            tolerance: 0.01,
        });

        expect(swap).toEqual(
            new AutoRouteModel({
                swapType: 1,
                tokenInID: 'USDC-1111',
                tokenOutID: 'TOK2-2222',
                tokenInExchangeRate: '4962567499999999',
                tokenOutExchangeRate: '201508594089652181902',
                tokenInExchangeRateDenom: '0.004962567499999999',
                tokenOutExchangeRateDenom: '201.508594089652181902',
                tokenInPriceUSD: '1',
                tokenOutPriceUSD: '100',
                amountIn: '101761840015274351860',
                amountOut: '500000000000000000',
                intermediaryAmounts: [
                    '100754297044826090951',
                    '334336342360414578',
                    '500000000000000000',
                ],
                tokenRoute: ['USDC-1111', 'TOK1-1111', 'TOK2-2222'],
                pairs: [
                    new PairModel({
                        address:
                            'erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx',
                        firstToken: Tokens('TOK1-1111'),
                        secondToken: Tokens('USDC-1111'),
                        info: new PairInfoModel({
                            reserves0: '1000000000000000000',
                            reserves1: '200000000000000000000',
                            totalSupply: '1000000000000000000',
                        }),
                        totalFeePercent: 0.003,
                    }),
                    new PairModel({
                        address:
                            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
                        firstToken: Tokens('TOK1-1111'),
                        secondToken: Tokens('TOK2-2222'),
                        info: new PairInfoModel({
                            reserves0: '1000000000000000000',
                            reserves1: '2000000000000000000',
                            totalSupply: '1000000000000000000',
                        }),
                        totalFeePercent: 0.003,
                    }),
                ],
                tolerance: 0.01,
                maxPriceDeviationPercent: 1,
                tokensPriceDeviationPercent: undefined,
            }),
        );
    });

    it('should get a wrap tx + a fixed input simple swap tx', async () => {
        const transactions = await service.getTransactions(
            Address.Zero().bech32(),
            new AutoRouteModel({
                swapType: 0,
                tokenInID: 'EGLD',
                tokenOutID: 'TOK1-1111',
                tokenInExchangeRate: '4960273038901078',
                tokenOutExchangeRate: '201601805416248751341',
                tokenInPriceUSD: '1',
                tokenOutPriceUSD: '200',
                amountIn: '1000000000000000000',
                amountOut: '4960273038901078',
                intermediaryAmounts: [
                    '1000000000000000000',
                    '4960273038901078',
                ],
                tokenRoute: ['USDC-1111', 'TOK1-1111'],
                pairs: [
                    new PairModel({
                        address:
                            'erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx',
                    }),
                ],
                tolerance: 0.01,
            }),
        );
        expect(transactions).toEqual([
            {
                nonce: 0,
                value: '1000000000000000000',
                receiver:
                    'erd1qqqqqqqqqqqqqpgqd77fnev2sthnczp2lnfx0y5jdycynjfhzzgq6p3rax',
                sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
                gasPrice: 1000000000,
                gasLimit: gasConfig.wrapeGLD,
                data: encodeTransactionData('wrapEgld'),
                chainID: 'T',
                version: 1,
                options: undefined,
                signature: undefined,
            },
            {
                nonce: 0,
                value: '0',
                receiver:
                    'erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx',
                sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
                gasPrice: 1000000000,
                gasLimit: gasConfig.pairs.swapTokensFixedInput.default,
                data: encodeTransactionData(
                    'ESDTTransfer@TOK1-1111@01000000000000000000@swapTokensFixedInput@TOK1-1111@4911161424654532',
                ),
                chainID: 'T',
                version: 1,
                options: undefined,
                signature: undefined,
            },
        ]);
    });

    it('should get a fixed output multi swap tx + unwrap tx', async () => {
        const transactions = await service.getTransactions(
            Address.Zero().bech32(),
            new AutoRouteModel({
                swapType: 1,
                tokenInID: 'USDC-1111',
                tokenOutID: 'EGLD',
                tokenInExchangeRate: '4962567499999999',
                tokenOutExchangeRate: '201508594089652181902',
                tokenInPriceUSD: '1',
                tokenOutPriceUSD: '100',
                amountIn: '101761840015274351860',
                amountOut: '500000000000000000',
                intermediaryAmounts: [
                    '503014183917413680',
                    '626881033727',
                    '500000000000000000',
                ],
                tokenRoute: ['USDC-1111', 'TOK1-1111', 'TOK2-2222'],
                pairs: [
                    new PairModel({
                        address:
                            'erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx',
                    }),
                    new PairModel({
                        address:
                            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
                    }),
                ],
                tolerance: 0.01,
            }),
        );
        expect(transactions).toEqual([
            {
                nonce: 0,
                value: '0',
                receiver:
                    'erd1qqqqqqqqqqqqqpgqpv09kfzry5y4sj05udcngesat07umyj70n4sa2c0rp',
                sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
                gasPrice: 1000000000,
                gasLimit: 2 * gasConfig.router.multiPairSwapMultiplier,
                data: encodeTransactionData(
                    'ESDTTransfer@USDC-1111@508044325756587816@multiPairSwap@erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx@swapTokensFixedOutput@TOK1-1111@630015438895@erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u@swapTokensFixedOutput@TOK2-2222@500000000000000000',
                ),
                chainID: 'T',
                version: 1,
                options: undefined,
                signature: undefined,
            },
            {
                nonce: 0,
                value: '0',
                receiver:
                    'erd1qqqqqqqqqqqqqpgqd77fnev2sthnczp2lnfx0y5jdycynjfhzzgq6p3rax',
                sender: 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
                gasPrice: 1000000000,
                gasLimit: gasConfig.wrapeGLD,
                data: encodeTransactionData(
                    'ESDTTransfer@TOK1-1111@500000000000000000@unwrapEgld',
                ),
                chainID: 'T',
                version: 1,
                options: undefined,
                signature: undefined,
            },
        ]);
    });
});
