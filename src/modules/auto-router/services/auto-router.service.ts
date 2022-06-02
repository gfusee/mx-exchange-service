import { Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ContextService } from 'src/services/context/context.service';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import {
    AutoRouterComputeService,
    BestSwapRoute,
    PRIORITY_MODES,
} from './auto-router.compute.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { elrondConfig } from 'src/config';
import { WrapService } from 'src/modules/wrapping/wrap.service';
import { AutoRouterArgs } from '../models/auto-router.args';
import { RouterGetterService } from '../../router/services/router.getter.service';
import { AutoRouteModel, SWAP_TYPE } from '../models/auto-route.model';
import { AutoRouterTransactionService } from './auto-router.transactions.service';
import { RouterService } from 'src/modules/router/services/router.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { PairTransactionService } from 'src/modules/pair/services/pair.transactions.service';
@Injectable()
export class AutoRouterService {
    constructor(
        private readonly routerGetterService: RouterGetterService,
        private readonly contextService: ContextService,
        private readonly contextGetterService: ContextGetterService,
        private readonly pairGetterService: PairGetterService,
        private readonly autoRouterComputeService: AutoRouterComputeService,
        private readonly autoRouterTransactionService: AutoRouterTransactionService,
        private readonly pairTransactionService: PairTransactionService,
        private readonly wrapService: WrapService,
        private readonly routerService: RouterService,
        private readonly pairService: PairService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async swap(args: AutoRouterArgs): Promise<AutoRouteModel> {
        this.validateSwapArgs(args);

        const wrappedEgldTokenID = await this.wrapService.getWrappedEgldTokenID();

        const tokenInID = this.toWrappedIfEGLD(
            args.tokenInID,
            wrappedEgldTokenID,
        );
        const tokenOutID = this.toWrappedIfEGLD(
            args.tokenOutID,
            wrappedEgldTokenID,
        );

        const [
            directPair,
            pairs,
            tokenInMetadata,
            tokenOutMetadata,
        ] = await Promise.all([
            this.routerService.getAllPairs(0, 1, {
                address: null,
                firstTokenID: tokenInID,
                secondTokenID: tokenOutID,
                issuedLpToken: true,
            })[0],
            this.getAllActivePairs(),
            this.contextGetterService.getTokenMetadata(tokenInID),
            this.contextGetterService.getTokenMetadata(tokenOutID),
        ]);

        args.amountIn = this.setDefaultAmountInIfNeeded(args, tokenInMetadata);
        const swapType = this.getSwapType(args.amountIn, args.amountOut);

        if (directPair) {
            return await this.singleSwap(
                args,
                tokenInID,
                tokenOutID,
                directPair,
                tokenInMetadata,
                tokenOutMetadata,
                swapType,
            );
        }

        return await this.multiSwap(
            args,
            tokenInID,
            tokenOutID,
            pairs,
            tokenInMetadata,
            tokenOutMetadata,
            swapType,
        );
    }

    async singleSwap(
        args: AutoRouterArgs,
        tokenInID: string,
        tokenOutID: string,
        pair: PairModel,
        tokenInMetadata: EsdtToken,
        tokenOutMetadata: EsdtToken,
        swapType: SWAP_TYPE,
    ): Promise<AutoRouteModel> {
        const [amount, tokenInPriceUSD, tokenOutPriceUSD] = await Promise.all([
            this.isFixedInput(swapType)
                ? this.pairService.getAmountOut(
                      pair.address,
                      tokenInID,
                      args.amountIn,
                  )
                : this.pairService.getAmountIn(
                      pair.address,
                      tokenOutID,
                      args.amountOut,
                  ),
            this.pairGetterService.getTokenPriceUSD(tokenInID),
            this.pairGetterService.getTokenPriceUSD(tokenOutID),
        ]);

        let [amountIn, amountOut] = this.isFixedInput(swapType)
            ? [args.amountIn, amount]
            : [amount, args.amountOut];

        const [
            tokenInExchangeRate,
            tokenOutExchangeRate,
        ] = this.calculateExchangeRate(
            tokenInMetadata.decimals,
            tokenOutMetadata.decimals,
            this.isFixedInput(swapType) ? args.amountIn : amount,
            this.isFixedInput(swapType) ? amount : args.amountOut,
        );

        if (!this.isFixedInput(swapType))
            amountIn = this.addTolerance(amountIn, args.tolerance);

        return new AutoRouteModel({
            swapType: swapType,
            tokenInID: args.tokenInID,
            tokenOutID: args.tokenOutID,
            tokenInExchangeRate: tokenInExchangeRate,
            tokenOutExchangeRate: tokenOutExchangeRate,
            tokenInPriceUSD: tokenInPriceUSD,
            tokenOutPriceUSD: tokenOutPriceUSD,
            amountIn: amountIn,
            amountOut: amountOut,
            intermediaryAmounts: [amountIn, amountOut],
            tokenRoute: [tokenInID, tokenOutID],
            pairs: [pair],
            tolerance: args.tolerance,
        });
    }

    async multiSwap(
        args: AutoRouterArgs,
        tokenInID: string,
        tokenOutID: string,
        pairs: PairModel[],
        tokenInMetadata: EsdtToken,
        tokenOutMetadata: EsdtToken,
        swapType: SWAP_TYPE,
    ): Promise<AutoRouteModel> {
        let swapRoute: BestSwapRoute;
        try {
            if (this.isFixedInput(swapType)) {
                swapRoute = await this.autoRouterComputeService.computeBestSwapRoute(
                    tokenInID,
                    tokenOutID,
                    pairs,
                    args.amountIn,
                    PRIORITY_MODES.maxOutput,
                );
            } else {
                swapRoute = await this.autoRouterComputeService.computeBestSwapRoute(
                    tokenOutID,
                    tokenInID,
                    pairs,
                    args.amountOut,
                    PRIORITY_MODES.minInput,
                );
            }
        } catch (error) {
            this.logger.error(
                'Error when computing the swap auto route.',
                error,
            );
            throw error;
        }

        const pairRoute = this.addressesToPairs(swapRoute.addressRoute);

        const [tokenInPriceUSD, tokenOutPriceUSD] = await Promise.all([
            this.pairGetterService.getTokenPriceUSD(tokenInID),
            this.pairGetterService.getTokenPriceUSD(tokenOutID),
        ]);

        const [
            tokenInExchangeRate,
            tokenOutExchangeRate,
        ] = this.calculateExchangeRate(
            tokenInMetadata.decimals,
            tokenOutMetadata.decimals,
            this.isFixedInput(swapType) ? args.amountIn : swapRoute.bestResult,
            this.isFixedInput(swapType) ? swapRoute.bestResult : args.amountOut,
        );

        return new AutoRouteModel({
            swapType: swapType,
            tokenInID: args.tokenInID,
            tokenOutID: args.tokenOutID,
            tokenInExchangeRate: tokenInExchangeRate,
            tokenOutExchangeRate: tokenOutExchangeRate,
            tokenInPriceUSD: tokenInPriceUSD,
            tokenOutPriceUSD: tokenOutPriceUSD,
            amountIn:
                args.amountIn ||
                this.addTolerance(swapRoute.bestResult, args.tolerance),
            amountOut: args.amountOut || swapRoute.bestResult,
            intermediaryAmounts: swapRoute.intermediaryAmounts,
            tokenRoute: swapRoute.tokenRoute,
            pairs: pairRoute,
            tolerance: args.tolerance,
        });
    }

    validateSwapArgs(args: AutoRouterArgs) {
        if (args.amountIn && args.amountOut)
            throw new Error("Can't have both amountIn & amountOut");
    }

    setDefaultAmountInIfNeeded(
        args: AutoRouterArgs,
        tokenInMetadata: EsdtToken,
    ): string {
        if (!args.amountOut && !args.amountIn) {
            return new BigNumber(10)
                .pow(tokenInMetadata.decimals)
                .integerValue()
                .toFixed();
        }

        return args.amountIn;
    }

    getSwapType(amountIn: string, amountOut: string): SWAP_TYPE {
        if (amountIn && amountOut)
            throw new Error("Can't have both fixedInput & fixedOutput");

        if (amountIn) return SWAP_TYPE.fixedInput;
        else if (amountOut) return SWAP_TYPE.fixedOutput;

        throw new Error("Can't get SWAP_TYPE");
    }

    isFixedInput(swapType: SWAP_TYPE): boolean {
        if (swapType === SWAP_TYPE.fixedInput) return true;
        return false;
    }

    addTolerance(amountIn: string, tolerance: number): string {
        return new BigNumber(amountIn)
            .plus(new BigNumber(amountIn).multipliedBy(tolerance))
            .integerValue()
            .toFixed();
    }

    private async getAllActivePairs() {
        const pairs: PairModel[] = [];

        const pairAddresses = await this.routerGetterService.getAllPairsAddress();
        for (const pairAddress of pairAddresses) {
            const [
                pairMetadata,
                pairInfo,
                pairTotalFeePercent,
                pairState,
            ] = await Promise.all([
                this.contextService.getPairMetadata(pairAddress),
                this.pairGetterService.getPairInfoMetadata(pairAddress),
                this.pairGetterService.getTotalFeePercent(pairAddress),
                this.pairGetterService.getState(pairAddress),
            ]);

            if (pairState === 'Active')
                pairs.push(
                    new PairModel({
                        address: pairMetadata.address,
                        firstToken: new EsdtToken({
                            identifier: pairMetadata.firstTokenID,
                        }),
                        secondToken: new EsdtToken({
                            identifier: pairMetadata.secondTokenID,
                        }),
                        info: pairInfo,
                        totalFeePercent: pairTotalFeePercent,
                    }),
                );
        }

        return pairs;
    }

    private toWrappedIfEGLD(tokenID: string, wrappedEgldTokenID: string) {
        return elrondConfig.EGLDIdentifier === tokenID
            ? wrappedEgldTokenID
            : tokenID;
    }

    private calculateExchangeRate(
        tokenInDecimals: number,
        tokenOutDecimals: number,
        amountIn: string,
        amountOut: string,
    ): string[] {
        const tokenInPrice = new BigNumber(10)
            .pow(tokenInDecimals)
            .multipliedBy(amountOut)
            .dividedBy(amountIn);
        const tokenOutPrice = new BigNumber(10)
            .pow(tokenOutDecimals)
            .multipliedBy(amountIn)
            .dividedBy(amountOut);
        return [
            tokenInPrice.integerValue().toFixed(),
            tokenOutPrice.integerValue().toFixed(),
        ];
    }

    private addressesToPairs(addresses: string[]): PairModel[] {
        const pairs: PairModel[] = [];
        for (const address of addresses) {
            pairs.push(new PairModel({ address: address }));
        }
        return pairs;
    }

    async getTransactions(sender: string, parent: AutoRouteModel) {
        if (parent.pairs.length == 1) {
            if (parent.swapType === SWAP_TYPE.fixedInput)
                return await this.pairTransactionService.swapTokensFixedInput(
                    sender,
                    {
                        pairAddress: parent.pairs[0].address,
                        tokenInID: parent.tokenInID,
                        tokenOutID: parent.tokenOutID,
                        amountIn: parent.amountIn,
                        amountOut: parent.amountOut,
                        tolerance: parent.tolerance,
                    },
                );

            return await this.pairTransactionService.swapTokensFixedOutput(
                sender,
                {
                    pairAddress: parent.pairs[0].address,
                    tokenInID: parent.tokenInID,
                    tokenOutID: parent.tokenOutID,
                    amountIn: parent.amountIn,
                    amountOut: parent.amountOut,
                },
            );
        }

        if (parent.swapType === SWAP_TYPE.fixedOutput)
            return new Error(
                "Can't resolve fixedOutput with multiSwap for now...",
            );

        return await this.autoRouterTransactionService.multiPairSwap(sender, {
            swapType: parent.swapType,
            tokenInID: parent.tokenInID,
            tokenOutID: parent.tokenOutID,
            addressRoute: parent.pairs.map(p => {
                return p.address;
            }),
            intermediaryAmounts: parent.intermediaryAmounts,
            tokenRoute: parent.tokenRoute,
            tolerance: parent.tolerance,
        });
    }
}
