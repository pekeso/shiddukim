import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { R2Client } from './r2.client.js';
import { StorageService } from './storage.service.js';

/**
 * StorageModule — provides R2Client and StorageService to the application.
 *
 * Export both providers so any module that imports StorageModule can inject
 * StorageService directly (e.g. DocumentsModule, future MembersModule for photos).
 *
 * This module does NOT depend on PrismaModule — storage is purely file I/O.
 * Database metadata (Document, FileAccessLog) is the responsibility of DocumentsModule.
 */
@Module({
  imports: [ConfigModule],
  providers: [R2Client, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
