import { mount, flushPromises } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

async function mountLogin() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/login', component: LoginView }]
  });
  await router.push('/login');
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

  it('menampilkan form login dan pilihan tahun anggaran', async () => {
    const wrapper = await mountLogin();
    expect(wrapper.find('input[autocomplete="username"]').exists()).toBe(true);
    expect(wrapper.find('input[autocomplete="current-password"]').exists()).toBe(true);
    expect(wrapper.find('select[aria-label="Tahun Rencana atau Anggaran"]').exists()).toBe(true);
  });

  it('menampilkan pesan API saat kredensial ditolak', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      headers: { get: () => 'application/json' },
      ok: false,
      json: async () => ({ error: 'Username atau password salah' })
    }));
    const wrapper = await mountLogin();
    await wrapper.get('input[autocomplete="username"]').setValue('pengguna-tidak-ada');
    await wrapper.get('input[autocomplete="current-password"]').setValue('sandi-salah');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('Username atau password salah');
    expect(localStorage.getItem('sipanda_token')).toBeNull();
  });

  it('mengubah visibilitas kata sandi tanpa mengirim form', async () => {
    const wrapper = await mountLogin();
    expect(wrapper.get('input[autocomplete="current-password"]').attributes('type')).toBe('password');
    await wrapper.get('button[aria-label="Tampilkan password"]').trigger('click');
    expect(wrapper.get('input[autocomplete="current-password"]').attributes('type')).toBe('text');
  });
});
