import { Injectable } from '@nestjs/common';
import { Interaction } from '@multiversx/sdk-core/out/smartcontracts/interaction';
import { MXProxyService } from '../../../services/multiversx-communication/mx.proxy.service';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { ErrorLoggerAsync } from 'src/helpers/decorators/error.logger';

@Injectable()
export class WrapAbiService extends GenericAbiService {
    constructor(protected readonly mxProxy: MXProxyService) {
        super(mxProxy);
    }

    @ErrorLoggerAsync({ className: WrapAbiService.name })
    @GetOrSetCache({
        baseKey: 'wrap',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async wrappedEgldTokenID(): Promise<string> {
        return await this.getWrappedEgldTokenIDRaw();
    }

    async getWrappedEgldTokenIDRaw(): Promise<string> {
        const contract = await this.mxProxy.getWrapSmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getWrappedEgldTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }
}
