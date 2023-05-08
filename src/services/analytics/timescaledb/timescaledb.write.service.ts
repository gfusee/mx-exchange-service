import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { TimestreamWrite } from 'aws-sdk';
import { generateLogMessage } from 'src/utils/generate-log-message';
import * as moment from 'moment';
import { MetricsCollector } from 'src/utils/metrics.collector';
import { PerformanceProfiler } from 'src/utils/performance.profiler';
import { AnalyticsWriteInterface } from '../interfaces/analytics.write.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { XExchangeAnalyticsEntity } from './entities/timescaledb.entities';
import { Repository } from 'typeorm';

@Injectable()
export class TimescaleDBWriteService implements AnalyticsWriteInterface {
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
        @InjectRepository(XExchangeAnalyticsEntity)
        private readonly dexAnalytics: Repository<XExchangeAnalyticsEntity>,
    ) {}

    async ingest({ data, Time }) {
        try {
            const records = this.createRecords({ data, Time });
            await this.writeRecords(records);
        } catch (error) {
            const logMessage = generateLogMessage(
                TimescaleDBWriteService.name,
                this.ingest.name,
                '',
                {
                    message: error.message,
                    response: error.response?.data,
                    status: error.response?.status,
                },
            );
            this.logger.error(logMessage);
        }
    }

    async multiRecordsIngest(Records: TimestreamWrite.Records) {
        try {
            const ingestRecords =
                this.convertAWSRecordsToDataAPIRecords(Records);
            await this.writeRecords(ingestRecords);
        } catch (error) {
            const logMessage = generateLogMessage(
                TimescaleDBWriteService.name,
                this.multiRecordsIngest.name,
                '',
                {
                    message: error.message,
                    response: error.response?.data,
                    status: error.response?.status,
                },
            );
            this.logger.error(logMessage);
        }
    }

    private async writeRecords(
        records: XExchangeAnalyticsEntity[],
    ): Promise<void> {
        const profiler = new PerformanceProfiler('ingestData');

        try {
            await this.dexAnalytics.save(records);
        } catch (errors) {
            const logMessage = generateLogMessage(
                TimescaleDBWriteService.name,
                this.writeRecords.name,
                '',
                {
                    message: 'Internal Server Error',
                    status: 500,
                    response: errors,
                },
            );
            this.logger.error(logMessage);
        } finally {
            profiler.stop();

            MetricsCollector.setExternalCall(
                TimescaleDBWriteService.name,
                'ingestData',
                profiler.duration,
            );
        }
    }

    createRecords({ data, Time }): XExchangeAnalyticsEntity[] {
        const records: XExchangeAnalyticsEntity[] = [];
        Object.keys(data).forEach((series) => {
            Object.keys(data[series]).forEach((key) => {
                const value = data[series][key].toString();
                records.push(
                    new XExchangeAnalyticsEntity({
                        series,
                        key,
                        value,
                        timestamp: moment.unix(Time).toDate(),
                    }),
                );
            });
        });
        return records;
    }

    private convertAWSRecordsToDataAPIRecords(
        Records: TimestreamWrite.Records,
    ): XExchangeAnalyticsEntity[] {
        const ingestRecords = Records.map((record) => {
            return new XExchangeAnalyticsEntity({
                timestamp: moment.unix(parseInt(record.Time)).toDate(),
                series: record.Dimensions[0].Value,
                key: record.MeasureName,
                value: record.MeasureValue,
            });
        });
        return ingestRecords;
    }
}
