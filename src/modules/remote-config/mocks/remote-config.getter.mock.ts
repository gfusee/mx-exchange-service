import { Address } from '@elrondnetwork/erdjs/out';

export class RemoteConfigGetterServiceMock {
    async getMaintenanceFlagValue(): Promise<boolean> {
        return false;
    }

    async getStakingAddresses(): Promise<string[]> {
        return [Address.Zero().bech32()];
    }

    async getStakingProxyAddresses(): Promise<string[]> {
        return [Address.Zero().bech32(), Address.Zero().bech32()];
    }
}