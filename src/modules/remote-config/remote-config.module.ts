import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule } from 'src/services/database/database.module';
import { SCAddressRepositoryService } from '../../services/database/repositories/scAddress.repository';
import { SCAddress, SCAddressSchema } from './schemas/sc-address.schema';
import { FlagRepositoryService } from 'src/services/database/repositories/flag.repository';
import { Flag, FlagSchema } from './schemas/flag.schema';
import { RemoteConfigController } from './remote-config.controller';
import { RemoteConfigGetterService } from './remote-config.getter.service';
import { RemoteConfigSetterService } from './remote-config.setter.service';
import { CachingModule } from 'src/services/caching/cache.module';
import { ConfigModule } from '@nestjs/config';
import { ApiConfigService } from 'src/helpers/api.config.service';

@Module({
    imports: [
        DatabaseModule,
        MongooseModule.forFeature([{ name: Flag.name, schema: FlagSchema }]),
        MongooseModule.forFeature([
            { name: SCAddress.name, schema: SCAddressSchema },
        ]),
        CachingModule,
    ],
    providers: [
        RemoteConfigController,
        FlagRepositoryService,
        SCAddressRepositoryService,
        RemoteConfigGetterService,
        RemoteConfigSetterService,
        ApiConfigService,
    ],
    exports: [
        RemoteConfigGetterService,
        RemoteConfigSetterService,
        FlagRepositoryService,
        SCAddressRepositoryService,
    ],
})
export class RemoteConfigModule {}