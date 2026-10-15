<template>
  <main class="login-page">
    <section class="login-card" aria-labelledby="login-title">
      <header class="login-header">
        <div class="brand-group">
          <img class="brand-logo" src="/images/sipanda-logo-20261005.png" alt="SIPANDA" />
          <span class="brand-divider" aria-hidden="true"></span>
          <div class="agency-name">
            <strong>BAPPERIDA</strong>
            <span>Kabupaten Cirebon</span>
          </div>
        </div>

        <div class="header-tools">
          <label class="sr-only">
            Tahun Rencana atau Anggaran
            <select v-model="selectedYear" aria-label="Tahun Rencana atau Anggaran">
              <option v-for="availableYear in loginAvailableYears" :key="availableYear" :value="availableYear">
                {{ availableYear }}
              </option>
            </select>
          </label>
          <span class="system-pill"><span aria-hidden="true"></span>Sistem Terintegrasi v3.2</span>
        </div>
      </header>

      <div class="login-main">
        <section class="form-panel">
          <div class="form-heading">
            <h1 id="login-title">Login</h1>
            <p>Selamat datang di Sistem Informasi Perencanaan<br class="desktop-break" /> Daerah Kabupaten Cirebon.</p>
          </div>

          <form @submit.prevent="handleLogin" class="login-form">
            <label class="field-group">
              <span>Email / NIP / Username</span>
              <input
                v-model="username"
                type="text"
                placeholder="Masukkan email, NIP, atau username"
                autocomplete="username"
                required
              />
            </label>

            <label class="field-group">
              <span>Password</span>
              <span class="password-field">
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Please enter your password"
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

            <p v-if="sessionExpired" class="login-alert session-alert" role="status">
              Sesi Anda telah berakhir. Silakan masuk kembali untuk melanjutkan.
            </p>
            <p v-if="errorMessage" class="login-alert" role="alert">{{ errorMessage }}</p>

            <button type="submit" class="submit-button" :disabled="isLoading">
              <span v-if="isLoading" class="spinner" aria-hidden="true"></span>
              {{ isLoading ? 'Memproses...' : 'LOGIN' }}
            </button>
          </form>

          <section v-if="isDemoMode" class="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4" aria-label="Akun preview">
            <p class="text-xs font-bold text-amber-900">Preview demo — pilih peran untuk masuk</p>
            <p class="mt-1 text-[11px] leading-relaxed text-amber-800">Gunakan data contoh. Login ini hanya untuk pratinjau, bukan akun sistem resmi.</p>
            <div class="mt-3 grid gap-2 sm:grid-cols-2">
              <button type="button" class="rounded-lg bg-blue-700 px-3 py-2.5 text-xs font-bold text-white hover:bg-blue-800" @click="loginDemo('preview-admin')">Masuk sebagai Admin</button>
              <button type="button" class="rounded-lg border border-blue-200 bg-white px-3 py-2.5 text-xs font-bold text-blue-800 hover:bg-blue-50" @click="loginDemo('preview-opd-kesehatan')">Masuk sebagai OPD</button>
            </div>
          </section>

          <div class="form-links">
            <a href="#" @click.prevent>Lupa kata sandi akun?</a>
            <p>Butuh bantuan akses? Silakan hubungi <a href="#" @click.prevent>Bapperida Kab. Cirebon.</a></p>
          </div>
        </section>

        <div class="login-illustration" aria-hidden="true">
          <svg viewBox="0 0 620 440" role="presentation">
            <defs>
              <linearGradient id="illustrationCard" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#ffffff" />
                <stop offset="1" stop-color="#f5f9ff" />
              </linearGradient>
              <linearGradient id="blueBar" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stop-color="#66a5ff" />
                <stop offset="1" stop-color="#2364ef" />
              </linearGradient>
              <filter id="illustrationShadow" x="-20%" y="-20%" width="140%" height="150%">
                <feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#a5c5ee" flood-opacity="0.24" />
              </filter>
            </defs>
            <circle cx="320" cy="228" r="154" fill="#f5f9ff" />
            <circle cx="520" cy="61" r="9" fill="#b9d8ff" />
            <circle cx="565" cy="128" r="13" fill="#b9d8ff" />
            <ellipse cx="316" cy="411" rx="208" ry="9" fill="#e8f1ff" />

            <g transform="translate(178 20)">
              <ellipse cx="39" cy="34" rx="38" ry="21" fill="#e9f1fb" />
              <path d="M4 27c0-12 18-22 39-22s35 7 35 19-17 25-39 25S4 40 4 27Z" fill="#72adff" />
              <path d="M4 22c6 9 23 12 42 7 13-4 24-10 31-17v14c-9 13-27 22-42 23C18 51 5 42 4 32Z" fill="#3982fa" />
              <path d="M9 26c10 8 30 8 48 0" fill="none" stroke="#d9eaff" stroke-width="2" />
            </g>

            <g filter="url(#illustrationShadow)">
              <rect x="88" y="142" width="392" height="224" rx="15" fill="url(#illustrationCard)" stroke="#cedcf0" stroke-width="2" />
              <path d="M128 143v222" stroke="#e0e9f5" stroke-width="2" />
              <g fill="#acd0ff">
                <circle cx="107" cy="164" r="7" /><circle cx="107" cy="187" r="7" />
                <circle cx="107" cy="210" r="7" /><circle cx="107" cy="233" r="7" />
                <circle cx="107" cy="256" r="7" />
              </g>
              <rect x="145" y="161" width="78" height="8" rx="4" fill="#82baff" />
              <rect x="145" y="175" width="108" height="7" rx="3.5" fill="#e2eaf4" />
              <g fill="#4185fa">
                <rect x="428" y="157" width="8" height="8" rx="2" /><rect x="428" y="171" width="8" height="8" rx="2" /><rect x="428" y="185" width="8" height="8" rx="2" />
              </g>
              <g fill="#dfe8f4">
                <rect x="441" y="157" width="23" height="8" rx="2" /><rect x="441" y="171" width="23" height="8" rx="2" /><rect x="441" y="185" width="23" height="8" rx="2" />
              </g>
              <g fill="#b6d6ff">
                <circle cx="149" cy="204" r="5" /><circle cx="165" cy="204" r="5" /><circle cx="181" cy="204" r="5" />
              </g>
              <rect x="145" y="230" width="116" height="13" rx="6" fill="#deebff" />
              <rect x="145" y="230" width="91" height="13" rx="6" fill="#579bff" />
              <rect x="145" y="251" width="89" height="12" rx="6" fill="#e4efff" />
              <rect x="145" y="251" width="55" height="12" rx="6" fill="#8bc2ff" />
              <rect x="145" y="271" width="105" height="13" rx="6" fill="#deebff" />
              <rect x="145" y="271" width="81" height="13" rx="6" fill="url(#blueBar)" />
              <rect x="145" y="318" width="143" height="23" rx="6" fill="#f5f9ff" stroke="#d9e6f6" />
              <circle cx="157" cy="329" r="4" fill="#70acff" />
              <rect x="168" y="325" width="58" height="7" rx="3.5" fill="#c4dcff" />

              <circle cx="361" cy="228" r="53" fill="none" stroke="#bfdbff" stroke-width="27" />
              <path d="M324 190a53 53 0 0 1 74 0" fill="none" stroke="#5598fa" stroke-width="27" />
              <path d="M398 190a53 53 0 0 1 16 39" fill="none" stroke="#a8ccff" stroke-width="27" />
              <circle cx="361" cy="228" r="27" fill="#fff" />
              <rect x="387" y="297" width="88" height="24" rx="6" fill="#fff" stroke="#dbe7f6" />
              <circle cx="400" cy="309" r="4" fill="#67a7ff" />
              <rect x="410" y="305" width="51" height="7" rx="3.5" fill="#c7defe" />
            </g>

            <g transform="translate(25 255)">
              <path d="M28 12c0-8 6-14 14-14s14 6 14 14v7H28Z" fill="#17253a" />
              <circle cx="42" cy="14" r="11" fill="#f3cb56" />
              <path d="M31 10c4 5 14 6 22 0l-1-6H32Z" fill="#17253a" />
              <path d="m32 27-12 17-12 30 8 3 16-24 4 49h22l-2-49 13 24 8-4-11-31-12-15Z" fill="#2464ee" />
              <path d="m31 28-9 17 11 5 5-21m13 0 9 17-11 5-5-21" fill="#5599ff" />
              <path d="m35 102-3 55h12l3-48 4 48h12l-4-55Z" fill="#164ecb" />
              <path d="M32 157h13c2 0 5 3 6 5-5 4-16 4-23 1-2-2 1-6 4-6Zm19 0h12c3 0 6 3 7 6-6 4-17 3-23 0-1-2 1-6 4-6Z" fill="#17253a" />
              <g transform="translate(8 73) rotate(-3)">
                <rect width="120" height="71" rx="6" fill="#fff" stroke="#d3deed" stroke-width="2" />
                <circle cx="12" cy="12" r="3" fill="#6caaff" /><rect x="21" y="9" width="39" height="6" rx="3" fill="#e5edf7" />
                <rect x="16" y="42" width="9" height="19" rx="2" fill="#b8d8ff" />
                <rect x="36" y="32" width="9" height="29" rx="2" fill="#64a5ff" />
                <rect x="56" y="25" width="9" height="36" rx="2" fill="#2464ee" />
                <rect x="76" y="35" width="9" height="26" rx="2" fill="#93c2ff" />
                <rect x="96" y="29" width="9" height="32" rx="2" fill="#357cf4" />
              </g>
            </g>

            <g transform="translate(478 260)">
              <circle cx="24" cy="13" r="11" fill="#f3cb56" />
              <path d="M13 12c1-13 22-16 24-2l-3 7c-5-6-14-6-21-1Z" fill="#17253a" />
              <path d="m15 27-13 17-2 32 9 1 9-24 3 49h22l2-49 11 24 8-3-9-32-15-15Z" fill="#2464ee" />
              <path d="m17 29-10 17 11 5 6-22m12 0 10 17-11 5-5-22" fill="#63a3ff" />
              <path d="m19 102-2 55h12l3-48 4 48h12l-4-55Z" fill="#164ecb" />
              <path d="M17 157h13c3 0 6 3 6 5-5 4-17 4-23 1-1-2 1-6 4-6Zm21 0h12c3 0 6 3 7 6-6 4-17 3-23 0-1-2 1-6 4-6Z" fill="#17253a" />
              <rect x="-57" y="67" width="83" height="40" rx="6" fill="#fff" stroke="#d8e4f3" stroke-width="2" />
              <rect x="-49" y="75" width="51" height="6" rx="3" fill="#7cb5ff" />
              <rect x="-49" y="87" width="35" height="6" rx="3" fill="#e1ebf7" />
            </g>

            <g transform="translate(365 390)">
              <ellipse cx="42" cy="23" rx="36" ry="11" fill="#3859a4" />
              <path d="M18 15V-6l13-7v28Z" fill="#4c95fa" />
              <path d="M31 15V-19l13-6v42Z" fill="#8fc2ff" />
              <path d="M44 15V-4l13-7v26Z" fill="#3478ed" />
              <path d="m31-19 13-6v8l-13 7Z" fill="#bfddff" />
              <path d="m18-6 13-7v8l-13 7Z" fill="#b5d8ff" />
            </g>
          </svg>
        </div>
      </div>

      <footer class="login-footer">
        <span><i aria-hidden="true"></i> Pemerintah Kabupaten Cirebon © {{ year }}</span>
        <nav aria-label="Tautan informasi">
          <a href="#" @click.prevent>Panduan Pengguna</a>
          <span aria-hidden="true">·</span>
          <a href="#" @click.prevent>Kebijakan Privasi</a>
        </nav>
      </footer>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '../stores/appStore';
