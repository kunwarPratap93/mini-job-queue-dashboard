import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    // ── TypeORM: PostgreSQL (production) or SQLite (local dev) ──────────────
    TypeOrmModule.forRoot(
      process.env.DATABASE_URL
        ? {
            type: 'postgres',
            url: process.env.DATABASE_URL,
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: true, // auto-sync schema for deployment/demo
            ssl:
              process.env.DATABASE_SSL === 'false'
                ? false
                : { rejectUnauthorized: false }, // required for cloud providers like Render / Supabase
            logging: process.env.NODE_ENV !== 'production',
          }
        : {
            type: 'sqlite',
            database: 'database.sqlite',
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: true, // auto-sync schema in dev
            logging: true,
          },
    ),

    // ── Feature modules ─────────────────────────────────────────────────────
    JobsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
