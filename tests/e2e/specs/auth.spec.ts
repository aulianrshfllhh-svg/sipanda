import { expect, test } from '@playwright/test';

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
