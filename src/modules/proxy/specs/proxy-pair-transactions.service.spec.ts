import { Test, TestingModule } from '@nestjs/testing';
import { WrapService } from '../../wrapping/wrap.service';
import winston from 'winston';
import {
    utilities as nestWinstonModuleUtilities,
    WinstonModule,
} from 'nest-winston';
import * as Transport from 'winston-transport';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';
import { TransactionsProxyPairService } from '../services/proxy-pair/proxy-pair-transactions.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { WrapServiceMock } from 'src/modules/wrapping/wrap.test-mocks';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { PairGetterServiceStub } from 'src/modules/pair/mocks/pair-getter-service-stub.service';
import { Address } from '@elrondnetwork/erdjs/out';
import { TransactionsWrapService } from 'src/modules/wrapping/transactions-wrap.service';
import { ProxyGetterServiceMock } from '../mocks/proxy.getter.service.mock';
import { ProxyPairGetterService } from '../services/proxy-pair/proxy-pair.getter.service';
import { ProxyPairGetterServiceMock } from '../mocks/proxy.pair.getter.service.mock';
import { ProxyGetterService } from '../services/proxy.getter.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { ConfigService } from '@nestjs/config';
import { CachingModule } from 'src/services/caching/cache.module';
import { RouterGetterServiceProvider } from 'src/modules/router/mocks/routerGetterServiceStub';

describe('TransactionProxyPairService', () => {
    let service: TransactionsProxyPairService;
    let elrondProxy: ElrondProxyService;
    let pairGetterService: PairGetterService;

    const ProxyGetterServiceProvider = {
        provide: ProxyGetterService,
        useClass: ProxyGetterServiceMock,
    };

    const ProxyPairGetterServiceProvider = {
        provide: ProxyPairGetterService,
        useClass: ProxyPairGetterServiceMock,
    };

    const PairGetterServiceProvider = {
        provide: PairGetterService,
        useClass: PairGetterServiceStub,
    };

    const WrapServiceProvider = {
        provide: WrapService,
        useClass: WrapServiceMock,
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
                CachingModule,
                WinstonModule.forRoot({
                    transports: logTransports,
                }),
            ],
            providers: [
                ApiConfigService,
                ConfigService,
                ElrondProxyService,
                ProxyGetterServiceProvider,
                ProxyPairGetterServiceProvider,
                PairService,
                PairGetterServiceProvider,
                WrapServiceProvider,
                RouterGetterServiceProvider,
                TransactionsWrapService,
                TransactionsProxyPairService,
            ],
        }).compile();

        service = module.get<TransactionsProxyPairService>(
            TransactionsProxyPairService,
        );
        elrondProxy = module.get<ElrondProxyService>(ElrondProxyService);
        pairGetterService = module.get<PairGetterService>(PairGetterService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get add liquidity batch transaction EGLD first token', async () => {
        const firstTokenAmount = '10';
        const secondTokenAmount = '9';
        jest.spyOn(elrondProxy, 'getAddressShardID').mockImplementation(
            async () => 0,
        );
        jest.spyOn(pairGetterService, 'getFirstTokenID').mockImplementation(
            async () => 'TOK1-1111',
        );
        jest.spyOn(pairGetterService, 'getSecondTokenID').mockImplementation(
            async () => 'TOK2-2222',
        );
        const liquidityBatchTransactions = await service.addLiquidityProxyBatch(
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            {
                pairAddress: Address.Zero().bech32(),
                tokens: [
                    {
                        tokenID: 'EGLD',
                        nonce: 0,
                        amount: firstTokenAmount,
                    },
                    {
                        tokenID: 'LKMEX-1234',
                        nonce: 1,
                        amount: secondTokenAmount,
                    },
                ],
                tolerance: 0.01,
            },
        );

        const [
            wrapEgldTransaction,
            addLiquidityProxy,
        ] = liquidityBatchTransactions;
        expect(wrapEgldTransaction.value).toEqual(firstTokenAmount);
        expect(addLiquidityProxy.data).toEqual(
            'TXVsdGlFU0RUTkZUVHJhbnNmZXJAMDAwMDAwMDAwMDAwMDAwMDA1MDAxZTJhMTQyOGRkMWUzYTUxNDZiMzk2MGQ5ZTBmNGE1MDM2OTkwNGVlNTQ4M0AwMkA1NDRmNGIzMTJkMzEzMTMxMzFAQDBhQDRjNGI0ZDQ1NTgyZDMxMzIzMzM0QDAxQDA5QDYxNjQ2NDRjNjk3MTc1Njk2NDY5NzQ3OTUwNzI2Zjc4NzlAMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMEAwOUAwOA==',
        );
    });

    it('should get add liquidity batch transaction EGLD second token', async () => {
        const firstTokenAmount = '10';
        const secondTokenAmount = '9';
        jest.spyOn(elrondProxy, 'getAddressShardID').mockImplementation(
            async () => 0,
        );
        jest.spyOn(pairGetterService, 'getFirstTokenID').mockImplementation(
            async () => 'TOK1-1111',
        );
        jest.spyOn(pairGetterService, 'getSecondTokenID').mockImplementation(
            async () => 'TOK2-2222',
        );
        const liquidityBatchTransactions = await service.addLiquidityProxyBatch(
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
            {
                pairAddress: Address.Zero().bech32(),
                tokens: [
                    {
                        tokenID: 'LKMEX-1234',
                        nonce: 1,
                        amount: firstTokenAmount,
                    },
                    {
                        tokenID: 'EGLD',
                        nonce: 0,
                        amount: secondTokenAmount,
                    },
                ],
                tolerance: 0.01,
            },
        );

        const [
            wrapEgldTransaction,
            addLiquidityProxy,
        ] = liquidityBatchTransactions;
        expect(wrapEgldTransaction.value).toEqual(secondTokenAmount);
        expect(addLiquidityProxy.data).toEqual(
            'TXVsdGlFU0RUTkZUVHJhbnNmZXJAMDAwMDAwMDAwMDAwMDAwMDA1MDAxZTJhMTQyOGRkMWUzYTUxNDZiMzk2MGQ5ZTBmNGE1MDM2OTkwNGVlNTQ4M0AwMkA1NDRmNGIzMTJkMzEzMTMxMzFAQDA5QDRjNGI0ZDQ1NTgyZDMxMzIzMzM0QDAxQDBhQDYxNjQ2NDRjNjk3MTc1Njk2NDY5NzQ3OTUwNzI2Zjc4NzlAMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMEAwOEAwOQ==',
        );
    });
});
