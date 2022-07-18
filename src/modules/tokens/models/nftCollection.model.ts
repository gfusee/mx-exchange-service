import { Field, Int, ObjectType } from '@nestjs/graphql';
import { INFTCollection } from './nft.interface';

@ObjectType({
    implements: () => [INFTCollection],
})
export class NftCollection implements INFTCollection {
    collection: string;
    name: string;
    ticker: string;
    decimals: number;
    issuer: string;
    timestamp: number;
    canUpgrade: boolean;
    canMint: boolean;
    canBurn: boolean;
    canChangeOwner: boolean;
    canPause: boolean;
    canFreeze: boolean;
    canWipe: boolean;
    canAddSpecialRoles: boolean;
    canTransferNFTCreateRole: boolean;
    NFTCreateStopped: boolean;

    constructor(init?: Partial<NftCollection>) {
        Object.assign(this, init);
    }
}