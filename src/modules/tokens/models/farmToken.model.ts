import { Field, ObjectType } from '@nestjs/graphql';
import { FarmTokenAttributesModel } from 'src/modules/farm/models/farmTokenAttributes.model';
import { NftToken } from './nftToken.model';

@ObjectType()
export class FarmToken extends NftToken {
    @Field(() => FarmTokenAttributesModel)
    decodedAttributes: FarmTokenAttributesModel;
}