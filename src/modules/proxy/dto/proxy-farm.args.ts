import { ArgsType, Field, Int } from '@nestjs/graphql';
import { SmartContractType } from 'src/modules/token-merging/dto/token.merging.args';

@ArgsType()
export class EnterFarmProxyArgs {
    @Field() sender: string;
    @Field() farmAddress: string;
    @Field() acceptedLockedTokenID: string;
    @Field(type => Int)
    acceptedLockedTokenNonce: number;
    @Field() amount: string;
    @Field({ nullable: true }) lockRewards: boolean;
}

@ArgsType()
export class EnterFarmProxyBatchArgs {
    @Field() sender: string;
    @Field() farmAddress: string;
    @Field() acceptedLockedTokenID: string;
    @Field(type => Int)
    acceptedLockedTokenNonce: number;
    @Field() amount: string;
    @Field({ nullable: true }) lockRewards: boolean;

    @Field(type => SmartContractType)
    smartContractType: SmartContractType;
    @Field()
    lockedFarmTokenID: string;
    @Field(type => Int)
    lockedFarmTokenNonce: number;
    @Field()
    lockedFarmAmount: string;
}

@ArgsType()
export class ExitFarmProxyArgs {
    @Field() sender: string;
    @Field() farmAddress: string;
    @Field() wrappedFarmTokenID: string;
    @Field(type => Int)
    wrappedFarmTokenNonce: number;
    @Field() amount: string;
}

@ArgsType()
export class ClaimFarmRewardsProxyArgs {
    @Field() sender: string;
    @Field() farmAddress: string;
    @Field() wrappedFarmTokenID: string;
    @Field(type => Int)
    wrappedFarmTokenNonce: number;
    @Field() amount: string;
}
