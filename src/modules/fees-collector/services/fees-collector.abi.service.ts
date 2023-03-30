import { Inject, Injectable } from '@nestjs/common';
import { GenericAbiService } from '../../../services/generics/generic.abi.service';
import { MXProxyService } from '../../../services/multiversx-communication/mx.proxy.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import {
    Interaction,
    SmartContract,
    TokenIdentifierValue,
    U32Value,
} from '@multiversx/sdk-core';
import { WeeklyRewardsSplittingAbiService } from '../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { Mixin } from 'ts-mixer';
import BigNumber from 'bignumber.js';

@Injectable()
export class FeesCollectorAbiService extends Mixin(
    GenericAbiService,
    WeeklyRewardsSplittingAbiService,
) {
    constructor(
        protected readonly mxProxy: MXProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(mxProxy, logger);
        this.getContractHandler = this.getContract;
    }

    async getContract(scAddress: string): Promise<SmartContract> {
        const contract = await this.mxProxy.getFeesCollectorContract(scAddress);
        return contract;
    }

    async accumulatedFees(
        scAddress: string,
        week: number,
        token: string,
    ): Promise<string> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getAccumulatedFees([
                new U32Value(new BigNumber(week)),
                new TokenIdentifierValue(token),
            ]);
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().integerValue().toFixed();
    }

    async lockedTokenId(scAddress: string): Promise<string> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getLockedTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    async lockedTokensPerBlock(scAddress: string): Promise<string> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getLockedTokensPerBlock();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async allTokens(scAddress: string): Promise<string[]> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getAllTokens();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }
}
