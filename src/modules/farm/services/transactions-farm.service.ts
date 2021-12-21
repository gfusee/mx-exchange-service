import { TransactionModel } from '../../../models/transaction.model';
import { Inject, Injectable } from '@nestjs/common';
import {
    BigUIntValue,
    U32Value,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { BytesValue } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes';
import { Address, GasLimit } from '@elrondnetwork/erdjs';
import { gasConfig } from '../../../config';
import { BigNumber } from 'bignumber.js';
import {
    ClaimRewardsArgs,
    CompoundRewardsArgs,
    EnterFarmArgs,
    ExitFarmArgs,
    SftFarmInteractionArgs,
} from '../models/farm.args';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';
import { InputTokenModel } from 'src/models/inputToken.model';
import { FarmGetterService } from './farm.getter.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateLogMessage } from 'src/utils/generate-log-message';
import { ContextTransactionsService } from 'src/services/context/context.transactions.service';
import { FarmVersion } from '../models/farm.model';
import { PairService } from 'src/modules/pair/services/pair.service';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { farmType, farmVersion } from 'src/utils/farm.utils';

@Injectable()
export class TransactionsFarmService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly contextTransactions: ContextTransactionsService,
        private readonly farmGetterService: FarmGetterService,
        private readonly pairService: PairService,
        private readonly pairGetterService: PairGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async enterFarm(
        sender: string,
        args: EnterFarmArgs,
    ): Promise<TransactionModel> {
        const whitelists = await this.farmGetterService.getWhitelist(
            args.farmAddress,
        );
        if (whitelists && whitelists.length > 0) {
            throw new Error(
                `whitelisted addresses only for farm ${args.farmAddress}`,
            );
        }

        try {
            await this.validateInputTokens(args.farmAddress, args.tokens);
        } catch (error) {
            const logMessage = generateLogMessage(
                TransactionsFarmService.name,
                this.enterFarm.name,
                '',
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }

        const [
            contract,
            version,
            type,
        ] = await this.elrondProxy.getFarmSmartContract(args.farmAddress);

        let method: string;
        let gasLimit: number;
        switch (version) {
            case FarmVersion.V1_2:
                method = args.lockRewards
                    ? 'enterFarmAndLockRewards'
                    : 'enterFarm';
                gasLimit =
                    args.tokens.length > 1
                        ? gasConfig.farms[version].enterFarm.withTokenMerge
                        : gasConfig.farms[version].enterFarm.default;
                break;
            case FarmVersion.V1_3:
                method = 'enterFarm';
                gasLimit =
                    args.tokens.length > 1
                        ? gasConfig.farms[version][type].enterFarm
                              .withTokenMerge
                        : gasConfig.farms[version][type].enterFarm.default;
        }

        return this.contextTransactions.multiESDTNFTTransfer(
            new Address(sender),
            contract,
            args.tokens,
            method,
            [],
            new GasLimit(gasLimit),
        );
    }

    async exitFarm(
        sender: string,
        args: ExitFarmArgs,
    ): Promise<TransactionModel> {
        const whitelists = await this.farmGetterService.getWhitelist(
            args.farmAddress,
        );
        if (whitelists && whitelists.length > 0) {
            throw new Error(
                `whitelisted addresses only for farm ${args.farmAddress}`,
            );
        }
        const gasLimit = await this.getExitFarmGasLimit(args);
        return this.SftFarmInteraction(sender, args, 'exitFarm', gasLimit);
    }

    async claimRewards(
        sender: string,
        args: ClaimRewardsArgs,
    ): Promise<TransactionModel> {
        const whitelists = await this.farmGetterService.getWhitelist(
            args.farmAddress,
        );
        if (whitelists && whitelists.length > 0) {
            throw new Error(
                `whitelisted addresses only for farm ${args.farmAddress}`,
            );
        }
        const [version, type] = [
            farmVersion(args.farmAddress),
            farmType(args.farmAddress),
        ];
        let gasLimit: number;
        switch (version) {
            case FarmVersion.V1_2:
                gasLimit = gasConfig.farms[version].claimRewards;
                break;
            case FarmVersion.V1_3:
                gasLimit = gasConfig.farms[version][type].claimRewards;
        }
        return this.SftFarmInteraction(sender, args, 'claimRewards', gasLimit);
    }

    async compoundRewards(
        sender: string,
        args: CompoundRewardsArgs,
    ): Promise<TransactionModel> {
        const whitelists = await this.farmGetterService.getWhitelist(
            args.farmAddress,
        );
        if (whitelists && whitelists.length > 0) {
            throw new Error(
                `whitelisted addresses only for farm ${args.farmAddress}`,
            );
        }

        const [farmedTokenID, farmingTokenID] = await Promise.all([
            this.farmGetterService.getFarmedTokenID(args.farmAddress),
            this.farmGetterService.getFarmingTokenID(args.farmAddress),
        ]);

        if (farmedTokenID !== farmingTokenID) {
            throw new Error('failed to compound different tokens');
        }

        const [version, type] = [
            farmVersion(args.farmAddress),
            farmType(args.farmAddress),
        ];
        let gasLimit: number;
        switch (version) {
            case FarmVersion.V1_2:
                gasLimit = gasConfig.farms[version].compoundRewards;
                break;
            case FarmVersion.V1_3:
                gasLimit = gasConfig.farms[version][type].compoundRewards;
        }

        return this.SftFarmInteraction(
            sender,
            args,
            'compoundRewards',
            gasLimit,
        );
    }

    private async SftFarmInteraction(
        sender: string,
        args: SftFarmInteractionArgs,
        method: string,
        gasLimit: number,
    ): Promise<TransactionModel> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            args.farmAddress,
        );

        const transactionArgs = [
            BytesValue.fromUTF8(args.farmTokenID),
            new U32Value(args.farmTokenNonce),
            new BigUIntValue(new BigNumber(args.amount)),
            BytesValue.fromHex(new Address(args.farmAddress).hex()),
            BytesValue.fromUTF8(method),
        ];

        const transaction = this.contextTransactions.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasLimit),
        );

        transaction.receiver = sender;

        return transaction;
    }

    private async validateInputTokens(
        farmAddress: string,
        tokens: InputTokenModel[],
    ): Promise<void> {
        const [farmTokenID, farmingTokenID] = await Promise.all([
            this.farmGetterService.getFarmTokenID(farmAddress),
            this.farmGetterService.getFarmingTokenID(farmAddress),
        ]);

        if (tokens[0].tokenID !== farmingTokenID || tokens[0].nonce > 0) {
            throw new Error('invalid farming token provided');
        }

        for (const inputToken of tokens.slice(1)) {
            if (inputToken.tokenID !== farmTokenID || inputToken.nonce === 0) {
                throw new Error('invalid farm token provided');
            }
        }
    }

    private async getExitFarmGasLimit(args: ExitFarmArgs): Promise<number> {
        const version = farmVersion(args.farmAddress);
        const type = farmType(args.farmAddress);
        const [farmedTokenID, farmingTokenID] = await Promise.all([
            this.farmGetterService.getFarmedTokenID(args.farmAddress),
            this.farmGetterService.getFarmingTokenID(args.farmAddress),
        ]);

        if (farmedTokenID === farmingTokenID) {
            switch (version) {
                case FarmVersion.V1_2:
                    return args.withPenalty
                        ? gasConfig.farms[version].exitFarm.withPenalty
                              .localBurn
                        : gasConfig.farms[version].exitFarm.default;
                case FarmVersion.V1_3:
                    return args.withPenalty
                        ? gasConfig.farms[version][type].exitFarm.withPenalty
                              .localBurn
                        : gasConfig.farms[version][type].exitFarm.default;
            }
        }

        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            farmingTokenID,
        );

        if (pairAddress) {
            const trustedSwapPairs = await this.pairGetterService.getTrustedSwapPairs(
                pairAddress,
            );
            switch (version) {
                case FarmVersion.V1_2:
                    return args.withPenalty
                        ? trustedSwapPairs.length > 0
                            ? gasConfig.farms[version].exitFarm.withPenalty
                                  .buybackAndBurn
                            : gasConfig.farms[version].exitFarm.withPenalty
                                  .pairBurn
                        : gasConfig.farms[version].exitFarm.default;
                case FarmVersion.V1_3:
                    return args.withPenalty
                        ? trustedSwapPairs.length > 0
                            ? gasConfig.farms[version][type].exitFarm
                                  .withPenalty.buybackAndBurn
                            : gasConfig.farms[version][type].exitFarm
                                  .withPenalty.pairBurn
                        : gasConfig.farms[version][type].exitFarm.default;
            }
        }

        switch (version) {
            case FarmVersion.V1_2:
                return args.withPenalty
                    ? gasConfig.farms[version].exitFarm.withPenalty.localBurn
                    : gasConfig.farms[version].exitFarm.default;
            case FarmVersion.V1_3:
                return args.withPenalty
                    ? gasConfig.farms[version][type].exitFarm.withPenalty
                          .localBurn
                    : gasConfig.farms[version][type].exitFarm.default;
        }
    }
}
