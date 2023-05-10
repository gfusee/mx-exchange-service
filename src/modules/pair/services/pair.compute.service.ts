import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { constantsConfig } from 'src/config';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { MXDataApiService } from 'src/services/multiversx-communication/mx.data.api.service';
import { leastType } from 'src/utils/token.type.compare';
import { PairGetterService } from './pair.getter.service';
import { PairService } from './pair.service';

@Injectable()
export class PairComputeService {
    constructor(
        @Inject(forwardRef(() => PairGetterService))
        private readonly pairGetterService: PairGetterService,
        @Inject(forwardRef(() => PairService))
        private readonly pairService: PairService,
        @Inject(forwardRef(() => TokenGetterService))
        private readonly tokenGetter: TokenGetterService,
        @Inject(forwardRef(() => TokenComputeService))
        private readonly tokenCompute: TokenComputeService,
        private readonly dataApi: MXDataApiService,
    ) {}

    async computeFirstTokenPrice(pairAddress: string): Promise<string> {
        const [firstToken, secondToken] = await Promise.all([
            this.pairGetterService.getFirstToken(pairAddress),
            this.pairGetterService.getSecondToken(pairAddress),
        ]);

        const firstTokenPrice =
            await this.pairService.getEquivalentForLiquidity(
                pairAddress,
                firstToken.identifier,
                new BigNumber(`1e${firstToken.decimals}`).toFixed(),
            );
        return firstTokenPrice
            .multipliedBy(`1e-${secondToken.decimals}`)
            .toFixed();
    }

    async computeSecondTokenPrice(pairAddress: string): Promise<string> {
        const [firstToken, secondToken] = await Promise.all([
            this.pairGetterService.getFirstToken(pairAddress),
            this.pairGetterService.getSecondToken(pairAddress),
        ]);

        const secondTokenPrice =
            await this.pairService.getEquivalentForLiquidity(
                pairAddress,
                secondToken.identifier,
                new BigNumber(`1e${secondToken.decimals}`).toFixed(),
            );
        return secondTokenPrice
            .multipliedBy(`1e-${firstToken.decimals}`)
            .toFixed();
    }

    async computeLpTokenPriceUSD(pairAddress: string): Promise<string> {
        const [firstToken, secondToken, lpToken, firstTokenPriceUSD, secondTokenPriceUSD] = await Promise.all([
            this.pairGetterService.getFirstToken(pairAddress),
            this.pairGetterService.getSecondToken(pairAddress),
            this.pairGetterService.getLpToken(pairAddress),
            this.pairGetterService.getFirstTokenPriceUSD(pairAddress),
            this.pairGetterService.getSecondTokenPriceUSD(pairAddress)
        ]);

        if (lpToken === undefined) {
            return undefined;
        }

        const lpPosition = await this.pairService.getLiquidityPosition(
            pairAddress,
            new BigNumber(`1e${lpToken.decimals}`).toFixed(),
        )

        const firstTokenDenom = new BigNumber(10).pow(firstToken.decimals);
        const secondTokenDenom = new BigNumber(10).pow(secondToken.decimals);

        return new BigNumber(lpPosition.firstTokenAmount)
            .div(firstTokenDenom)
            .times(firstTokenPriceUSD)
            .plus(
                new BigNumber(lpPosition.secondTokenAmount)
                    .div(secondTokenDenom)
                    .times(secondTokenPriceUSD)
            )
            .toFixed();
    }

    async computeFirstTokenPriceUSD(pairAddress: string): Promise<string> {
        const [firstTokenID, secondTokenID] = await Promise.all([
            this.pairGetterService.getFirstTokenID(pairAddress),
            this.pairGetterService.getSecondTokenID(pairAddress),
        ]);

        if (firstTokenID === constantsConfig.USDC_TOKEN_ID) {
            const usdcPrice = await this.dataApi.getTokenPrice('USDC');
            return usdcPrice.toFixed();
        }

        if (secondTokenID === constantsConfig.USDC_TOKEN_ID) {
            const [tokenPrice, usdcPrice] = await Promise.all([
                this.computeFirstTokenPrice(pairAddress),
                this.dataApi.getTokenPrice('USDC'),
            ]);
            return new BigNumber(tokenPrice).times(usdcPrice).toFixed();
        }

        return await this.tokenCompute.computeTokenPriceDerivedUSD(
            firstTokenID,
        );
    }