import { isPreviewDemo, previewUsers } from '../lib/preview-demo';

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
const loginAvailableYears = computed(() => {
  const currentYear = year.value;
  const years = Array.from({ length: 5 }, (_, index) => String(currentYear + index - 2));
  if (!years.includes(selectedYear.value)) years[2] = selectedYear.value;
  return years.sort((first, second) => Number(first) - Number(second));
});
const sessionExpired = computed(() => router.currentRoute.value.query.expired === '1');
const isDemoMode = isPreviewDemo;

function loginDemo(userId: string) {
  const user = previewUsers.find(candidate => candidate.id === userId);
  if (!isDemoMode || !user) return;
  localStorage.setItem('sipanda_token', 'sipanda-preview-demo');
  localStorage.setItem('sipanda_user', JSON.stringify(user));
  store.currentUser = user;
  store.availableUsers = previewUsers;
  store.isAuthenticated = true;
  store.loadPreferences(user.id);
  router.replace('/');
}

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

.login-page {
  display: grid;
  min-height: 100vh;
  min-height: 100dvh;
  overflow-x: hidden;
  overflow-y: auto;
  place-items: center;
  padding: 0;
  color: #111827;
  background: #edf3fb;
  font-family: 'Inter', 'Segoe UI', sans-serif;
}

