import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WarehouseReceipt } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async createWarehouseReceiptConfirmedNotification(
    companyId: string,
    receipt: WarehouseReceipt & {
      location: { name: string };
      user: { first_name: string | null; last_name: string | null; username: string };
    },
  ) {
    // Obtener todos los usuarios ADMIN de la compañía
    const adminUsers = await this.prisma.user.findMany({
      where: {
        company_id: companyId,
        role: 'ADMIN',
        is_active: true,
      },
    });

    // Crear notificación para cada admin
    const notifications = adminUsers.map(admin => ({
      user_id: admin.id,
      type: 'WAREHOUSE_RECEIPT_CONFIRMED',
      payload: {
        receiptId: receipt.id,
        date: (() => {
          // Formatear la fecha como YYYY-MM-DD en zona horaria local
          const date = new Date(receipt.receipt_date);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })(),
        location: receipt.location.name,
        confirmedByName: receipt.confirmed_by_name,
        createdBy: `${receipt.user.first_name || ''} ${receipt.user.last_name || ''}`.trim() || receipt.user.username,
      },
      read: false,
    }));

    if (notifications.length > 0) {
      await this.prisma.notification.createMany({
        data: notifications,
      });
    }
  }

  async findAll(userId: string, companyId: string, unreadOnly: boolean = false) {
    const where: any = {
      user_id: userId,
      user: {
        company_id: companyId,
      },
    };

    if (unreadOnly) {
      where.read = false;
    }

    return this.prisma.notification.findMany({
      where,
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async markAsRead(notificationId: string, userId: string, companyId: string) {
    // Verificar que la notificación existe y pertenece al usuario
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        user_id: userId,
        user: {
          company_id: companyId,
        },
      },
    });

    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }

    // Marcar como leída
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        read: true,
        read_at: new Date(),
      },
    });
  }

  async getUnreadCount(userId: string, companyId: string) {
    return this.prisma.notification.count({
      where: {
        user_id: userId,
        read: false,
        user: {
          company_id: companyId,
        },
      },
    });
  }
}