    async computeSecondTokenPriceUSD(pairAddress: string): Promise<string> {
        const [firstTokenID, secondTokenID] = await Promise.all([
            this.pairGetterService.getFirstTokenID(pairAddress),
            this.pairGetterService.getSecondTokenID(pairAddress),
        ]);

        if (secondTokenID === constantsConfig.USDC_TOKEN_ID) {
            const usdcPrice = await this.dataApi.getTokenPrice('USDC');
            return usdcPrice.toString();
        }

        if (firstTokenID === constantsConfig.USDC_TOKEN_ID) {
            const [tokenPrice, usdcPrice] = await Promise.all([
                this.computeSecondTokenPrice(pairAddress),
                this.dataApi.getTokenPrice('USDC'),
            ]);
            return new BigNumber(tokenPrice).times(usdcPrice).toFixed();
        }

        return await this.tokenCompute.computeTokenPriceDerivedUSD(
            secondTokenID,
        );
    }

    async computeFirstTokenLockedValueUSD(
        pairAddress: string,
    ): Promise<BigNumber> {
        const [firstToken, firstTokenPriceUSD, firstTokenReserve] =
            await Promise.all([
                this.pairGetterService.getFirstToken(pairAddress),
                this.pairGetterService.getFirstTokenPriceUSD(pairAddress),
                this.pairGetterService.getFirstTokenReserve(pairAddress),
            ]);

        return new BigNumber(firstTokenReserve)
            .multipliedBy(`1e-${firstToken.decimals}`)
            .multipliedBy(firstTokenPriceUSD);
    }

    async computeSecondTokenLockedValueUSD(
        pairAddress: string,
    ): Promise<BigNumber> {
        const [secondToken, secondTokenPriceUSD, secondTokenReserve] =
            await Promise.all([
                this.pairGetterService.getSecondToken(pairAddress),
                this.pairGetterService.getSecondTokenPriceUSD(pairAddress),
                this.pairGetterService.getSecondTokenReserve(pairAddress),
            ]);

        return new BigNumber(secondTokenReserve)
            .multipliedBy(`1e-${secondToken.decimals}`)
            .multipliedBy(secondTokenPriceUSD);
    }

    async computeLockedValueUSD(pairAddress: string): Promise<BigNumber> {
        const [firstTokenLockedValueUSD, secondTokenLockedValueUSD] =
            await Promise.all([
                this.computeFirstTokenLockedValueUSD(pairAddress),
                this.computeSecondTokenLockedValueUSD(pairAddress),
            ]);

        return new BigNumber(firstTokenLockedValueUSD).plus(
            secondTokenLockedValueUSD,
        );
    }

    async computeFeesAPR(pairAddress: string): Promise<string> {
        const [fees24h, lockedValueUSD, specialFeePercent, totalFeesPercent] =
            await Promise.all([
                this.pairGetterService.getFeesUSD(pairAddress, '24h'),
                this.computeLockedValueUSD(pairAddress),
                this.pairGetterService.getSpecialFeePercent(pairAddress),
                this.pairGetterService.getTotalFeePercent(pairAddress),
            ]);

        const actualFees24hBig = new BigNumber(fees24h).multipliedBy(
            new BigNumber(totalFeesPercent - specialFeePercent).div(
                totalFeesPercent,
            ),
        );

        return actualFees24hBig.times(365).div(lockedValueUSD).toFixed();
    }

    async computeTypeFromTokens(pairAddress: string): Promise<string> {
        const [firstTokenID, secondTokenID] = await Promise.all([
            this.pairGetterService.getFirstTokenID(pairAddress),
            this.pairGetterService.getSecondTokenID(pairAddress),
        ]);

        const [firstTokenType, secondTokenType] = await Promise.all([
            this.tokenGetter.getEsdtTokenType(firstTokenID),
            this.tokenGetter.getEsdtTokenType(secondTokenID),
        ]);

        return leastType(firstTokenType, secondTokenType);
    }
}
