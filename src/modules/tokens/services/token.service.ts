import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { RouterGetterService } from 'src/modules/router/services/router.getter.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { Logger } from 'winston';
import { EsdtToken } from '../models/esdtToken.model';
import { TokensFiltersArgs } from '../models/tokens.filter.args';
import { TokenGetterService } from './token.getter.service';

@Injectable()
export class TokenService {
    constructor(
        private readonly tokenGetter: TokenGetterService,
        private readonly routerGetter: RouterGetterService,
        private readonly contextGetter: ContextGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getTokens(filters: TokensFiltersArgs): Promise<EsdtToken[]> {
        let tokenIDs = await this.getUniqueTokenIDs();
        if (filters.identifiers && filters.identifiers.length > 0) {
            tokenIDs = tokenIDs.filter(tokenID =>
                filters.identifiers.includes(tokenID),
            );
        }

        const promises = tokenIDs.map(tokenID =>
            this.contextGetter.getTokenMetadata(tokenID),
        );
        let tokens = await Promise.all(promises);

        if (filters.type) {
            for (const token of tokens) {
                token.type = await this.tokenGetter.getEsdtTokenType(
                    token.identifier,
                );
            }
            tokens = tokens.filter(token => token.type === filters.type);
        }

        return tokens;
    }

    private async getUniqueTokenIDs(): Promise<string[]> {
        const pairsMetadata = await this.routerGetter.getPairsMetadata();
        const tokenIDs: string[] = [];
        for (const iterator of pairsMetadata) {
            tokenIDs.push(...[iterator.firstTokenID, iterator.secondTokenID]);
        }

        return [...new Set(tokenIDs)];
    }
}