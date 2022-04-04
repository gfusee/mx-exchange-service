import { BinaryCodec } from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { scAddress } from 'src/config';
import {
    DecodeAttributesArgs,
    DecodeAttributesModel,
} from 'src/modules/proxy/models/proxy.args';
import { Logger } from 'winston';
import {
    FarmProxyTokenAttributesModel,
    LockedTokenAttributesModel,
    LpProxyTokenAttributesModel,
    SimpleLockModel,
} from '../models/simple.lock.model';

@Injectable()
export class SimpleLockService {
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    getSimpleLock() {
        return new SimpleLockModel({
            address: scAddress.simpleLockAddress,
        });
    }

    decodeBatchLockedTokenAttributes(
        args: DecodeAttributesArgs,
    ): LockedTokenAttributesModel[] {
        return args.batchAttributes.map(arg => {
            return this.decodeLockedTokenAttributes(arg);
        });
    }

    decodeLockedTokenAttributes(
        args: DecodeAttributesModel,
    ): LockedTokenAttributesModel {
        const attributesBuffer = Buffer.from(args.attributes, 'base64');
        const codec = new BinaryCodec();
        const structType = LockedTokenAttributesModel.getStructure();

        const [decodedAttributes] = codec.decodeNested(
            attributesBuffer,
            structType,
        );

        return LockedTokenAttributesModel.fromDecodedAttributes(
            decodedAttributes.valueOf(),
        );
    }

    decodeBatchLpTokenProxyAttributes(
        args: DecodeAttributesArgs,
    ): LpProxyTokenAttributesModel[] {
        return args.batchAttributes.map(arg => {
            return this.decodeLpProxyTokenAttributes(arg);
        });
    }

    decodeLpProxyTokenAttributes(
        args: DecodeAttributesModel,
    ): LpProxyTokenAttributesModel {
        const attributesBuffer = Buffer.from(args.attributes, 'base64');
        const codec = new BinaryCodec();
        const structType = LpProxyTokenAttributesModel.getStructure();

        const [decodedAttributes] = codec.decodeNested(
            attributesBuffer,
            structType,
        );

        return LpProxyTokenAttributesModel.fromDecodedAttributes(
            decodedAttributes.valueOf(),
        );
    }

    decodeBatchFarmProxyTokenAttributes(
        args: DecodeAttributesArgs,
    ): FarmProxyTokenAttributesModel[] {
        return args.batchAttributes.map(arg => {
            return this.decodeFarmProxyTokenAttributes(arg);
        });
    }

    decodeFarmProxyTokenAttributes(
        args: DecodeAttributesModel,
    ): FarmProxyTokenAttributesModel {
        const attributesBuffer = Buffer.from(args.attributes, 'base64');
        const codec = new BinaryCodec();
        const structType = FarmProxyTokenAttributesModel.getStructure();

        const [decodedAttributes] = codec.decodeNested(
            attributesBuffer,
            structType,
        );

        return FarmProxyTokenAttributesModel.fromDecodedAttributes(
            decodedAttributes.valueOf(),
        );
    }
}
