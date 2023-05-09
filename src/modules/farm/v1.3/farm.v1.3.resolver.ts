import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { FarmResolver } from '../base-module/farm.resolver';
import { FarmModelV1_3 } from '../models/farm.v1.3.model';
import { FarmServiceV1_3 } from './services/farm.v1.3.service';
import { FarmComputeServiceV1_3 } from './services/farm.v1.3.compute.service';
import { FarmAbiServiceV1_3 } from './services/farm.v1.3.abi.service';
import { LockedAssetModel } from 'src/modules/locked-asset-factory/models/locked-asset.model';

@Resolver(FarmModelV1_3)
export class FarmResolverV1_3 extends FarmResolver {
    constructor(
        protected readonly farmAbi: FarmAbiServiceV1_3,
        protected readonly farmService: FarmServiceV1_3,
        protected readonly farmCompute: FarmComputeServiceV1_3,
    ) {
        super(farmAbi, farmService, farmCompute);
    }

    @ResolveField()
    async apr(@Parent() parent: FarmModelV1_3): Promise<string> {
        return this.farmCompute.farmAPR(parent.address);
    }

    @ResolveField()
    async lockedAssetFactory(
        @Parent() parent: FarmModelV1_3,
    ): Promise<LockedAssetModel> {
        const address = await this.farmAbi.lockedAssetFactoryAddress(
            parent.address,
        );

        return address ? new LockedAssetModel({ address }) : null;
    }
}
