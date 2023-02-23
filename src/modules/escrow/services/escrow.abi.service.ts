import {
    Address,
    AddressValue,
    Interaction,
    TypedValue,
    U64Value,
} from '@multiversx/sdk-core/out';
import { EsdtTokenPayment } from '@multiversx/sdk-exchange';
import { Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { scAddress } from 'src/config';
import { EsdtTokenPaymentModel } from 'src/modules/tokens/models/esdt.token.payment.model';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { MXGatewayService } from 'src/services/multiversx-communication/mx.gateway.service';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { Logger } from 'winston';
import { ScheduledTransferModel } from '../models/escrow.model';

@Injectable()
export class EscrowAbiService extends GenericAbiService {
    constructor(
        protected readonly mxProxy: MXProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly mxGateway: MXGatewayService,
    ) {
        super(mxProxy, logger);
    }

    async getScheduledTransfers(
        receiverAddress: string,
    ): Promise<ScheduledTransferModel[]> {
        const contract = await this.mxProxy.getEscrowContract();
        const interaction: Interaction =
            contract.methodsExplicit.getScheduledTransfers([
                new AddressValue(Address.fromString(receiverAddress)),
            ]);
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().map(
            (rawValue: TypedValue) =>
                new ScheduledTransferModel({
                    sender: rawValue.valueOf().sender.bech32(),
                    lockedFunds: {
                        funds: rawValue
                            .valueOf()
                            .locked_funds.funds.map(
                                (rawFunds) =>
                                    new EsdtTokenPaymentModel(
                                        EsdtTokenPayment.fromDecodedAttributes(
                                            rawFunds,
                                        ).toJSON(),
                                    ),
                            ),
                        lockedEpoch: rawValue
                            .valueOf()
                            .locked_funds.locked_epoch.toNumber(),
                    },
                }),
        );
    }

    async getAllSenders(receiverAddress: string): Promise<string[]> {
        const contract = await this.mxProxy.getEscrowContract();
        const interaction: Interaction = contract.methodsExplicit.getAllSenders(
            [new AddressValue(Address.fromString(receiverAddress))],
        );
        const response = await this.getGenericData(interaction);
        return response.firstValue
            .valueOf()
            .map((rawAddress: AddressValue) => rawAddress.valueOf().bech32());
    }

    }

    async getEnergyFactoryAddress(): Promise<string> {
        const hexValue = await this.mxGateway.getSCStorageKeys(
            scAddress.escrow,
            ['energyFactoryAddress'],
        );
        return Address.fromHex(hexValue).bech32();
    }

    async getLockedTokenID(): Promise<string> {
        const hexValue = await this.mxGateway.getSCStorageKeys(
            scAddress.escrow,
            ['lockedTokenId'],
        );
        return Buffer.from(hexValue, 'hex').toString();
    }

    async getMinLockEpochs(): Promise<number> {
        const hexValue = await this.mxGateway.getSCStorageKeys(
            scAddress.escrow,
            ['minLockEpochs'],
        );

        return new U64Value(new BigNumber(hexValue)).valueOf().toNumber();
    }

    async getEpochCooldownDuration(): Promise<number> {
        const hexValue = await this.mxGateway.getSCStorageKeys(
            scAddress.escrow,
            ['minLockEpochs'],
        );

        return new U64Value(new BigNumber(hexValue)).valueOf().toNumber();
    }
}
