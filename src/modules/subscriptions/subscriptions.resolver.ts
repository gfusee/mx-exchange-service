import {
    FARM_EVENTS,
    PAIR_EVENTS,
    PROXY_EVENTS,
    SIMPLE_LOCK_ENERGY_EVENTS,
} from '@elrondnetwork/erdjs-dex';
import { Inject } from '@nestjs/common';
import { Resolver, Subscription } from '@nestjs/graphql';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { UpdatedEnergyEventModel } from './models/energy/updated.energy.event.model';
import { FarmEventModelV1_3 } from './models/farm/enterFarm.event.model';
import { RewardsFarmEventModelV1_3 } from './models/farm/rewards.event.model';
import { AddLiquidityEventModel } from './models/pair/addLiquidity.event.model';
import { RemoveLiquidityEventModel } from './models/pair/removeLiquidity.event.model';
import { SwapFixedInputEventModel } from './models/pair/swapFixedInput.event.model';
import { SwapFixedOutputEventModel } from './models/pair/swapFixedOutput.event.model';
import { SwapNoFeeEventModel } from './models/pair/swapNoFee.event.model';
import { AddLiquidityProxyEventModel } from './models/proxy/addLiquidityProxy.event.model';
import { ClaimRewardsProxyEventModel } from './models/proxy/claimRewardsProxy.event.model';
import { EnterFarmProxyEventModel } from './models/proxy/enterFarmProxy.event.model';
import { ExitFarmProxyEventModel } from './models/proxy/exitFarmProxy.event.model';
import { PairProxyEventModel } from './models/proxy/pairProxy.event.model';
import { RewardsProxyEventModel } from './models/proxy/rewardsProxy.event.model';

@Resolver()
export class SubscriptionsResolver {
    constructor(@Inject(PUB_SUB) private pubSub: RedisPubSub) {}

    @Subscription(() => SwapFixedInputEventModel, {
        resolve: (event) =>
            new SwapFixedInputEventModel(event.swapFixedInputEvent),
    })
    swapFixedInputEvent() {
        return this.pubSub.asyncIterator(PAIR_EVENTS.SWAP_FIXED_INPUT);
    }

    @Subscription(() => SwapFixedOutputEventModel, {
        resolve: (event) =>
            new SwapFixedOutputEventModel(event.swapFixedOutputEvent),
    })
    swapFixedOutputEvent() {
        return this.pubSub.asyncIterator(PAIR_EVENTS.SWAP_FIXED_OUTPUT);
    }

    @Subscription(() => AddLiquidityEventModel, {
        resolve: (event) => new AddLiquidityEventModel(event.addLiquidityEvent),
    })
    addLiquidityEvent() {
        return this.pubSub.asyncIterator(PAIR_EVENTS.ADD_LIQUIDITY);
    }

    @Subscription(() => RemoveLiquidityEventModel, {
        resolve: (event) =>
            new RemoveLiquidityEventModel(event.removeLiquidityEvent),
    })
    removeLiquidityEvent() {
        return this.pubSub.asyncIterator(PAIR_EVENTS.REMOVE_LIQUIDITY);
    }

    @Subscription(() => SwapNoFeeEventModel, {
        resolve: (event) => new SwapNoFeeEventModel(event.swapNoFeeEvent),
    })
    swapNoFeeEvent() {
        return this.pubSub.asyncIterator(PAIR_EVENTS.SWAP_NO_FEE);
    }

    @Subscription(() => FarmEventModelV1_3, {
        resolve: (event) => new FarmEventModelV1_3(event.enterFarmEvent),
    })
    enterFarmEvent() {
        return this.pubSub.asyncIterator(FARM_EVENTS.ENTER_FARM);
    }

    @Subscription(() => FarmEventModelV1_3, {
        resolve: (event) => new FarmEventModelV1_3(event.exitFarmEvent),
    })
    exitFarmEvent() {
        return this.pubSub.asyncIterator(FARM_EVENTS.EXIT_FARM);
    }

    @Subscription(() => RewardsFarmEventModelV1_3, {
        resolve: (event) =>
            new RewardsFarmEventModelV1_3(event.claimRewardsEvent),
    })
    claimRewardsEvent() {
        return this.pubSub.asyncIterator(FARM_EVENTS.CLAIM_REWARDS);
    }

    @Subscription(() => RewardsFarmEventModelV1_3, {
        resolve: (event) =>
            new RewardsFarmEventModelV1_3(event.compoundRewardsEvent),
    })
    compoundRewardsEvent() {
        return this.pubSub.asyncIterator(FARM_EVENTS.COMPOUND_REWARDS);
    }

    @Subscription(() => AddLiquidityProxyEventModel, {
        resolve: (event) =>
            new AddLiquidityProxyEventModel(event.addLiquidityProxyEvent),
    })
    addLiquidityProxyEvent() {
        return this.pubSub.asyncIterator(PROXY_EVENTS.ADD_LIQUIDITY_PROXY);
    }

    @Subscription(() => PairProxyEventModel, {
        resolve: (event) =>
            new PairProxyEventModel(event.removeLiquidityProxyEvent),
    })
    removeLiquidityProxyEvent() {
        return this.pubSub.asyncIterator(PROXY_EVENTS.REMOVE_LIQUIDITY_PROXY);
    }

    @Subscription(() => EnterFarmProxyEventModel, {
        resolve: (event) =>
            new EnterFarmProxyEventModel(event.enterFarmProxyEvent),
    })
    enterFarmProxyEvent() {
        return this.pubSub.asyncIterator(PROXY_EVENTS.ENTER_FARM_PROXY);
    }

    @Subscription(() => ExitFarmProxyEventModel, {
        resolve: (event) =>
            new ExitFarmProxyEventModel(event.exitFarmProxyEvent),
    })
    exitFarmProxyEvent() {
        return this.pubSub.asyncIterator(PROXY_EVENTS.EXIT_FARM_PROXY);
    }

    @Subscription(() => ClaimRewardsProxyEventModel, {
        resolve: (event) =>
            new ClaimRewardsProxyEventModel(event.claimRewardsProxyEvent),
    })
    claimRewardsProxyEvent() {
        return this.pubSub.asyncIterator(PROXY_EVENTS.CLAIM_REWARDS_PROXY);
    }

    @Subscription(() => RewardsProxyEventModel, {
        resolve: (event) =>
            new RewardsProxyEventModel(event.compoundRewardsProxyEvent),
    })
    compoundRewardsProxyEvent() {
        return this.pubSub.asyncIterator(PROXY_EVENTS.COMPOUND_REWARDS_PROXY);
    }

    @Subscription(() => UpdatedEnergyEventModel, {
        resolve: (event) => new UpdatedEnergyEventModel(event.updatedEnergy),
    })
    updatedEnergy() {
        return this.pubSub.asyncIterator(
            SIMPLE_LOCK_ENERGY_EVENTS.ENERGY_UPDATED,
        );
    }
}
