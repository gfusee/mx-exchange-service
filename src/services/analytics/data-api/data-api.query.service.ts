import {
    AggregateValue,
    DataApiClient,
    DataApiQueryBuilder,
    HistoricalValue,
    TimeRange,
    TimeResolution,
} from '@multiversx/sdk-data-api-client';
import {
    DataApiAggregateQuery,
    DataApiHistoricalQuery,
} from '@multiversx/sdk-data-api-client/lib/src/queries';
import {
    DataApiAggregateResponse,
    DataApiHistoricalResponse,
} from '@multiversx/sdk-data-api-client/lib/src/responses';
import { Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import fs from 'fs';
import moment from 'moment';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { mxConfig } from 'src/config';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { HistoricDataModel } from 'src/modules/analytics/models/analytics.model';
import { CachingService } from 'src/services/caching/cache.service';
import {
    computeIntervalValues,
    computeTimeInterval,
    convertBinToTimeResolution,
    convertDataApiHistoricalResponseToHash,
    DataApiQuery,
    generateCacheKeysForTimeInterval,
} from 'src/utils/analytics.utils';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { PendingExecutor } from 'src/utils/pending.executor';
import { Logger } from 'winston';
import { AnalyticsQueryArgs } from '../entities/analytics.query.args';
import { AnalyticsQueryInterface } from '../interfaces/analytics.query.interface';

@Injectable()
export class DataApiQueryService implements AnalyticsQueryInterface {
    private readonly dataApiClient: DataApiClient;
    private readonly historicalQueryExecutor: PendingExecutor<
        DataApiHistoricalQuery,
        DataApiHistoricalResponse[]
    >;
    private readonly rawQueryExecutor: PendingExecutor<any, any>;
    private readonly aggregateQueryExecutor: PendingExecutor<
        DataApiAggregateQuery,
        DataApiAggregateResponse
    >;

    constructor(
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
        private readonly apiConfigService: ApiConfigService,
        private readonly cachingService: CachingService,
    ) {
        this.dataApiClient = new DataApiClient({
            host: 'dex-service',
            dataApiUrl: process.env.ELRONDDATAAPI_URL,
            multiversXApiUrl: this.apiConfigService.getApiUrl(),
            proxyTimeout: mxConfig.proxyTimeout,
            keepAlive: {
                maxSockets: mxConfig.keepAliveMaxSockets,
                maxFreeSockets: mxConfig.keepAliveMaxFreeSockets,
                timeout: this.apiConfigService.getKeepAliveTimeoutDownstream(),
                freeSocketTimeout: mxConfig.keepAliveFreeSocketTimeout,
            },
            signerPrivateKey: fs
                .readFileSync(this.apiConfigService.getNativeAuthKeyPath())
                .toString(),
        });

        this.historicalQueryExecutor = new PendingExecutor((query) =>
            this.dataApiClient.executeHistoricalQuery(query),
        );
        this.rawQueryExecutor = new PendingExecutor((query) =>
            this.dataApiClient.executeRawQuery(query),
        );
        this.aggregateQueryExecutor = new PendingExecutor((query) =>
            this.dataApiClient.executeAggregateQuery(query),
        );
    }

    @DataApiQuery()
    async getAggregatedValue({
        series,
        metric,
        time,
    }: AnalyticsQueryArgs): Promise<string> {
        const [startDate, endDate] = computeTimeInterval(time);

        const query = DataApiQueryBuilder.createXExchangeAnalyticsQuery()
            .metric(series, metric)
            .betweenDates(startDate, endDate)
            .getAggregate(AggregateValue.sum);

        const data = await this.aggregateQueryExecutor.execute(query);

        const value = new BigNumber(data?.sum ?? '0').toFixed();
        return value;
    }

    @DataApiQuery()
    async getLatestCompleteValues({
        series,
        metric,
    }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
        const completeValues = await this.getCompleteValues(series, metric);

        const latestCompleteValues = completeValues.map((value) =>
            HistoricDataModel.fromCompleteValues(value, 'last'),
        );
        return latestCompleteValues;
    }

    @DataApiQuery()
    async getSumCompleteValues({
        series,
        metric,
    }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
        const completeValues = await this.getCompleteValues(series, metric);

        const sumCompleteValues = completeValues.map((value) =>
            HistoricDataModel.fromCompleteValues(value, 'sum'),
        );
        return sumCompleteValues;
    }

    @DataApiQuery()
    async getValues24h({
        series,
        metric,
    }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
        const query = DataApiQueryBuilder.createXExchangeAnalyticsQuery()
            .metric(series, metric)
            .withTimeRange(TimeRange.DAY)
            .withTimeResolution(TimeResolution.INTERVAL_HOUR)
            .getHistorical(HistoricalValue.last, HistoricalValue.time);

        const rows = await this.historicalQueryExecutor.execute(query);

        const data = rows.map((row) =>
            HistoricDataModel.fromDataApiResponse(row, HistoricalValue.last),
        );
        return data;
    }

    @DataApiQuery()
    async getValues24hSum({
        series,
        metric,
    }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
        const query = DataApiQueryBuilder.createXExchangeAnalyticsQuery()
            .metric(series, metric)
            .withTimeRange(TimeRange.DAY)
            .withTimeResolution(TimeResolution.INTERVAL_HOUR)
            .fillDataGaps()
            .getHistorical(HistoricalValue.sum, HistoricalValue.time);

        const rows = await this.historicalQueryExecutor.execute(query);

        const data = rows.map((row) =>
            HistoricDataModel.fromDataApiResponse(row, HistoricalValue.sum),
        );
        return data;
    }

    @DataApiQuery()
    async getLatestHistoricData({
        time,
        series,
        metric,
        start,
    }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
        const [startDate, endDate] = computeTimeInterval(time, start);

        const query = `query getLatestHistoricData($series: String!, $metric: String!, $startDate: DateTime!, $endDate: DateTime!) {
            xExchangeAnalytics {
                values(series: $series, key: $metric, filter: {
                    sort: ASC, start_date: $startDate, end_date: $endDate
                }) {
                    value
                    time
                }
            }
        }`;

        const variables = {
            series,
            metric,
            startDate: moment.utc(startDate).format('YYYY-MM-DD HH:mm:ss'),
            endDate: moment.utc(endDate).format('YYYY-MM-DD HH:mm:ss'),
        };

        const response = await this.rawQueryExecutor.execute({
            query,
            variables,
        });
        const rows = response.xExchangeAnalytics.values;

        const data = rows.map(
            (row: any) =>
                new HistoricDataModel({
                    timestamp: moment.utc(row.time).unix().toString(),
                    value: new BigNumber(row.value ?? '0').toFixed(),
                }),
        );
        return data;
    }

    @DataApiQuery()
    async getLatestBinnedHistoricData({
        time,
        series,
        metric,
        start,
        bin,
    }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
        const [startDate, endDate] = computeTimeInterval(time, start);
        const timeResolution = convertBinToTimeResolution(bin);

        const query = DataApiQueryBuilder.createXExchangeAnalyticsQuery()
            .metric(series, metric)
            .betweenDates(startDate, endDate)
            .withTimeResolution(timeResolution)
            .fillDataGaps()
            .getHistorical(HistoricalValue.avg, HistoricalValue.time);

        const rows = await this.historicalQueryExecutor.execute(query);

        const data = rows.map((row) =>
            HistoricDataModel.fromDataApiResponse(row, HistoricalValue.max),
        );
        return data;
    }

    private async getCompleteValues(
        series: string,
        metric: string,
    ): Promise<any[]> {
        try {
            const hashCacheKey = generateCacheKeyFromParams(
                'timeseries',
                series,
                metric,
            );

            const [startDate, endDate] = await this.getCompleteValuesDateRange(
                series,
                metric,
            );

            const completeValues = [];
            for (
                let date = startDate.clone();
                date.isSameOrBefore(endDate);
                date.add(1, 'month')
            ) {
                const intervalStart = date.clone();
                const intervalEnd = moment.min(
                    date.clone().add(1, 'month').subtract(1, 's'),
                    endDate,
                );

                const keys = generateCacheKeysForTimeInterval(
                    intervalStart,
                    intervalEnd,
                );

                const values = await this.cachingService.getMultipleFromHash(
                    hashCacheKey,
                    keys,
                );
                let intervalValues = computeIntervalValues(keys, values);

                if (values.some((value) => value === null)) {
                    const rows = await this.getCompleteValuesInInterval(
                        series,
                        metric,
                        intervalStart.toDate(),
                        intervalEnd.toDate(),
                    );

                    const toBeInserted =
                        convertDataApiHistoricalResponseToHash(rows);
                    if (toBeInserted.length > 0) {
                        const redisValues = toBeInserted.map(
                            ({ field, value }) => [
                                field,
                                JSON.stringify(value),
                            ],
                        ) as [string, string][];
                        await this.cachingService.setMultipleInHash(
                            hashCacheKey,
                            redisValues,
                        );
                    }

                    intervalValues = toBeInserted;
                }

                completeValues.push(...intervalValues);
            }

            // handle current time
            const currentRows = await this.getCompleteValuesInInterval(
                series,
                metric,
                moment.utc().startOf('day').toDate(),
                moment.utc().toDate(),
            );
            const [currentValue] =
                convertDataApiHistoricalResponseToHash(currentRows);

            if (completeValues.length > 0) {
                completeValues[completeValues.length - 1] = currentValue;
            } else {
                completeValues.push(currentValue);
            }

            return completeValues;
        } catch (error) {
            console.log(error);
            return [];
        }
    }

    @DataApiQuery()
    private async getCompleteValuesInInterval(
        series: string,
        metric: string,
        intervalStart: Date,
        intervalEnd: Date,
    ): Promise<any[]> {
        const query = DataApiQueryBuilder.createXExchangeAnalyticsQuery()
            .metric(series, metric)
            .betweenDates(intervalStart, intervalEnd)
            .withTimeResolution(TimeResolution.INTERVAL_DAY)
            .fillDataGaps({ skipFirstNullValues: true })
            .getHistorical(
                HistoricalValue.last,
                HistoricalValue.sum,
                HistoricalValue.time,
            );

        const rows = await this.historicalQueryExecutor.execute(query);
        return rows;
    }

    @DataApiQuery()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private async getCompleteValuesDateRange(
        series: string,
        metric: string,
    ): Promise<[moment.Moment, moment.Moment]> {
        // const query = DataApiQueryBuilder
        //   .createXExchangeAnalyticsQuery()
        //   .metric(series, metric)
        //   .getFirst();

        // const firstRecord = await this.dataApiClient.executeValueQuery(query);
        const firstRecord = undefined;
        const startDate = firstRecord?.timestamp
            ? moment.utc(firstRecord.timestamp * 1000).startOf('day')
            : moment.utc('2021-11-15').startOf('day'); // dex launch date

        const endDate = moment.utc();

        return [startDate, endDate];
    }
}
