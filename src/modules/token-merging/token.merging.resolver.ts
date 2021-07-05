import { Inject } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { GenericEsdtAmountPair } from 'src/models/proxy.model';
import { TransactionModel } from 'src/models/transaction.model';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import {
    BaseNftDepositArgs,
    CompoundRewardsArgs,
    DepositTokenArgs,
    NftDepositArgs,
    WithdrawTokenFromDepositArgs,
    WithdrawTokensFromDepositArgs,
} from './dto/token.merging.args';
import { TokenMergingService } from './token.merging.service';
import { TokenMergingTransactionsService } from './token.merging.transactions.service';

@Resolver()
export class TokenMergingResolver {
    constructor(
        @Inject(ElrondProxyService)
        private readonly elrondProxy: ElrondProxyService,
        @Inject(TokenMergingTransactionsService)
        private readonly mergeTokensTransactions: TokenMergingTransactionsService,
        @Inject(TokenMergingService)
        private readonly mergeTokensService: TokenMergingService,
    ) {}

    @Query(returns => TransactionModel)
    async mergeTokens(
        @Args() args: BaseNftDepositArgs,
    ): Promise<TransactionModel> {
        return await this.mergeTokensTransactions.mergeTokens(args);
    }

    @Query(returns => TransactionModel)
    async depositToken(
        @Args() args: DepositTokenArgs,
    ): Promise<TransactionModel> {
        return await this.mergeTokensTransactions.depositToken(args);
    }

    @Query(returns => [GenericEsdtAmountPair])
    async nftDeposit(
        @Args() args: NftDepositArgs,
    ): Promise<GenericEsdtAmountPair[]> {
        return await this.mergeTokensService.getNftDeposit(args);
    }

    @Query(returns => TransactionModel)
    async withdrawAllTokensFromDeposit(
        @Args() args: WithdrawTokensFromDepositArgs,
    ): Promise<TransactionModel> {
        return await this.mergeTokensTransactions.withdrawAllTokensFromDeposit(
            args,
        );
    }

    @Query(returns => TransactionModel)
    async withdrawTokenFromDeposit(
        @Args() args: WithdrawTokenFromDepositArgs,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            args.address,
        );
        return await this.mergeTokensTransactions.withdrawTokenFromDeposit(
            args,
        );
    }

    @Query(returns => TransactionModel)
    async compoundRewards(
        @Args() args: CompoundRewardsArgs,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            args.address,
        );
        return await this.mergeTokensTransactions.compoundRewards(args);
    }
}
