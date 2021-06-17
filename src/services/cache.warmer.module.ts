import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PairModule } from 'src/dex/pair/pair.module';
import { ContextModule } from 'src/dex/utils/context.module';
import { CacheWarmerService } from './crons/cache.warmer.service';
import { PriceFeedModule } from './price-feed/price-feed.module';
import { ServicesModule } from './services.module';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        PriceFeedModule,
        PairModule,
        ServicesModule,
        ContextModule,
    ],
    controllers: [],
    providers: [CacheWarmerService],
})
export class CacheWarmerModule {}
