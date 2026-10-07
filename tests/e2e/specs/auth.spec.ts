import { expect, test } from '@playwright/test';

test('pengunjung tanpa sesi diarahkan ke halaman login untuk URL editor yang langsung dibuka', async ({ page }) => {
  await page.goto('/editor/document-test', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/login\?redirect=\/editor\/document-test/);
  await expect(page.getByRole('heading', { name: 'Masuk ke Sistem' })).toBeVisible();
});

test('pengunjung tanpa sesi diarahkan ke halaman login', async ({ page }) => {
  await page.goto('/dokumen');
  await expect(page).toHaveURL(/\/login\?redirect=/);
  await expect(page.getByRole('heading', { name: 'Masuk ke Sistem' })).toBeVisible();
});

test('akun OPD dapat masuk dan tidak memperoleh API khusus staf', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username / NIP').fill('test-opd');
  await page.getByLabel('Password', { exact: true }).fill('sipanda-test-password');
  await page.getByRole('button', { name: /Sign In \/ Masuk Sistem/ }).click();

  await expect(page).not.toHaveURL(/\/login/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sipanda_token'))).toBeTruthy();
  const staffResponse = await page.evaluate(async () => {
    const token = localStorage.getItem('sipanda_token');
    const response = await fetch('/api/staf', { headers: { Authorization: `Bearer ${token}` } });
    return response.status;
  });
  expect(staffResponse).toBe(403);
});

test('verifikator tanpa penugasan ditolak saat membuka URL dokumen langsung', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username / NIP').fill('test-staff');
  await page.getByLabel('Password', { exact: true }).fill('sipanda-test-password');
  await page.getByRole('button', { name: /Sign In \/ Masuk Sistem/ }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sipanda_token'))).toBeTruthy();

  await page.goto('/editor/document-test');

  await expect(page).toHaveURL(/\/dokumen$/);
  await expect(page.getByText('Dokumen tidak termasuk penugasan Anda')).toBeVisible();
});

test('editor menyimpan perubahan bab otomatis dan mempertahankannya setelah muat ulang', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username / NIP').fill('test-opd');
  await page.getByLabel('Password', { exact: true }).fill('sipanda-test-password');
  await page.getByRole('button', { name: /Sign In \/ Masuk Sistem/ }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sipanda_token'))).toBeTruthy();
  await page.goto('/editor/document-test');

  const section = page.locator('.ProseMirror[data-bab-id="bab-1"][data-sub-id="sub-1"]');
  await expect(section).toBeVisible();
  const saved = page.waitForResponse(response =>
    response.url().includes('/api/documents/document-test') && response.request().method() === 'PUT'
  );
  await section.fill('Isi otomatis tersimpan dari tes Chromium.');
  expect((await saved).ok()).toBe(true);

  await page.reload();
  await expect(section).toContainText('Isi otomatis tersimpan dari tes Chromium.');
});
