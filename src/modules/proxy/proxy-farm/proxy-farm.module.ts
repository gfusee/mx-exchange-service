import { forwardRef, Module } from '@nestjs/common';
import { ElrondCommunicationModule } from '../../../services/elrond-communication/elrond-communication.module';
import { ContextModule } from '../../../services/context/context.module';
import { AbiProxyFarmService } from './proxy-farm-abi.service';
import { TransactionsProxyFarmService } from './proxy-farm-transactions.service';
import { ProxyFarmService } from './proxy-farm.service';
import { CachingModule } from '../../../services/caching/cache.module';
import { ProxyPairModule } from '../proxy-pair/proxy-pair.module';
import { ProxyModule } from '../proxy.module';

@Module({
    imports: [
        ElrondCommunicationModule,
        CachingModule,
        ContextModule,
        ProxyPairModule,
        forwardRef(() => ProxyModule),
    ],
    providers: [
        AbiProxyFarmService,
        ProxyFarmService,
        TransactionsProxyFarmService,
    ],
    exports: [
        ProxyFarmService,
        AbiProxyFarmService,
        TransactionsProxyFarmService,
    ],
})
export class ProxyFarmModule {}
