import { ExitFarmProxyEvent } from '@elrondnetwork/elrond-sdk-erdjs-dex';
import { Field, ObjectType } from '@nestjs/graphql';
import { ExitFarmProxyEventModel } from './exitFarmProxy.event.model';

@ObjectType()
export class EnterFarmProxyEventModel extends ExitFarmProxyEventModel {
    @Field()
    private createdWithMerge: boolean;

    constructor(init?: Partial<ExitFarmProxyEvent>) {
        super(init);
        Object.assign(this, init);
    }
}
