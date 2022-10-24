import { Module } from '@nestjs/common';
import { PairModule } from '../pair/pair.module';
import { ContextModule } from '../../services/context/context.module';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { CachingModule } from '../../services/caching/cache.module';
import { CommonAppModule } from 'src/common.app.module';
import { TokenModule } from '../tokens/token.module';
import { FarmQueryResolver } from './farm.query.resolver';
import { FarmTransactionResolver } from './farm.transaction.resolver';
import { FarmModuleV1_2 } from './v1.2/farm.v1.2.module';
import { FarmModuleV2 } from './v2/farm.v2.module';
import { FarmCustomModule } from './custom/farm.custom.module';
import { FarmModuleV1_3 } from './v1.3/farm.v1.3.module';
import { FarmFactoryService } from './farm.service';

@Module({
    imports: [
        CommonAppModule,
        ElrondCommunicationModule,
        CachingModule,
        ContextModule,
        PairModule,
        TokenModule,
        FarmCustomModule,
        FarmModuleV1_2,
        FarmModuleV1_3,
        FarmModuleV2,
        FarmCustomModule,
    ],
    providers: [FarmFactoryService, FarmQueryResolver, FarmTransactionResolver],
    exports: [FarmFactoryService],
})
export class FarmModule {}