.login-page::before {
  display: none;
}

.login-card {
  display: flex;
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  flex-direction: column;
  overflow: hidden;
  border: 0;
  border-radius: 0;
  background: #fff;
  box-shadow: 0 22px 48px rgba(64, 100, 154, 0.08);
}

.login-header {
  display: flex;
  min-height: clamp(55px, 8.54vw, 82px);
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: clamp(13px, 2.08vw, 20px) clamp(32px, 5vw, 48px) clamp(8px, 1.25vw, 12px);
}

.brand-group {
  display: flex;
  align-items: center;
  gap: clamp(8px, 1.25vw, 12px);
}

.brand-logo {
  display: block;
  width: clamp(44px, 6.875vw, 66px);
  height: clamp(25px, 3.85vw, 37px);
  object-fit: contain;
}

.brand-divider {
  width: 1px;
  height: clamp(19px, 2.92vw, 28px);
  background: #e6edf6;
}

.agency-name {
  display: flex;
  flex-direction: column;
  gap: clamp(2px, 0.3125vw, 3px);
}

.agency-name strong {
  color: #123f99;
  font-size: clamp(6px, 0.833vw, 8px);
  font-weight: 750;
  letter-spacing: 0.08em;
}

.agency-name span {
  color: #8090a8;
  font-size: clamp(6px, 0.833vw, 8px);
}

