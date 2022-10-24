import { FarmVersion } from '@elrondnetwork/erdjs-dex';
import { farmsConfig } from 'src/config';
import { FarmRewardType } from 'src/modules/farm/models/farm.model';

const toVersionEnum = (version: string): FarmVersion => {
    switch (version) {
        case 'v1.2':
            return FarmVersion.V1_2;
        case 'v1.3':
            return FarmVersion.V1_3;
        default:
            undefined;
    }
};

const toRewardTypeEnum = (rewardType: string): FarmRewardType => {
    switch (rewardType) {
        case 'unlockedRewards':
            return FarmRewardType.UNLOCKED_REWARDS;
        case 'lockedRewards':
            return FarmRewardType.LOCKED_REWARDS;
        case 'customRewards':
            return FarmRewardType.CUSTOM_REWARDS;
    }
};

export const farmVersion = (farmAddress: string): FarmVersion | undefined => {
    const versions = Object.keys(farmsConfig);
    for (const version of versions) {
        if (Array.isArray(farmsConfig[version])) {
            const address = farmsConfig[version].find(
                (address: string) => address === farmAddress,
            );
            if (address !== undefined) {
                return toVersionEnum(version);
            }
        } else {
            const types = Object.keys(farmsConfig[version]);
            for (const type of types) {
                const address = farmsConfig[version][type].find(
                    (address: string) => address === farmAddress,
                );
                if (address !== undefined) {
                    return toVersionEnum(version);
                }
            }
        }
    }
    return undefined;
};

export const farmType = (farmAddress: string): FarmRewardType | undefined => {
    const versions = Object.keys(farmsConfig);
    for (const version of versions) {
        if (Array.isArray(farmsConfig[version])) {
            const address = farmsConfig[version].find(
                (address: string) => address === farmAddress,
            );
            if (address !== undefined) {
                return undefined;
            }
        } else {
            const types = Object.keys(farmsConfig[version]);
            for (const type of types) {
                const address = farmsConfig[version][type].find(
                    (address: string) => address === farmAddress,
                );
                if (address !== undefined) {
                    return toRewardTypeEnum(type);
                }
            }
        }
    }
    return undefined;
};

export const farmsAddresses = (): string[] => {
    const addresses = [];
    const versions = Object.keys(farmsConfig);
    for (const version of versions) {
        if (Array.isArray(farmsConfig[version])) {
            addresses.push(...farmsConfig[version]);
        } else {
            const types = Object.keys(farmsConfig[version]);
            for (const type of types) {
                addresses.push(...farmsConfig[version][type]);
            }
        }
    }
    return addresses;
};
