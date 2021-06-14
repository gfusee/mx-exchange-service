import { Injectable } from '@nestjs/common';
import {
    BigUIntType,
    BooleanType,
    StructFieldDefinition,
    StructType,
    U64Type,
    U8Type,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { ProxyProvider, BinaryCodec } from '@elrondnetwork/erdjs';
import { elrondConfig, farmsConfig, scAddress } from '../../config';
import { ContextService } from '../utils/context.service';
import { TokenModel } from '../models/esdtToken.model';
import { FarmModel, FarmTokenAttributesModel } from '../models/farm.model';
import { CacheFarmService } from '../../services/cache-manager/cache-farm.service';
import { AbiFarmService } from './abi-farm.service';
import { CalculateRewardsArgs } from './dto/farm.args';
import BigNumber from 'bignumber.js';
import { NFTTokenModel } from '../models/nftToken.model';
import { PairService } from '../pair/pair.service';

@Injectable()
export class FarmService {
    constructor(
        private abiService: AbiFarmService,
        private cacheService: CacheFarmService,
        private context: ContextService,
        private pairService: PairService,
    ) {}

    async getFarmedToken(farmAddress: string): Promise<TokenModel> {
        const farmedTokenID = await this.getFarmedTokenID(farmAddress);
        return this.context.getTokenMetadata(farmedTokenID);
    }

    async getFarmToken(farmAddress: string): Promise<NFTTokenModel> {
        const farmTokenID = await this.getFarmTokenID(farmAddress);
        return this.context.getNFTTokenMetadata(farmTokenID);
    }

    async getFarmingToken(farmAddress: string): Promise<TokenModel> {
        const farmingTokenID = await this.getFarmingTokenID(farmAddress);
        return this.context.getTokenMetadata(farmingTokenID);
    }

    async getFarmTokenSupply(farmAddress: string): Promise<string> {
        const cachedData = await this.cacheService.getFarmTokenSupply(
            farmAddress,
        );
        if (!!cachedData) {
            return cachedData.farmTokenSupply;
        }

        const farmTokenSupply = await this.abiService.getFarmTokenSupply(
            farmAddress,
        );
        this.cacheService.setFarmTokenSupply(farmAddress, {
            farmTokenSupply: farmTokenSupply,
        });
        return farmTokenSupply;
    }

    async getFarmingTokenReserve(farmAddress: string): Promise<string> {
        const cachedData = await this.cacheService.getFarmingTokenReserve(
            farmAddress,
        );
        if (!!cachedData) {
            return cachedData.farmingTokenReserve;
        }

        const farmingTokenReserve = await this.abiService.getFarmingTokenReserve(
            farmAddress,
        );
        this.cacheService.setFarmingTokenReserve(farmAddress, {
            farmingTokenReserve: farmingTokenReserve,
        });
        return farmingTokenReserve;
    }

    async getRewardsPerBlock(farmAddress: string): Promise<string> {
        const cachedData = await this.cacheService.getRewardsPerBlock(
            farmAddress,
        );
        if (!!cachedData) {
            return cachedData.rewardsPerBlock;
        }
        const rewardsPerBlock = await this.abiService.getRewardsPerBlock(
            farmAddress,
        );
        this.cacheService.setRewardsPerBlock(farmAddress, {
            rewardsPerBlock: rewardsPerBlock,
        });
        return rewardsPerBlock;
    }

    async getState(farmAddress: string): Promise<string> {
        const contract = await this.abiService.getContract(farmAddress);
        return await this.context.getState(contract);
    }

    getFarms(): FarmModel[] {
        const farms: Array<FarmModel> = [];
        for (const farmAddress of farmsConfig) {
            const farm = new FarmModel();
            farm.address = farmAddress;
            farms.push(farm);
        }

        return farms;
    }

    async getFarmAddressByFarmTokenID(tokenID: string): Promise<string | null> {
        for (const farmAddress of farmsConfig) {
            const farmTokenID = await this.getFarmTokenID(farmAddress);
            if (farmTokenID === tokenID) {
                return farmAddress;
            }
        }
        return null;
    }

    async getRewardsForPosition(args: CalculateRewardsArgs): Promise<string> {
        const rewards = await this.abiService.calculateRewardsForGivenPosition(
            args,
        );
        return new BigNumber(rewards).toString();
    }

    decodeFarmTokenAttributes(
        identifier: string,
        attributes: string,
    ): FarmTokenAttributesModel {
        const attributesBuffer = Buffer.from(attributes, 'base64');
        const codec = new BinaryCodec();

        const structType = new StructType('FarmTokenAttributes', [
            new StructFieldDefinition('rewardPerShare', '', new BigUIntType()),
            new StructFieldDefinition('enteringEpoch', '', new U64Type()),
            new StructFieldDefinition('aprMultiplier', '', new U8Type()),
            new StructFieldDefinition(
                'withLockedRewards',
                '',
                new BooleanType(),
            ),
        ]);

        const [decoded, decodedLength] = codec.decodeNested(
            attributesBuffer,
            structType,
        );
        const decodedAttributes = decoded.valueOf();
        return {
            identifier: identifier,
            attributes: attributes,
            rewardPerShare: decodedAttributes.rewardPerShare.toString(),
            enteringEpoch: decodedAttributes.enteringEpoch,
            aprMultiplier: decodedAttributes.aprMultiplier,
            lockedRewards: decodedAttributes.withLockedRewards,
        };
    }

    async getFarmedTokenID(farmAddress: string): Promise<string> {
        const cachedData = await this.cacheService.getFarmedTokenID(
            farmAddress,
        );
        if (!!cachedData) {
            return cachedData.farmedTokenID;
        }

        const farmedTokenID = await this.abiService.getFarmedTokenID(
            farmAddress,
        );
        this.cacheService.setFarmedTokenID(farmAddress, {
            farmedTokenID: farmedTokenID,
        });
        return farmedTokenID;
    }

    async getFarmTokenID(farmAddress: string): Promise<string> {
        const cachedData = await this.cacheService.getFarmTokenID(farmAddress);
        if (!!cachedData) {
            return cachedData.farmTokenID;
        }

        const farmTokenID = await this.abiService.getFarmTokenID(farmAddress);
        this.cacheService.setFarmTokenID(farmAddress, {
            farmTokenID: farmTokenID,
        });
        return farmTokenID;
    }

    async getFarmingTokenID(farmAddress: string): Promise<string> {
        const cachedData = await this.cacheService.getFarmingTokenID(
            farmAddress,
        );
        if (!!cachedData) {
            return cachedData.farmingTokenID;
        }

        const farmingTokenID = await this.abiService.getFarmingTokenID(
            farmAddress,
        );
        this.cacheService.setFarmingTokenID(farmAddress, {
            farmingTokenID: farmingTokenID,
        });
        return farmingTokenID;
    }

    async getFarmTokenPriceUSD(farmAddress: string): Promise<string> {
        const farmingTokenID = await this.getFarmingTokenID(farmAddress);
        if (scAddress.has(farmingTokenID)) {
            const pairAddress = scAddress.get(farmingTokenID);
            return await this.pairService.getTokenPriceUSD(
                pairAddress,
                farmingTokenID,
            );
        }

        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            farmingTokenID,
        );
        return this.pairService.getLpTokenPriceUSD(pairAddress);
    }
}