.system-pill {
  display: inline-flex;
  align-items: center;
  gap: clamp(5px, 0.73vw, 7px);
  padding: clamp(3px, 0.52vw, 5px) clamp(7px, 1.04vw, 10px);
  border: 1px solid #deebff;
  border-radius: 99px;
  color: #2364d8;
  background: #f5f9ff;
  font-size: clamp(6px, 0.833vw, 8px);
  white-space: nowrap;
}

.system-pill > span {
  width: clamp(4px, 0.625vw, 6px);
  height: clamp(4px, 0.625vw, 6px);
  border-radius: 50%;
  background: #10b981;
}

.login-main {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(clamp(170px, 26.56vw, 255px), 0.82fr) minmax(0, 1.5fr);
  align-items: center;
  gap: clamp(7px, 1.04vw, 10px);
  padding: clamp(3px, 0.42vw, 4px) clamp(32px, 5vw, 48px) clamp(8px, 1.25vw, 12px);
}

.form-panel {
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
  width: 90%;
  margin: 0;
  padding: 0;
}

.form-heading {
  margin: 0 0 clamp(16px, 2.5vw, 24px);
}

.form-heading h1 {
  margin: 0;
  color: #111827;
  font-size: clamp(18px, 2.8125vw, 27px);
  font-weight: 700;
  letter-spacing: -0.045em;
  line-height: 1.15;
}

