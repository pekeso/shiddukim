import { Module } from '@nestjs/common';
import { CommunitiesService } from './communities.service';
import { CommunitiesController } from './communities.controller';

/**
 * CommunitiesModule — manages church community groups.
 *
 * Dependencies:
 *   PrismaModule — global, no explicit import needed
 */
@Module({
  controllers: [CommunitiesController],
  providers: [CommunitiesService],
  exports: [CommunitiesService],
})
export class CommunitiesModule {}
