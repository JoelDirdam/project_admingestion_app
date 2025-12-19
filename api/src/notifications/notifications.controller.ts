import { Controller, Get, Patch, Param, Query, UseGuards, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(
    @Query('unreadOnly') unreadOnly: string,
    @Request() req,
  ) {
    const unreadOnlyBool = unreadOnly === 'true';
    return this.notificationsService.findAll(
      req.user.userId,
      req.user.companyId,
      unreadOnlyBool,
    );
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const count = await this.notificationsService.getUnreadCount(
      req.user.userId,
      req.user.companyId,
    );
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') notificationId: string, @Request() req) {
    return this.notificationsService.markAsRead(
      notificationId,
      req.user.userId,
      req.user.companyId,
    );
  }
}

