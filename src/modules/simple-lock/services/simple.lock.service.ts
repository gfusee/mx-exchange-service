import {
    LockedFarmTokenAttributes,
    LockedLpTokenAttributes,
    LockedTokenAttributes,
} from '@elrondnetwork/erdjs-dex';
import { Inject, Injectable } from '@nestjs/common';
import { UserInputError } from 'apollo-server-express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { scAddress } from 'src/config';
import { InputTokenModel } from 'src/models/inputToken.model';
import { FarmTokenAttributesModelV1_3 } from 'src/modules/farm/models/farmTokenAttributes.model';
import {
    DecodeAttributesArgs,
    DecodeAttributesModel,
} from 'src/modules/proxy/models/proxy.args';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import { tokenIdentifier } from 'src/utils/token.converters';
import { Logger } from 'winston';
import {
    FarmProxyTokenAttributesModel,
    LockedTokenAttributesModel,
    LpProxyTokenAttributesModel,
    SimpleLockModel,
} from '../models/simple.lock.model';
import { SimpleLockGetterService } from './simple.lock.getter.service';
import { FarmServiceV1_3 } from 'src/modules/farm/v1.3/services/farm.v1.3.service';

@Injectable()
export class SimpleLockService {
    constructor(
        private readonly simpleLockGetter: SimpleLockGetterService,
        private readonly farmServiceV1_3: FarmServiceV1_3,
        private readonly apiService: ElrondApiService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    getSimpleLock(): SimpleLockModel[] {
        return scAddress.simpleLockAddress.map(
            (address: string) =>
                new SimpleLockModel({
                    address,
                }),
        );
    }

    async getLockedTokenAttributes(
        tokenID: string,
        tokenNonce: number,
    ): Promise<LockedTokenAttributesModel> {
        const simpleLockAddress = await this.getSimpleLockAddressByTokenID(
            tokenID,
        );
        const lockedEsdtCollection =
            await this.simpleLockGetter.getLockedTokenID(simpleLockAddress);
        const lockedTokenIdentifier = tokenIdentifier(
            lockedEsdtCollection,
            tokenNonce,
        );
        const lockedToken = await this.apiService.getNftByTokenIdentifier(
            simpleLockAddress,
            lockedTokenIdentifier,
        );
        return this.decodeLockedTokenAttributes({
            identifier: lockedTokenIdentifier,
            attributes: lockedToken.attributes,
        });
    }

    decodeBatchLockedTokenAttributes(
        args: DecodeAttributesArgs,
    ): LockedTokenAttributesModel[] {
        return args.batchAttributes.map((arg) => {
            return this.decodeLockedTokenAttributes(arg);
        });
    }

    decodeLockedTokenAttributes(
        args: DecodeAttributesModel,
    ): LockedTokenAttributesModel {
        return new LockedTokenAttributesModel({
            ...LockedTokenAttributes.fromAttributes(args.attributes).toJSON(),
            attributes: args.attributes,
            identifier: args.identifier,
        });
    }

    async getLpTokenProxyAttributes(
        lockedLpTokenID: string,
        tokenNonce: number,
    ): Promise<LpProxyTokenAttributesModel> {
        const simpleLockAddress = await this.getSimpleLockAddressByTokenID(
            lockedLpTokenID,
        );
        const lockedLpTokenCollection =
            await this.simpleLockGetter.getLpProxyTokenID(simpleLockAddress);
        const lockedLpTokenIdentifier = tokenIdentifier(
            lockedLpTokenCollection,
            tokenNonce,
        );
        const lockedLpToken = await this.apiService.getNftByTokenIdentifier(
            simpleLockAddress,
            lockedLpTokenIdentifier,
        );

        return this.decodeLpProxyTokenAttributes({
            identifier: lockedLpTokenIdentifier,
            attributes: lockedLpToken.attributes,
        });
    }

    decodeBatchLpTokenProxyAttributes(
        args: DecodeAttributesArgs,
    ): LpProxyTokenAttributesModel[] {
        return args.batchAttributes.map((arg) => {
            return this.decodeLpProxyTokenAttributes(arg);
        });
    }

    decodeLpProxyTokenAttributes(
        args: DecodeAttributesModel,
    ): LpProxyTokenAttributesModel {
        return new LpProxyTokenAttributesModel({
            ...LockedLpTokenAttributes.fromAttributes(args.attributes).toJSON(),
            attributes: args.attributes,
            identifier: args.identifier,
        });
    }

    decodeBatchFarmProxyTokenAttributes(
        args: DecodeAttributesArgs,
    ): FarmProxyTokenAttributesModel[] {
        const decodedBatchAttributes: FarmProxyTokenAttributesModel[] = [];
        for (const arg of args.batchAttributes) {
            decodedBatchAttributes.push(
                this.decodeFarmProxyTokenAttributes(arg),
            );
        }
        return decodedBatchAttributes;
    }

    decodeFarmProxyTokenAttributes(
        args: DecodeAttributesModel,
    ): FarmProxyTokenAttributesModel {
        const lockedFarmTokenAttributesModel =
            new FarmProxyTokenAttributesModel({
                ...LockedFarmTokenAttributes.fromAttributes(args.attributes),
                attributes: args.attributes,
                identifier: args.identifier,
            });

        return lockedFarmTokenAttributesModel;
    }

    async getFarmTokenAttributes(
        farmTokenID: string,
        farmTokenNonce: number,
        simpleLockAddress: string,
    ): Promise<FarmTokenAttributesModelV1_3> {
        const farmTokenIdentifier = tokenIdentifier(
            farmTokenID,
            farmTokenNonce,
        );
        const farmToken = await this.apiService.getNftByTokenIdentifier(
            simpleLockAddress,
            farmTokenIdentifier,
        );

        return this.farmServiceV1_3.decodeFarmTokenAttributes(
            farmTokenIdentifier,
            farmToken.attributes,
        );
    }

    async getSimpleLockAddressByTokenID(tokenID: string): Promise<string> {
        for (const address of scAddress.simpleLockAddress) {
            const [lockedTokenID, lockedLpTokenID, lockedFarmTokenID] =
                await Promise.all([
                    this.simpleLockGetter.getLockedTokenID(address),
                    this.simpleLockGetter.getLpProxyTokenID(address),
                    this.simpleLockGetter.getFarmProxyTokenID(address),
                ]);

            if (
                tokenID === lockedTokenID ||
                tokenID === lockedLpTokenID ||
                tokenID === lockedFarmTokenID
            ) {
                return address;
            }
        }
    }

    async getSimpleLockAddressFromInputTokens(
        inputTokens: InputTokenModel[],
    ): Promise<string> {
        let simpleLockAddress: string;
        for (const token of inputTokens) {
            if (token.nonce === 0) {
                continue;
            }
            const address = await this.getSimpleLockAddressByTokenID(
                token.tokenID,
            );
            if (address && !simpleLockAddress) {
                simpleLockAddress = address;
            } else if (address && address !== simpleLockAddress) {
                throw new UserInputError('Input tokens not from contract');
            }
        }

        if (simpleLockAddress === undefined) {
            throw new UserInputError('Invalid input tokens');
        }

        return simpleLockAddress;
    }
}
