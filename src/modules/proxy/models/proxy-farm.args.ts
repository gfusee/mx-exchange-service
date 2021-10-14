import { ArgsType, Field, Int } from '@nestjs/graphql';

@ArgsType()
export class EnterFarmProxyArgs {
    @Field() farmAddress: string;
    @Field() acceptedLockedTokenID: string;
    @Field(type => Int)
    acceptedLockedTokenNonce: number;
    @Field() amount: string;
    @Field({ nullable: true }) lockRewards: boolean;
}

@ArgsType()
export class EnterFarmProxyBatchArgs {
    @Field() farmAddress: string;
    @Field() acceptedLockedTokenID: string;
    @Field(type => Int)
    acceptedLockedTokenNonce: number;
    @Field() amount: string;
    @Field({ nullable: true }) lockRewards: boolean;

    @Field()
    lockedFarmTokenID: string;
    @Field(type => Int)
    lockedFarmTokenNonce: number;
    @Field()
    lockedFarmAmount: string;
}

@ArgsType()
export class ExitFarmProxyArgs {
    @Field() farmAddress: string;
    @Field() wrappedFarmTokenID: string;
    @Field(type => Int)
    wrappedFarmTokenNonce: number;
    @Field() amount: string;
}

@ArgsType()
export class ClaimFarmRewardsProxyArgs {
    @Field() farmAddress: string;
    @Field() wrappedFarmTokenID: string;
    @Field(type => Int)
    wrappedFarmTokenNonce: number;
    @Field() amount: string;
}

@ArgsType()
export class CompoundRewardsProxyArgs {
    @Field()
    farmAddress: string;
    @Field()
    tokenID: string;
    @Field(type => Int)
    tokenNonce: number;
    @Field()
    amount: string;
}
