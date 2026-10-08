export function registerNotificationRoutes(app, prisma, authMiddleware, isSuperAdmin) {
  app.get('/api/notifications', authMiddleware, async (req, res) => {
    const user = req.currentUser;
    if (user.role !== 'opd' && !isSuperAdmin(user)) {
      return res.status(403).json({ error: 'Notifikasi tidak tersedia untuk peran ini' });
    }

    try {
      const notifications = await prisma.notification.findMany({
        where: user.role === 'opd' ? { opdId: user.opdId } : { senderId: user.id },
        include: user.role === 'opd'
          ? { sender: { select: { nama: true } } }
          : { opd: { select: { nama: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
      const entries = notifications.map(notification => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        createdAt: notification.createdAt,
        readAt: notification.readAt,
        senderName: notification.sender?.nama || null,
        opdName: notification.opd?.nama || null
      }));
      if (user.role === 'opd') return res.json(entries);

      const grouped = new Map();
      for (const notification of entries) {
        const key = `${new Date(notification.createdAt).getTime()}|${notification.title}|${notification.message}`;
        const group = grouped.get(key);
        if (group) {
          group.opdNames.push(notification.opdName);
        } else {
          grouped.set(key, { ...notification, opdNames: [notification.opdName] });
        }
      }
      res.json([...grouped.values()].map(({ opdNames, ...notification }) => ({
        ...notification,
        readAt: null,
        opdName: opdNames.length > 1 ? `Semua OPD (${opdNames.length})` : opdNames[0]
      })));
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      res.status(500).json({ error: 'Gagal mengambil notifikasi' });
    }
  });

  app.post('/api/notifications', authMiddleware, async (req, res) => {
    const user = req.currentUser;
    if (!isSuperAdmin(user)) {
      return res.status(403).json({ error: 'Hanya Super Admin PPEPD yang dapat mengirim notifikasi' });
    }

    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
    const targetOpdId = req.body.opdId;
    if (!title || title.length > 150) {
      return res.status(400).json({ error: 'Judul notifikasi wajib diisi (maksimal 150 karakter)' });
    }
    if (!message || message.length > 3000) {
      return res.status(400).json({ error: 'Isi notifikasi wajib diisi (maksimal 3000 karakter)' });
    }
    if (typeof targetOpdId !== 'string' || !targetOpdId) {
      return res.status(400).json({ error: 'Pilih OPD penerima atau pilih semua OPD' });
    }

    try {
      const recipients = targetOpdId === 'all'
        ? await prisma.opd.findMany({ where: { isActive: true }, select: { id: true } })
        : await prisma.opd.findMany({ where: { id: targetOpdId, isActive: true }, select: { id: true } });
      if (recipients.length === 0) {
        return res.status(404).json({ error: targetOpdId === 'all' ? 'Tidak ada OPD aktif untuk menerima notifikasi' : 'OPD penerima tidak ditemukan atau tidak aktif' });
      }

      const sentAt = new Date();
      const result = await prisma.notification.createMany({
        data: recipients.map(opd => ({
          opdId: opd.id,
          senderId: user.id,
          title,
          message,
          createdAt: sentAt
        }))
      });
      res.status(201).json({ success: true, sentCount: result.count });
    } catch (error) {
      console.error('Failed to send notifications:', error);
      res.status(500).json({ error: 'Gagal mengirim notifikasi' });
    }
  });

  app.patch('/api/notifications/:id/read', authMiddleware, async (req, res) => {
    const user = req.currentUser;
    if (user.role !== 'opd' || !user.opdId) {
      return res.status(403).json({ error: 'Hanya penerima OPD yang dapat membaca notifikasi' });
    }

    try {
      const notification = await prisma.notification.findFirst({
        where: { id: req.params.id, opdId: user.opdId },
        select: { id: true, readAt: true }
      });
      if (!notification) return res.status(404).json({ error: 'Notifikasi tidak ditemukan' });

      const readAt = notification.readAt || new Date();
      if (!notification.readAt) {
        await prisma.notification.updateMany({
          where: { id: notification.id, opdId: user.opdId, readAt: null },
          data: { readAt }
        });
      }
      res.json({ success: true, readAt });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      res.status(500).json({ error: 'Gagal memperbarui status notifikasi' });
    }
  });
}
