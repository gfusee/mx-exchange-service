import { Field, Int, InterfaceType } from '@nestjs/graphql';

@InterfaceType()
export abstract class IAssets {
    @Field({ nullable: true }) website?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) pngUrl?: string;
    @Field({ nullable: true }) svgUrl?: string;
    @Field(() => [String], { nullable: 'itemsAndList' })
    lockedAccounts?: string[];
    @Field(() => [String], { nullable: 'itemsAndList' }) extraTokens?: string[];
}

@InterfaceType()
export abstract class IRoles {
    @Field({ nullable: true }) address?: string;
    @Field({ nullable: true }) canMint?: boolean;
    @Field({ nullable: true }) canBurn?: boolean;
    @Field(() => [String], { nullable: 'itemsAndList' }) roles?: string[];
}

@InterfaceType()
export abstract class IEsdtToken {
    @Field() identifier: string;
    @Field() name: string;
    @Field() ticker: string;
    @Field() owner: string;
    @Field({ nullable: true }) minted?: string;
    @Field({ nullable: true }) burnt?: string;
    @Field({ nullable: true }) initialMinted?: string;
    @Field() decimals: number;
    @Field({ nullable: true }) price?: string;
    @Field({ nullable: true }) supply?: string;
    @Field({ nullable: true }) circulatingSupply?: string;
    @Field(() => IAssets, { nullable: true }) assets?: IAssets;
    @Field(() => Int) transactions: number;
    @Field(() => Int) accounts: number;
    @Field() isPaused: boolean;
    @Field() canUpgrade: boolean;
    @Field() canMint: boolean;
    @Field() canBurn: boolean;
    @Field() canChangeOwner: boolean;
    @Field() canPause: boolean;
    @Field() canFreeze: boolean;
    @Field() canWipe: boolean;
    @Field(() => IRoles, { nullable: true }) roles?: IRoles;
    @Field({ nullable: true }) type?: string;
    @Field({ nullable: true }) balance?: string;
}
