<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6"
      @click.self="close"
    >
      <div class="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 sm:max-h-[calc(100dvh-3rem)]">
        <div class="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
          <div>
            <h3 class="font-bold text-slate-900 text-base">Ganti Peran / Perangkat Daerah</h3>
            <p class="mt-1 text-xs text-slate-500">Pilih akun atau OPD untuk simulasi alur kerja</p>
          </div>
          <button @click="close" class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700" aria-label="Tutup">
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="shrink-0 border-b border-slate-100 bg-white px-5 py-3 sm:px-6">
          <label for="role-switcher-search" class="sr-only">Cari akun atau perangkat daerah</label>
          <div class="relative">
            <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="role-switcher-search"
              v-model="search"
              type="search"
              placeholder="Cari nama, jabatan, atau perangkat daerah..."
              class="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3 sm:px-6">
          <div v-if="filteredUsers.length" class="space-y-2">
            <button
              v-for="user in filteredUsers"
              :key="user.id"
              @click="selectUser(user.id)"
              class="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 text-left transition hover:border-blue-300 hover:bg-blue-50/50"
              :class="user.id === store.currentUser?.id ? 'border-blue-500 bg-blue-50/70 ring-1 ring-blue-200' : 'border-slate-200 bg-white'"
            >
              <span class="flex min-w-0 items-center gap-3">
                <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                      :class="user.role === 'admin' ? 'bg-blue-600' : 'bg-emerald-600'">
                  <Building2 class="h-5 w-5" />
                </span>
                <span class="min-w-0">
                  <span class="block truncate text-sm font-bold leading-snug text-slate-800">{{ user.name }}</span>
                  <span class="mt-0.5 block truncate text-xs leading-tight text-slate-500">{{ user.jabatan }}</span>
                  <span class="mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-semibold"
                        :class="user.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'">
                    {{ user.role === 'admin' ? 'ADMIN BAPPERIDA' : user.opdName || 'OPD' }}
                  </span>
                </span>
              </span>
              <span v-if="user.id === store.currentUser?.id" class="flex shrink-0 items-center gap-1 text-xs font-bold text-blue-700">
                <Check class="h-4 w-4" /> Aktif
              </span>
            </button>
          </div>
          <div v-else class="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
            <Search class="mx-auto h-5 w-5 text-slate-300" />
            <p class="mt-2 text-sm font-semibold text-slate-600">Tidak ada akun yang cocok</p>
            <p class="mt-1 text-xs text-slate-400">Coba kata kunci nama, jabatan, atau OPD lain.</p>
          </div>
        </div>

        <div class="shrink-0 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
          <label for="role-switcher-opd" class="mb-1.5 block text-xs font-semibold text-slate-700">
            Pilih Peran / Perangkat Daerah:
          </label>
          <div class="flex flex-col gap-2 sm:flex-row">
            <select
              id="role-switcher-opd"
              v-model="selectedCustomOpdId"
              class="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">-- Pilih Peran --</option>
              <option value="__admin__">Admin Bapperida</option>
              <option v-for="opd in opdList" :key="opd.id" :value="opd.id">
                {{ opd.nama }}
              </option>
            </select>
            <button
              :disabled="!selectedCustomOpdId"
              @click="selectCustomOpd"
              class="shrink-0 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Terapkan
            </button>
          </div>
          <p class="mt-2 text-[11px] leading-relaxed text-slate-500">Daftar di atas mengganti akun. Pilihan ini mengganti konteks OPD tanpa mengganti akun.</p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { OPDS } from '../../constants/opds';
import { useAppStore } from '../../stores/appStore';
import { Building2, Check, Search, X } from '@lucide/vue';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  switched: [returnToDashboard: boolean];
}>();

const store = useAppStore();
const selectedCustomOpdId = ref('');
const search = ref('');

const filteredUsers = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('id-ID');
  if (!query) return store.availableUsers;
  return store.availableUsers.filter(user =>
    [user.name, user.jabatan, user.opdName, user.roleLabel]
      .some(value => value?.toLocaleLowerCase('id-ID').includes(query))
  );
});

const opdList = computed(() => {
  if (store.opds.length > 0) {
    return store.opds.map(opd => ({
      id: opd.id,
      nama: opd.nama,
      nomorLampiran: opd.nomorLampiran || String(opd.nomorUrut || ''),
    }));
  }
  return OPDS;
});

watch(() => props.modelValue, async isOpen => {
  if (isOpen) {
    search.value = '';
    selectedCustomOpdId.value = '';
    await store.fetchCurrentUser();
  }
});

const close = () => emit('update:modelValue', false);

const finishSwitch = (returnToDashboard: boolean) => {
  selectedCustomOpdId.value = '';
  close();
  emit('switched', returnToDashboard);
};

const selectUser = async (userId: string) => {
  await store.switchUser(userId);
  finishSwitch(false);
};

const selectCustomOpd = async () => {
  if (!selectedCustomOpdId.value) return;
  if (selectedCustomOpdId.value === '__admin__') {
    await store.switchUser('user-admin', undefined, 'admin');
  } else {
    await store.switchUser(undefined, selectedCustomOpdId.value);
  }
  finishSwitch(true);
};
</script>
