<template>
  <main class="login-page">
    <div class="login-backdrop" aria-hidden="true">
      <div class="backdrop-glow"></div>
      <div class="backdrop-grid"></div>
    </div>

    <header class="system-bar">
      <div class="system-identity">
        <span class="system-mark" aria-hidden="true"></span>
        <span>SIPANDA Online</span>
        <span class="system-divider">|</span>
        <span>Pemerintah Daerah Kabupaten Cirebon</span>
      </div>
      <div class="system-tools">
        <span class="fiscal-year">
          <CalendarDays aria-hidden="true" />
          Tahun Anggaran {{ selectedYear }}/{{ Number(selectedYear) + 1 }}
        </span>
        <span class="help-label"><CircleHelp aria-hidden="true" /> Pusat Bantuan</span>
      </div>
    </header>

    <div class="login-content">
      <section class="login-card" aria-labelledby="login-title">
        <div class="branding-panel">
          <div class="district-identity">
            <KabCirebonLogo :width="34" :height="42" custom-class="district-emblem" />
            <div>
              <strong>PEMERINTAH KABUPATEN CIREBON</strong>
              <span>Bapperida</span>
            </div>
          </div>
          <div class="sipanda-brand" aria-label="SIPANDA">
            <svg class="sipanda-emblem" viewBox="540 60 740 570" aria-hidden="true">
              <image href="/images/sipanda-logo-20261005.png" width="1800" height="874" />
            </svg>
            <span>SIPANDA</span>
          </div>
          <div class="branding-copy">
            <h1 id="login-title">Sistem Informasi Perencanaan Daerah</h1>
            <p>Kabupaten Cirebon</p>
          </div>
          <div class="security-note">
            <ShieldCheck aria-hidden="true" />
            <span>Tersertifikasi Keamanan &amp; BSR-E BSSN</span>
          </div>
        </div>

        <div class="form-panel">
          <div class="form-heading">
            <h2>Masuk ke Sistem</h2>
            <p>Silakan masukkan kredensial akun OPD / Verifikator Anda.</p>
          </div>
          <form @submit.prevent="handleLogin" class="login-form">
            <label class="field-group">
              <span>Username / NIP</span>
              <span class="field">
                <UserRound class="field-icon" aria-hidden="true" />
              <input
                v-model="username"
                type="text"
                placeholder="Masukkan NIP atau Username SIASN"
                autocomplete="username"
                required
              />
              </span>
            </label>

            <label class="field-group">
              <span>Password</span>
              <span class="field password-field">
                <LockKeyhole class="field-icon" aria-hidden="true" />
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Masukkan password"
                autocomplete="current-password"
                required
              />
              <button
                type="button"
                class="password-toggle"
                :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
                :aria-pressed="showPassword"
                @click="showPassword = !showPassword"
              >
                <svg v-if="!showPassword" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="2.5" />
                </svg>
                <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m3 3 18 18M10.6 6.1A10.8 10.8 0 0 1 12 6c6.4 0 10 6 10 6a15.8 15.8 0 0 1-3.1 3.6M6.2 6.2C3.5 8 2 12 2 12s3.6 6 10 6c1.2 0 2.3-.2 3.3-.6" />
                </svg>
              </button>
              </span>
            </label>

            <label class="field-group">
              <span>Tahun Rencana / Anggaran</span>
              <span class="select-wrap">
                <select v-model="selectedYear" aria-label="Tahun Rencana atau Anggaran">
                  <option v-for="availableYear in store.availableYears" :key="availableYear" :value="availableYear">
                    Tahun Anggaran {{ availableYear }}
                  </option>
                </select>
                <ChevronDown aria-hidden="true" />
              </span>
            </label>

            <p v-if="sessionExpired" class="login-error" role="status">Sesi Anda telah berakhir. Silakan masuk kembali untuk melanjutkan.</p>
            <p v-if="errorMessage" class="login-error" role="alert">{{ errorMessage }}</p>

            <button type="submit" class="submit-button" :disabled="isLoading">
              <span v-if="isLoading" class="spinner" aria-hidden="true"></span>
              {{ isLoading ? 'Memproses...' : 'Sign In / Masuk Sistem' }}
            </button>
          </form>

          <div class="form-footer">
            <span>Belum punya akun? <strong>Hubungi Bapperida</strong></span>
            <span class="version">v2.0.0 · SIPANDA</span>
          </div>
        </div>
      </section>
    </div>

    <footer class="copyright">
      <span>© {{ year }} Pemerintah Daerah Kabupaten Cirebon. Hak Cipta Dilindungi.</span>
      <div class="footer-links">
        <span>Kebijakan Privasi</span>
        <span aria-hidden="true">·</span>
        <span>Standar Keamanan Informasi</span>
        <span aria-hidden="true">·</span>
        <span>Bantuan Helpdesk</span>
      </div>
    </footer>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { CalendarDays, ChevronDown, CircleHelp, LockKeyhole, ShieldCheck, UserRound } from '@lucide/vue';
