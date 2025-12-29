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

    // Formatear fecha de recepción (receipt_date)
    const receiptDate = (() => {
      const date = new Date(receipt.receipt_date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })();

    // Formatear fecha de confirmación (confirmed_at) o fecha actual si no hay confirmed_at
    const confirmationDate = receipt.confirmed_at 
      ? (() => {
          const date = new Date(receipt.confirmed_at);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })()
      : (() => {
          const date = new Date();
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })();

    // Crear notificación para cada admin
    const notifications = adminUsers.map(admin => ({
      user_id: admin.id,
      type: 'WAREHOUSE_RECEIPT_CONFIRMED',
      payload: {
        receiptId: receipt.id,
        receiptDate, // Fecha de recepción
        confirmationDate, // Fecha de confirmación
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

  async createEditRequestNotification(
    companyId: string,
    editRequest: any,
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
      type: 'WAREHOUSE_EDIT_REQUEST',
      payload: {
        editRequestId: editRequest.id,
        receiptId: editRequest.warehouse_receipt_id,
        date: (() => {
          const date = new Date(editRequest.warehouse_receipt.receipt_date);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })(),
        location: editRequest.warehouse_receipt.location.name,
        requestedBy: `${editRequest.requester.first_name || ''} ${editRequest.requester.last_name || ''}`.trim() || editRequest.requester.username,
      },
      read: false,
    }));

    if (notifications.length > 0) {
      await this.prisma.notification.createMany({
        data: notifications,
      });
    }
  }

  async createEditRequestResponseNotification(
    userId: string,
    editRequest: any,
  ) {
    const statusText = editRequest.status === 'APPROVED' ? 'aprobada' : 'rechazada';
    
    const notification = {
      user_id: userId,
      type: 'WAREHOUSE_EDIT_REQUEST_RESPONSE',
      payload: {
        editRequestId: editRequest.id,
        receiptId: editRequest.warehouse_receipt_id,
        status: editRequest.status,
        statusText,
        date: (() => {
          const date = new Date(editRequest.warehouse_receipt.receipt_date);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })(),
        location: editRequest.warehouse_receipt.location.name,
        rejectionReason: editRequest.rejection_reason || null,
        reviewedBy: editRequest.approver ? 
          `${editRequest.approver.first_name || ''} ${editRequest.approver.last_name || ''}`.trim() || editRequest.approver.username
          : null,
      },
      read: false,
    };

    await this.prisma.notification.create({
      data: notification,
    });
  }
}

