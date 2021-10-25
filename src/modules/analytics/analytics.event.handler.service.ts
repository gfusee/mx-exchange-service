import { Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { awsConfig } from 'src/config';
import { AWSTimestreamQueryService } from 'src/services/aws/aws.timestream.query';
import { AWSTimestreamWriteService } from 'src/services/aws/aws.timestream.write';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { convertTokenToDecimal } from 'src/utils/token.converters';
import { Logger } from 'winston';
import { PairComputeService } from '../pair/services/pair.compute.service';
import { PairGetterService } from '../pair/services/pair.getter.service';
import { PairSetterService } from '../pair/services/pair.setter.service';
import { RouterComputeService } from '../router/router.compute.service';
import { RouterSetterService } from '../router/router.setter.service';
import { PAIR_EVENTS } from '../rabbitmq/entities/generic.types';
import {
    AddLiquidityEventType,
    SwapEventType,
} from '../rabbitmq/entities/pair/pair.types';
import { ContextService } from 'src/services/context/context.service';

@Injectable()
export class AnalyticsEventHandlerService {
    private invalidatedKeys = [];

    constructor(
        private readonly context: ContextService,
        private readonly pairGetterService: PairGetterService,
        private readonly pairSetterService: PairSetterService,
        private readonly pairComputeService: PairComputeService,
        private readonly routerSetterService: RouterSetterService,
        private readonly routerComputeService: RouterComputeService,
        private readonly awsTimestreamWrite: AWSTimestreamWriteService,
        private readonly awsTimestreamQuery: AWSTimestreamQueryService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async handleAddLiquidityEvent(
        event: AddLiquidityEventType,
        eventType: string,
    ): Promise<void> {
        await this.updatePairLockedValueUSD(event.address);
        const [
            firstToken,
            secondtoken,
            firstTokenPriceUSD,
            secondTokenPriceUSD,
            firstTokenLockedValueUSD,
            secondTokenLockedValueUSD,
            pairLockedValueUSD,
        ] = await Promise.all([
            this.pairGetterService.getFirstToken(event.address),
            this.pairGetterService.getSecondToken(event.address),
            this.pairGetterService.getFirstTokenPriceUSD(event.address),
            this.pairGetterService.getSecondTokenPriceUSD(event.address),
            this.pairGetterService.getFirstTokenLockedValueUSD(event.address),
            this.pairGetterService.getSecondTokenLockedValueUSD(event.address),
            this.pairGetterService.getLockedValueUSD(event.address),
        ]);

        const totalLockedValueUSD = await this.awsTimestreamQuery.getLatestValue(
            {
                table: awsConfig.timestream.tableName,
                series: 'factory',
                metric: 'totalLockedValueUSD',
            },
        );

        const [firstAmountDenom, secondAmountDenom] = [
            convertTokenToDecimal(
                event.firstTokenAmount.amount,
                firstToken.decimals,
            ),
            convertTokenToDecimal(
                event.secondTokenAmount.amount,
                secondtoken.decimals,
            ),
        ];
        const [firstAmountUSD, secondAmountUSD] = [
            firstAmountDenom.multipliedBy(firstTokenPriceUSD),
            secondAmountDenom.multipliedBy(secondTokenPriceUSD),
        ];
        const lockedAmountUSD = firstAmountUSD.plus(secondAmountUSD);

        const newTotalLockedValueUSD =
            eventType === PAIR_EVENTS.ADD_LIQUIDITY
                ? new BigNumber(totalLockedValueUSD).plus(lockedAmountUSD)
                : new BigNumber(totalLockedValueUSD).minus(lockedAmountUSD);
        const data = [];

        data['factory'] = {
            totalLockedValueUSD: newTotalLockedValueUSD.toFixed(),
        };
        data[event.address] = {
            firstTokenLocked: event.pairReserves[0].amount,
            firstTokenLockedValueUSD: firstTokenLockedValueUSD,
            secondTokenLocked: event.pairReserves[1].amount,
            secondTokenLockedValueUSD: secondTokenLockedValueUSD,
            lockedValueUSD: pairLockedValueUSD,
            liquidity: event.liquidityPoolSupply,
        };
        data[event.firstTokenAmount.tokenID] = await this.getTokenLiquidityData(
            event.address,
            event.firstTokenAmount.tokenID,
            event.firstTokenAmount.amount,
            eventType,
        );
        data[
            event.secondTokenAmount.tokenID
        ] = await this.getTokenLiquidityData(
            event.address,
            event.secondTokenAmount.tokenID,
            event.secondTokenAmount.amount,
            eventType,
        );

        await this.awsTimestreamWrite.ingest({
            TableName: awsConfig.timestream.tableName,
            data,
        });

        this.invalidatedKeys.push(
            this.routerSetterService.setTotalLockedValueUSD(
                newTotalLockedValueUSD.toFixed(),
            ),
        );
        this.deleteCacheKeys();
    }

    async handleSwapEvents(event: SwapEventType): Promise<void> {
        await this.updatePairPrices(event.address);
        await this.updatePairLockedValueUSD(event.address);

        const [
            firstTokenID,
            secondTokenID,
            tokenIn,
            tokenOut,
            tokenInPriceUSD,
            tokenOutPriceUSD,
            firstTokenLockedValueUSD,
            secondTokenLockedValueUSD,
            totalFeePercent,
        ] = await Promise.all([
            this.pairGetterService.getFirstTokenID(event.address),
            this.pairGetterService.getSecondTokenID(event.address),
            this.context.getTokenMetadata(event.tokenAmountIn.tokenID),
            this.context.getTokenMetadata(event.tokenAmountOut.tokenID),
            this.pairGetterService.getTokenPriceUSD(
                event.address,
                event.tokenAmountIn.tokenID,
            ),
            this.pairGetterService.getTokenPriceUSD(
                event.address,
                event.tokenAmountOut.tokenID,
            ),
            this.pairGetterService.getFirstTokenLockedValueUSD(event.address),
            this.pairGetterService.getSecondTokenLockedValueUSD(event.address),
            this.pairGetterService.getTotalFeePercent(event.address),
        ]);

        const totalLockedValueUSD = await this.awsTimestreamQuery.getLatestValue(
            {
                table: awsConfig.timestream.tableName,
                series: 'factory',
                metric: 'totalLockedValueUSD',
            },
        );

        const [tokenInAmountDenom, tokenOutAmountDenom] = [
            convertTokenToDecimal(event.tokenAmountIn.amount, tokenIn.decimals),
            convertTokenToDecimal(
                event.tokenAmountOut.amount,
                tokenOut.decimals,
            ),
        ];

        const [tokenInAmountUSD, tokenOutAmountUSD] = [
            tokenInAmountDenom.times(tokenInPriceUSD),
            tokenOutAmountDenom.times(tokenOutPriceUSD),
        ];

        const volumeUSD = tokenInAmountUSD.plus(tokenOutAmountUSD).dividedBy(2);
        const feesUSD = tokenInAmountUSD.times(totalFeePercent);

        const data = [];
        data[event.address] = {
            firstTokenLocked: event.pairReserves[0].amount,
            firstTokenLockedValueUSD: firstTokenLockedValueUSD,
            secondTokenLocked: event.pairReserves[1].amount,
            secondTokenLockedValueUSD: secondTokenLockedValueUSD,
            firstTokenVolume:
                firstTokenID === tokenIn.identifier
                    ? event.tokenAmountIn.amount
                    : event.tokenAmountOut.amount,
            secondTokenVolume:
                secondTokenID === tokenOut.identifier
                    ? event.tokenAmountOut.amount
                    : event.tokenAmountIn.amount,
            volumeUSD: volumeUSD,
            feesUSD: feesUSD,
        };

        data[event.tokenAmountIn.tokenID] = await this.getTokenSwapData(
            event.address,
            event.tokenAmountIn.tokenID,
            event.tokenAmountIn.amount,
        );
        data[event.tokenAmountOut.tokenID] = await this.getTokenSwapData(
            event.address,
            event.tokenAmountOut.tokenID,
            event.tokenAmountOut.amount,
        );

        data['factory'] = {
            totalLockedValueUSD: new BigNumber(totalLockedValueUSD)
                .plus(tokenInAmountUSD)
                .minus(tokenOutAmountUSD)
                .toFixed(),
        };

        await this.awsTimestreamWrite.ingest({
            TableName: awsConfig.timestream.tableName,
            data,
        });

        const [
            firstTokenVolume24h,
            secondTokenVolume24h,
            volumeUSD24h,
            feesUSD24h,
            totalVolumeUSD24h,
            totalFeesUSD24h,
        ] = await Promise.all([
            this.awsTimestreamQuery.getAgregatedValue({
                table: awsConfig.timestream.tableName,
                series: event.address,
                metric: 'firstTokenVolume',
                time: '24h',
            }),
            this.awsTimestreamQuery.getAgregatedValue({
                table: awsConfig.timestream.tableName,
                series: event.address,
                metric: 'secondTokenVolume',
                time: '24h',
            }),
            this.awsTimestreamQuery.getAgregatedValue({
                table: awsConfig.timestream.tableName,
                series: event.address,
                metric: 'volumeUSD',
                time: '24h',
            }),
            this.awsTimestreamQuery.getAgregatedValue({
                table: awsConfig.timestream.tableName,
                series: event.address,
                metric: 'feesUSD',
                time: '24h',
            }),
            this.routerComputeService.computeTotalVolumeUSD('24h'),
            this.routerComputeService.computeTotalFeesUSD('24h'),
        ]);

        const cacheKeys = await Promise.all([
            this.pairSetterService.setFirstTokenVolume(
                event.address,
                firstTokenVolume24h,
                '24h',
            ),
            this.pairSetterService.setSecondTokenVolume(
                event.address,
                secondTokenVolume24h,
                '24h',
            ),
            this.pairSetterService.setVolumeUSD(
                event.address,
                volumeUSD24h,
                '24h',
            ),
            this.pairSetterService.setFeesUSD(event.address, feesUSD24h, '24h'),
            this.routerSetterService.setTotalVolumeUSD(
                totalVolumeUSD24h.toFixed(),
                '24h',
            ),
            this.routerSetterService.setTotalFeesUSD(
                totalFeesUSD24h.toFixed(),
                '24h',
            ),
        ]);
        this.invalidatedKeys.push(cacheKeys);
        await this.deleteCacheKeys();
    }

    private async updatePairLockedValueUSD(pairAddress: string): Promise<void> {
        const [
            firstTokenLockedValueUSD,
            secondTokenLockedValueUSD,
            pairLockedValueUSD,
        ] = await Promise.all([
            this.pairComputeService.computeFirstTokenLockedValueUSD(
                pairAddress,
            ),
            this.pairComputeService.computeSecondTokenLockedValueUSD(
                pairAddress,
            ),
            this.pairComputeService.computeLockedValueUSD(pairAddress),
        ]);
        const cacheKeys = await Promise.all([
            this.pairSetterService.setFirstTokenLockedValueUSD(
                pairAddress,
                firstTokenLockedValueUSD.toFixed(),
            ),
            this.pairSetterService.setSecondTokenLockedValueUSD(
                pairAddress,
                secondTokenLockedValueUSD.toFixed(),
            ),
            this.pairSetterService.setLockedValueUSD(
                pairAddress,
                pairLockedValueUSD.toFixed(),
            ),
        ]);
        this.invalidatedKeys.push(cacheKeys);
        await this.deleteCacheKeys();
    }

    private async updatePairPrices(pairAddress: string): Promise<void> {
        const [firstTokenID, secondTokenID] = await Promise.all([
            this.pairGetterService.getFirstTokenID(pairAddress),
            this.pairGetterService.getSecondTokenID(pairAddress),
        ]);
        const [
            firstTokenPrice,
            secondTokenPrice,
            firstTokenPriceUSD,
            secondTokenPriceUSD,
            lpTokenPriceUSD,
        ] = await Promise.all([
            this.pairComputeService.computeFirstTokenPrice(pairAddress),
            this.pairComputeService.computeSecondTokenPrice(pairAddress),
            this.pairComputeService.computeTokenPriceUSD(firstTokenID),
            this.pairComputeService.computeTokenPriceUSD(secondTokenID),
            this.pairComputeService.computeLpTokenPriceUSD(pairAddress),
        ]);
        const cacheKeys = await Promise.all([
            this.pairSetterService.setFirstTokenPrice(
                pairAddress,
                firstTokenPrice,
            ),
            this.pairSetterService.setSecondTokenPrice(
                pairAddress,
                secondTokenPrice,
            ),
            this.pairSetterService.setFirstTokenPriceUSD(
                pairAddress,
                firstTokenPriceUSD.toFixed(),
            ),
            this.pairSetterService.setSecondTokenPriceUSD(
                pairAddress,
                secondTokenPriceUSD.toFixed(),
            ),
            this.pairSetterService.setLpTokenPriceUSD(
                pairAddress,
                lpTokenPriceUSD,
            ),
        ]);
        this.invalidatedKeys.push(cacheKeys);
        await this.deleteCacheKeys();
    }

    private async getTokenLiquidityData(
        pairAddress: string,
        tokenID: string,
        amount: string,
        eventType: string,
    ): Promise<any> {
        const [token, priceUSD, lockedValue] = await Promise.all([
            this.context.getTokenMetadata(tokenID),
            this.pairGetterService.getTokenPriceUSD(pairAddress, tokenID),
            this.awsTimestreamQuery.getLatestValue({
                table: awsConfig.timestream.tableName,
                series: tokenID,
                metric: 'lockedValue',
            }),
        ]);
        const newLockedValue =
            eventType === PAIR_EVENTS.ADD_LIQUIDITY
                ? new BigNumber(lockedValue).plus(amount)
                : new BigNumber(lockedValue).minus(amount);
        const lockedValueDenom = convertTokenToDecimal(
            newLockedValue.toFixed(),
            token.decimals,
        );
        return {
            lockedValue: newLockedValue.toFixed(),
            lockedValueUSD: lockedValueDenom.times(priceUSD).toFixed(),
        };
    }

    private async getTokenSwapData(
        pairAddress: string,
        tokenID: string,
        amount: string,
    ): Promise<any> {
        const [token, priceUSD, latestLockedValue] = await Promise.all([
            this.context.getTokenMetadata(tokenID),
            this.pairGetterService.getTokenPriceUSD(pairAddress, tokenID),
            this.awsTimestreamQuery.getLatestValue({
                table: awsConfig.timestream.tableName,
                series: tokenID,
                metric: 'lockedValue',
            }),
        ]);
        return {
            lockedValue: new BigNumber(latestLockedValue)
                .minus(amount)
                .toFixed(),
            lockedValueUSD: convertTokenToDecimal(
                new BigNumber(latestLockedValue).minus(amount).toFixed(),
                token.decimals,
            )
                .times(priceUSD)
                .toFixed(),
            priceUSD: priceUSD,
            volume: amount,
            volumeUSD: convertTokenToDecimal(amount, token.decimals)
                .times(priceUSD)
                .toFixed(),
        };
    }

    private async deleteCacheKeys() {
        await this.pubSub.publish('deleteCacheKeys', this.invalidatedKeys);
        this.invalidatedKeys = [];
    }
}
