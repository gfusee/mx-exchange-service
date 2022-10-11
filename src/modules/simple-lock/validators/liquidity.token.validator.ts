import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { InputTokenModel } from 'src/models/inputToken.model';
import { SimpleLockGetterService } from '../services/simple.lock.getter.service';
import { SimpleLockService } from '../services/simple.lock.service';

@Injectable()
export class LiquidityTokensValidationPipe implements PipeTransform {
    constructor(
        private readonly simpleLockService: SimpleLockService,
        private readonly simpleLockGetter: SimpleLockGetterService,
    ) {}

    async transform(value: InputTokenModel[], metadata: ArgumentMetadata) {
        const simpleLockAddress =
            await this.simpleLockService.getSimpleLockAddressFromInputTokens(
                value,
            );

        const lockedTokenID = await this.simpleLockGetter.getLockedTokenID(
            simpleLockAddress,
        );

        if (value.length !== 2) {
            throw new Error('Invalid number of tokens');
        }

        const [firstToken, secondToken] = value;

        if (
            firstToken.tokenID !== lockedTokenID &&
            secondToken.tokenID !== lockedTokenID
        ) {
            throw new Error('Invalid tokens to send');
        }

        if (firstToken.tokenID === lockedTokenID && firstToken.nonce < 1) {
            throw new Error('Invalid locked token');
        }
        if (secondToken.tokenID === lockedTokenID && secondToken.nonce < 1) {
            throw new Error('Invalid locked token');
        }

        return value;
    }
}