.form-heading p {
  margin: clamp(5px, 0.73vw, 7px) 0 0;
  color: #8496b3;
  font-size: clamp(7px, 1.04vw, 10px);
  line-height: 1.5;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: clamp(11px, 1.77vw, 17px);
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: clamp(5px, 0.73vw, 7px);
  color: #14233c;
  font-size: clamp(6px, 0.9375vw, 9px);
  font-weight: 650;
}

.field-group > input,
.password-field {
  width: 100%;
  min-width: 0;
  height: clamp(20px, 3.02vw, 29px);
  padding: 0 clamp(6px, 0.9375vw, 9px);
  border: 0;
  border-bottom: 1px solid #8495b1;
  border-radius: 0;
  outline: 0;
  color: #1f2937;
  background: transparent;
  font: inherit;
  font-size: clamp(7px, 1.04vw, 10px);
  font-weight: 400;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.field-group > input:focus,
.password-field:focus-within {
  border-color: #2563eb;
  box-shadow: 0 1px #2563eb;
}

.field-group > input::placeholder,
.password-field input::placeholder {
  color: #8b9bb4;
  opacity: 1;
}

.password-field {
  position: relative;
  display: flex;
  align-items: center;
}

.password-field input {
  width: 100%;
  height: 100%;
  padding: 0 clamp(19px, 2.92vw, 28px) 0 0;
  border: 0;
  outline: 0;
  color: #1f2937;
  background: transparent;
  font: inherit;
  font-size: clamp(7px, 1.04vw, 10px);
  font-weight: 400;
}

.password-toggle {
  position: absolute;
  right: 0;
  display: grid;
  width: clamp(16px, 2.5vw, 24px);
  height: clamp(18px, 2.7vw, 26px);
  place-items: center;
  border: 0;
  color: #8090a8;
  background: transparent;
  cursor: pointer;
}

.password-toggle:hover,
.password-toggle:focus-visible {
  color: #2563eb;
}

.password-toggle svg {
  width: clamp(9px, 1.35vw, 13px);
  height: clamp(9px, 1.35vw, 13px);
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.6;
}

.login-alert {
  margin: -7px 0 -5px;
  color: #b42318;
  font-size: clamp(7px, 1.04vw, 10px);
  line-height: 1.45;
}

.session-alert {
  padding: clamp(5px, 0.83vw, 8px) clamp(7px, 1.04vw, 10px);
  border-radius: clamp(5px, 0.73vw, 7px);
  background: #fff1f0;
}

.submit-button {
  display: flex;
  width: clamp(80px, 12.5vw, 120px);
  min-height: clamp(18px, 2.8125vw, 27px);
  align-items: center;
  justify-content: center;
  gap: clamp(5px, 0.833vw, 8px);
  margin-top: 1px;
  border: 1px solid #1f5eea;
  border-radius: clamp(5px, 0.73vw, 7px);
  color: #fff;
  background: #2864ed;
  box-shadow: 0 8px 14px rgba(37, 99, 235, 0.2);
  font: inherit;
  font-size: clamp(6px, 0.9375vw, 9px);
  font-weight: 750;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background 160ms ease, transform 160ms ease;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: #1d4ed8;
  background: #1d58df;
}

.submit-button:focus-visible,
.password-toggle:focus-visible {
  outline: 2px solid #93b8ff;
  outline-offset: 3px;
}

.submit-button:disabled {
  cursor: wait;
  opacity: 0.72;
}

.spinner {
  width: clamp(9px, 1.35vw, 13px);
  height: clamp(9px, 1.35vw, 13px);
  border: clamp(1px, 0.21vw, 2px) solid rgba(255, 255, 255, 0.45);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.form-links {
  display: flex;
  flex-direction: column;
  gap: clamp(5px, 0.83vw, 8px);
  margin-top: clamp(18px, 2.8125vw, 27px);
  color: #8b9bb4;
  font-size: clamp(6px, 0.833vw, 8px);
}

.form-links p {
  margin: 0;
  line-height: 1.5;
}

.form-links a,
.login-footer a {
  color: #8295b3;
  text-decoration: none;
}

.form-links a:hover,
.login-footer a:hover {
  color: #2563eb;
  text-decoration: underline;
}

.form-links p a {
  color: #2563eb;
}

.login-illustration {
  display: grid;
  min-width: 0;
  align-self: start;
  place-items: center;
}

.login-illustration svg {
  display: block;
  width: 100%;
  max-width: min(59.4vw, 570px);
  height: auto;
  overflow: visible;
  transform: translateY(-0.73vw) scaleY(1.2);
  transform-origin: top center;
}

.login-footer {
  display: flex;
  min-height: clamp(28px, 4.375vw, 42px);
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 clamp(32px, 5vw, 48px);
  color: #8293ac;
  font-size: clamp(6px, 0.833vw, 8px);
}

.login-footer > span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.login-footer > span i {
  width: clamp(3px, 0.52vw, 5px);
  height: clamp(3px, 0.52vw, 5px);
  border-radius: 50%;
  background: #c1d2e8;
}

.login-footer nav {
  display: flex;
  align-items: center;
  gap: clamp(8px, 1.25vw, 12px);
}

@media (max-width: 520px) {
  .login-page {
    display: flex;
    flex-direction: column;
    padding: 0;
  }

  .login-card {
    min-height: 100vh;
    min-height: 100dvh;
    border-radius: 0;
  }

  .login-header {
    min-height: 48px;
    padding: 11px 15px 5px;
  }

  .brand-group {
    gap: 6px;
  }

  .brand-logo {
    width: 38px;
    height: 22px;
  }

  .login-main {
    grid-template-columns: 1fr;
    gap: 7px;
    padding: 18px 18px 5px;
  }

  .form-panel {
    width: min(100%, 390px);
    justify-self: center;
  }

  .form-heading {
    margin-bottom: 13px;
  }

  .login-illustration {
    width: min(100%, 320px);
    justify-self: center;
  }

  .login-footer {
    min-height: 36px;
    flex-wrap: wrap;
    justify-content: center;
    padding: 7px 11px;
    font-size: 6px;
  }
}

@media (max-width: 420px) {
  .login-header {
    padding-right: 11px;
    padding-left: 11px;
  }

  .login-main {
    padding-right: 15px;
    padding-left: 15px;
  }

  .login-footer nav {
    gap: 5px;
  }
}

:global(html.dark) .login-page .field-group > input,
:global(html.dark) .login-page .password-field input,
.login-page .field-group > input,
.login-page .password-field input {
  border: 0 !important;
  border-bottom: 1px solid #8495b1 !important;
  color: #1f2937 !important;
  background-color: #fff !important;
}

:global(html.dark) .login-page .field-group > input::placeholder,
:global(html.dark) .login-page .password-field input::placeholder,
.login-page .field-group > input::placeholder,
.login-page .password-field input::placeholder {
  color: #8b9bb4 !important;
}

:global(html.dark) .login-page .field-group > input:focus,
:global(html.dark) .login-page .password-field:focus-within,
.login-page .field-group > input:focus,
.login-page .password-field:focus-within {
  border-bottom-color: #2563eb !important;
}
</style>