import KabCirebonLogo from '../components/common/KabCirebonLogo.vue';
import { useAppStore } from '../stores/appStore';

const router = useRouter();
const store = useAppStore();

const username = ref('');
const password = ref('');
const showPassword = ref(false);
const errorMessage = ref('');
const isLoading = ref(false);
const year = computed(() => new Date().getFullYear());
const selectedYear = computed({
  get: () => store.selectedTahun,
  set: (value: string) => store.setSelectedTahun(value)
});
const sessionExpired = computed(() => router.currentRoute.value.query.expired === '1');

onMounted(async () => {
  if (!store.isAuthenticated) return;
  await store.fetchCurrentUser();
  if (store.isAuthenticated) router.replace('/');
});

const handleLogin = async () => {
  errorMessage.value = '';

  if (!username.value.trim() || !password.value.trim()) {
    errorMessage.value = 'Username dan password wajib diisi';
    return;
  }

  isLoading.value = true;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value.trim(),
        password: password.value.trim()
      })
    });

    if (!res.headers.get('content-type')?.includes('application/json')) {
      errorMessage.value = 'Server API belum tersedia. Jalankan start.bat di folder SIPANDA, lalu coba masuk kembali.';
      return;
    }

    const data = await res.json();

    if (!res.ok) {
      errorMessage.value = data.error || 'Login gagal';
      return;
    }

    localStorage.setItem('sipanda_token', data.token);
    localStorage.setItem('sipanda_user', JSON.stringify(data.user));

    store.currentUser = data.user;
    store.isAuthenticated = true;

    await store.fetchCurrentUser();
    await store.fetchOpds();
    await store.fetchDocuments();
    const returnTo = sessionStorage.getItem('sipanda_return_to')
      || (typeof router.currentRoute.value.query.redirect === 'string' ? router.currentRoute.value.query.redirect : null);
    sessionStorage.removeItem('sipanda_return_to');
    router.replace(returnTo?.startsWith('/') && !returnTo.startsWith('//') && !returnTo.startsWith('/login') ? returnTo : '/');
  } catch {
    errorMessage.value = 'Tidak dapat terhubung ke server. Jalankan start.bat di folder SIPANDA, lalu coba masuk kembali.';
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.login-page {
  --night: #071b3c;
  --panel: #101f35;
  --line: rgba(174, 195, 231, 0.24);
  position: relative;
  display: grid;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
  place-items: center;
  padding: 64px 24px 44px;
  color: #e7efff;
  background: radial-gradient(ellipse at 50% 42%, #164786 0%, #0d3269 43%, var(--night) 100%);
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.login-page::before {
  position: absolute;
  inset: 0 0 auto;
  z-index: 1;
  height: 7px;
  background: #7162ed;
  content: '';
}

.login-backdrop,
.backdrop-glow,
.backdrop-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.backdrop-glow {
  background:
    radial-gradient(ellipse at 50% 54%, rgba(47, 112, 207, 0.32), transparent 55%),
    linear-gradient(180deg, rgba(7, 22, 48, 0.03), rgba(4, 15, 34, 0.32));
}

.backdrop-grid {
  opacity: 0.11;
  background-image:
    linear-gradient(rgba(203, 219, 255, 0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(203, 219, 255, 0.12) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: linear-gradient(to bottom, transparent, black 16%, black 80%, transparent);
}

.system-bar {
  position: absolute;
  z-index: 2;
  top: 7px;
  right: 12px;
  left: 12px;
  display: flex;
  min-height: 22px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 10px;
  border-bottom: 1px solid rgba(187, 204, 241, 0.25);
  color: rgba(218, 229, 255, 0.7);
  font-size: 9px;
  letter-spacing: 0.035em;
}

.system-identity {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.system-mark {
  width: 6px;
  height: 6px;
  flex: 0 0 auto;
  border-radius: 2px;
  background: #76e1b2;
  box-shadow: 0 0 9px rgba(118, 225, 178, 0.75);
}

.system-divider {
  color: rgba(218, 229, 255, 0.36);
}

.fiscal-year {
  flex: 0 0 auto;
  font-variant-numeric: tabular-nums;
}

.login-content {
  position: relative;
  z-index: 1;
  display: flex;
  width: min(100%, 760px);
  flex-direction: column;
  align-items: center;
  margin: auto;
}

.login-card {
  display: grid;
  width: 100%;
  min-height: 250px;
  grid-template-columns: 1fr 1fr;
  border: 1px solid rgba(165, 189, 231, 0.14);
  background: rgba(15, 29, 49, 0.96);
  box-shadow:
    0 24px 60px rgba(1, 9, 23, 0.42),
    0 0 0 1px rgba(174, 202, 255, 0.035),
    inset 0 1px rgba(255, 255, 255, 0.025);
}

.branding-panel,
.form-panel {
  min-width: 0;
  margin: 30px 0;
}

.branding-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 32px;
  text-align: center;
}

.district-emblem {
  align-self: flex-start;
  width: 30px;
  height: 36px;
  flex: 0 0 30px;
  margin-bottom: 8px;
}

.branding-copy h1 {
  max-width: 250px;
  margin: 0 auto;
  color: #eef3ff;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.35;
}

.branding-copy p {
  margin: 5px 0 0;
  color: #aebddd;
  font-size: 12px;
  letter-spacing: 0.035em;
}

.form-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 42px 0 36px;
  border-left: 1px solid var(--line);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.field {
  position: relative;
  display: flex;
  min-height: 26px;
  align-items: center;
  border-bottom: 1px solid rgba(207, 220, 246, 0.55);
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.field:focus-within {
  border-color: #96b5ff;
  box-shadow: 0 1px #96b5ff;
}

.field input {
  width: 100%;
  min-width: 0;
  padding: 3px 0 6px;
  border: 0;
  outline: 0;
  color: #f3f6ff;
  background: transparent;
  font: inherit;
  font-size: 13px;
}

.field input::placeholder {
  color: #aebbd0;
  opacity: 1;
}

.password-field input {
  padding-right: 28px;
}

.password-toggle {
  position: absolute;
  right: 0;
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border: 0;
  color: #879bbd;
  background: transparent;
  cursor: pointer;
}

.password-toggle:hover,
.password-toggle:focus-visible {
  color: #dce7ff;
}

.password-toggle svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.5;
}

.login-error {
  margin: -8px 0 -6px;
  color: #fecaca;
  font-size: 11px;
  line-height: 1.45;
}

.submit-button {
  display: flex;
  min-height: 34px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 2px;
  border: 1px solid rgba(195, 212, 246, 0.55);
  color: #edf3ff;
  background: rgba(255, 255, 255, 0.025);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: #afc7ff;
  background: rgba(107, 145, 225, 0.16);
}

.submit-button:focus-visible,
.password-toggle:focus-visible {
  outline: 2px solid #a8c1ff;
  outline-offset: 3px;
}

.submit-button:disabled {
  cursor: wait;
  opacity: 0.72;
}

.spinner {
  width: 13px;
  height: 13px;
  border: 2px solid rgba(237, 243, 255, 0.35);
  border-top-color: #edf3ff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.form-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 17px;
  color: #93a5c4;
  font-size: 9px;
}

.version {
  color: #8193b4;
  white-space: nowrap;
}

.copyright {
  margin-top: 27px;
  color: rgba(213, 224, 249, 0.68);
  font-size: 9px;
  letter-spacing: 0.035em;
  text-align: center;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 640px) {
  .login-page {
    padding: 58px 16px 32px;
  }

  .system-bar {
    right: 8px;
    left: 8px;
    padding: 0 5px;
    font-size: 8px;
  }

  .system-identity {
    gap: 6px;
  }

  .login-content {
    width: min(100%, 420px);
  }

  .login-card {
    grid-template-columns: 1fr;
  }

  .branding-panel {
    margin: 0;
    padding: 24px 20px 20px;
  }

  .district-emblem {
    align-self: flex-start;
    margin-bottom: 8px;
  }

  .form-panel {
    margin: 0;
    padding: 22px 26px 24px;
    border-top: 1px solid var(--line);
    border-left: 0;
  }

  .login-form {
    gap: 16px;
  }

  .copyright {
    max-width: 300px;
    line-height: 1.5;
  }
}

@media (max-height: 560px) and (min-width: 641px) {
  .login-page {
    padding-top: 42px;
    padding-bottom: 24px;
  }

  .login-card {
    min-height: 210px;
  }

  .branding-panel,
  .form-panel {
    margin: 20px 0;
  }

  .district-emblem {
    transform: scale(0.82);
    margin: -5px 0 3px;
  }

  .copyright {
    margin-top: 13px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}

.login-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 56px 24px 52px;
  background: radial-gradient(ellipse at 50% 48%, #111e35 0%, #091426 72%);
}

.login-page::before {
  display: none;
}

.backdrop-glow {
  background: radial-gradient(ellipse at 50% 46%, rgba(43, 77, 136, 0.16), transparent 62%);
}

.backdrop-grid {
  opacity: 0.13;
  background-size: 46px 46px;
  mask-image: none;
}

.system-bar {
  top: 0;
  right: 0;
  left: 0;
  min-height: 40px;
  padding: 0 26px;
  border-bottom-color: rgba(148, 163, 184, 0.17);
  color: #c3cede;
  font-size: 11px;
}

.system-mark {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.35);
}

.system-identity {
  gap: 10px;
}

.system-divider {
  margin: 0 3px;
  color: #4b5a70;
}

.system-tools {
  display: flex;
  align-items: center;
  gap: 16px;
}

.fiscal-year,
.help-label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
}

.fiscal-year {
  padding: 5px 9px;
  border: 1px solid #2a3951;
  border-radius: 4px;
  background: #111e32;
}

.fiscal-year svg,
.help-label svg {
  width: 12px;
  height: 12px;
  color: #9aabc4;
}

.fiscal-year svg {
  color: #60a5fa;
}

.login-content {
  width: min(100%, 864px);
  flex: 1;
  justify-content: center;
  margin: auto;
}

.login-card {
  min-height: 514px;
  grid-template-columns: minmax(0, 358px) minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.13);
  border-radius: 16px;
  background: #0e192d;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.3);
}

.branding-panel,
.form-panel {
  margin: 0;
}

.branding-panel {
  position: relative;
  justify-content: flex-start;
  padding: 34px 36px 88px;
  border-right: 1px solid rgba(148, 163, 184, 0.17);
}

.district-identity {
  display: flex;
  width: 100%;
  align-items: center;
  align-self: flex-start;
  gap: 14px;
  text-align: left;
}

.district-identity > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.district-identity strong {
  color: #75b9ff;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.055em;
}

.district-identity span {
  color: #d4deed;
  font-size: 11px;
}

.district-emblem {
  width: 34px;
  height: 42px;
  flex: 0 0 34px;
  margin: 0;
}

.sipanda-emblem {
  display: block;
  width: 132px;
  height: 104px;
  margin: 0 auto;
  overflow: hidden;
  padding: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.sipanda-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 48px auto 36px;
}

.sipanda-brand span {
  margin-top: -2px;
  color: #f7f9ff;
  font-size: 23px;
  font-weight: 750;
  letter-spacing: 0.02em;
}

.branding-copy h1 {
  max-width: 270px;
  font-size: 15px;
  font-weight: 650;
  letter-spacing: 0.015em;
}

.branding-copy p {
  margin-top: 6px;
  font-size: 11px;
}

.security-note {
  position: absolute;
  right: 36px;
  bottom: 28px;
  left: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding-top: 20px;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
  color: #a7b6cc;
  font-size: 10px;
}

.security-note svg {
  width: 14px;
  height: 14px;
  color: #10b981;
}

.form-panel {
  justify-content: center;
  padding: 38px 39px;
  border-left: 0;
}

.form-heading {
  margin-bottom: 24px;
}

.form-heading h2 {
  margin: 0;
  color: #f1f5fb;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.025em;
}

.form-heading p {
  margin: 6px 0 0;
  color: #9eacc1;
  font-size: 11px;
  line-height: 1.5;
}

.login-form {
  gap: 15px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #d7e0ee;
  font-size: 11px;
}

.field {
  min-height: 40px;
  gap: 10px;
  padding: 0 11px;
  border: 1px solid #2c3a51;
  border-radius: 7px;
  background: #070f1f;
}

.field:focus-within {
  border-color: #4e85ee;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.14);
}

.field-icon {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
  color: #92a2ba;
}

.field input {
  height: 100%;
  padding: 0;
  font-size: 11px;
}

.field input::placeholder {
  color: #718098;
}

.password-field input {
  padding-right: 28px;
}

.password-toggle {
  right: 8px;
  width: 24px;
  height: 30px;
}

.password-toggle svg {
  width: 14px;
  height: 14px;
}

.select-wrap {
  position: relative;
  display: flex;
  min-height: 40px;
  align-items: center;
  border: 1px solid #2c3a51;
  border-radius: 7px;
  background: #070f1f;
}

.select-wrap select {
  width: 100%;
  min-height: 38px;
  appearance: none;
  padding: 0 36px 0 11px;
  border: 0;
  outline: 0;
  color: #d7e0ee;
  background: transparent;
  font: inherit;
  font-size: 11px;
}

.select-wrap:focus-within {
  border-color: #4e85ee;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.14);
}

.select-wrap > svg {
  position: absolute;
  right: 11px;
  width: 14px;
  height: 14px;
  color: #8797ae;
  pointer-events: none;
}

.login-error {
  margin: -3px 0;
}

.submit-button {
  min-height: 40px;
  margin-top: 1px;
  border: 1px solid #3678f4;
  border-radius: 7px;
  background: #2864e8;
  color: #fff;
  font-size: 12px;
}

.submit-button:hover:not(:disabled) {
  border-color: #5890ff;
  background: #3474f5;
}

.form-footer {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
  font-size: 10px;
}

.form-footer strong {
  color: #70b7ff;
  font-weight: 500;
}

.copyright {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  min-height: 43px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 0;
  padding: 0 24px;
  border-top: 1px solid rgba(148, 163, 184, 0.17);
  color: #a7b6cc;
  font-size: 10px;
  text-align: left;
}

.footer-links {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #8797ae;
}

@media (max-width: 700px) {
  .login-page {
    min-height: 100vh;
    min-height: 100dvh;
    padding: 56px 14px 58px;
  }

  .system-bar {
    right: 0;
    left: 0;
    min-height: 40px;
    gap: 8px;
    padding: 0 10px;
    font-size: 9px;
  }

  .system-identity {
    gap: 7px;
  }

  .system-identity > span:last-child,
  .help-label {
    display: none;
  }

  .fiscal-year {
    padding: 4px 6px;
    font-size: 8px;
  }

  .login-content {
    width: min(100%, 440px);
  }

  .login-card {
    min-height: 0;
    grid-template-columns: 1fr;
  }

  .branding-panel {
    min-height: 320px;
    padding: 22px 24px 68px;
    border-right: 0;
  }

  .sipanda-emblem {
    width: 122px;
    height: 96px;
  }

  .sipanda-brand {
    margin: 28px auto 20px;
  }

  .sipanda-brand span {
    font-size: 21px;
  }

  .security-note {
    right: 24px;
    bottom: 18px;
    left: 24px;
    padding-top: 12px;
  }

  .form-panel {
    padding: 28px 24px;
    border-top: 1px solid rgba(148, 163, 184, 0.17);
  }

  .form-heading {
    margin-bottom: 20px;
  }

  .copyright {
    right: 0;
    bottom: 0;
    left: 0;
    justify-content: center;
    min-height: 44px;
    padding: 0 10px;
    font-size: 9px;
    text-align: center;
  }

  .footer-links {
    display: none;
  }
}
</style>
