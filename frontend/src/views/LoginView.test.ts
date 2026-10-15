import { mount, flushPromises } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LoginView from './LoginView.vue';

vi.mock('@lucide/vue', () => {
  const icon = { template: '<span aria-hidden="true" />' };
  return {
    CalendarDays: icon,
    ChevronDown: icon,
    CircleHelp: icon,
    LockKeyhole: icon,
    ShieldCheck: icon,
    UserRound: icon
  };
});

async function mountLogin(path = '/login') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/login', component: LoginView }]
  });
  await router.push(path);
  await router.isReady();
  const icon = { template: '<span aria-hidden="true" />' };
  return mount(LoginView, {
    global: {
      plugins: [createPinia(), router],
      stubs: {
        CalendarDays: icon,
        ChevronDown: icon,
        CircleHelp: icon,
        LockKeyhole: icon,
        ShieldCheck: icon,
        UserRound: icon,
        KabCirebonLogo: true
      }
    }
  });
}

describe('LoginView', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('menampilkan form login dan pilihan tahun anggaran', async () => {
    const wrapper = await mountLogin();
    expect(wrapper.find('input[autocomplete="username"]').exists()).toBe(true);
    expect(wrapper.find('input[autocomplete="current-password"]').exists()).toBe(true);
    expect(wrapper.find('select[aria-label="Tahun Rencana atau Anggaran"]').exists()).toBe(true);
    expect(wrapper.findAll('select[aria-label="Tahun Rencana atau Anggaran"] option')).toHaveLength(5);
    expect((wrapper.get('select[aria-label="Tahun Rencana atau Anggaran"]').element as HTMLSelectElement).value).toBe(String(new Date().getFullYear()));
  });

  it('menampilkan sesi berakhir sebagai banner status', async () => {
    const wrapper = await mountLogin('/login?expired=1');
    expect(wrapper.get('[role="status"]').text()).toContain('Sesi Anda telah berakhir');
    expect(wrapper.find('.session-alert').element).toBeTruthy();
  });

  it('menampilkan pesan API saat kredensial ditolak', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      headers: { get: () => 'application/json' },
      ok: false,
      json: async () => ({ error: 'Username atau password salah' })
    });
    vi.stubGlobal('fetch', fetchMock);
    const wrapper = await mountLogin();
    await wrapper.get('input[autocomplete="username"]').setValue('pengguna-tidak-ada');
    await wrapper.get('input[autocomplete="current-password"]').setValue('sandi-salah');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toBe('Username atau password salah');
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ username: 'pengguna-tidak-ada', password: 'sandi-salah' })
    }));
    expect(localStorage.getItem('sipanda_token')).toBeNull();
  });

  it('mengubah visibilitas kata sandi tanpa mengirim form', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const wrapper = await mountLogin();
    const passwordInput = wrapper.get('input[autocomplete="current-password"]');
    const toggle = wrapper.get('button[aria-label="Tampilkan password"]');
    expect(wrapper.get('input[autocomplete="current-password"]').attributes('type')).toBe('password');
    await toggle.trigger('click');
    expect(passwordInput.attributes('type')).toBe('text');
    expect(wrapper.get('button[aria-label="Sembunyikan password"]').attributes('aria-pressed')).toBe('true');
    await wrapper.get('button[aria-label="Sembunyikan password"]').trigger('click');
    expect(passwordInput.attributes('type')).toBe('password');
    expect(wrapper.get('button[aria-label="Tampilkan password"]').attributes('aria-pressed')).toBe('false');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
