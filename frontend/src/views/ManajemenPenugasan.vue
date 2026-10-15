<template>
  <div class="space-y-5">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-[10px] font-bold uppercase tracking-widest text-blue-600">PPEPD · Administrasi akses</p>
        <h1 class="mt-1 text-2xl font-bold text-slate-900">Pegawai & Penugasan OPD</h1>
        <p class="mt-1 text-xs text-slate-500">Kelola pegawai Bapperida untuk asistensi dan verifikasi dokumen. Penugasan diberikan per OPD dan tahun, lalu mencakup semua dokumen OPD tersebut tanpa batas jumlah dokumen. Satu staf dapat menangani beberapa OPD dan tahun.</p>
      </div>
      <label class="text-xs font-semibold text-slate-600">
        Tahun penugasan
        <select v-model="selectedYear" class="ml-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-bold text-slate-800">
          <option v-for="year in store.availableYears" :key="year" :value="year">{{ year }}</option>
        </select>
      </label>
    </header>

    <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
        <h2 class="text-sm font-bold text-slate-900">Tambah pegawai Bapperida</h2>
        <p class="mt-1 text-xs text-slate-500">Akun baru mendapat role staf. Hanya Super Admin PPEPD yang dapat mengelolanya.</p>
      </div>
      <form class="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4" @submit.prevent="createStaff">
        <label class="space-y-1.5">
          <span class="block text-[11px] font-semibold text-slate-600">Nama Pegawai</span>
          <input v-model.trim="newStaff.nama" required autocomplete="name" placeholder="Nama pegawai" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
        </label>
        <label class="space-y-1.5">
          <span class="block text-[11px] font-semibold text-slate-600">Username</span>
          <input v-model.trim="newStaff.username" required autocomplete="username" placeholder="Username" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
        </label>
        <label class="space-y-1.5">
          <span class="block text-[11px] font-semibold text-slate-600">Password Awal</span>
          <input v-model.trim="newStaff.password" required type="password" autocomplete="new-password" placeholder="Password awal" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
        </label>
        <label class="space-y-1.5">
          <span class="block text-[11px] font-semibold text-slate-600">Bidang / Jabatan</span>
          <input v-model.trim="newStaff.jabatan" placeholder="Bidang / jabatan" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
        </label>
        <label class="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-xs text-slate-700 sm:col-span-2 xl:col-span-4">
          <input v-model="newStaff.penyusunRkpd" type="checkbox" class="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
          <span><strong class="font-semibold">Penyusun RKPD</strong><span class="mt-0.5 block text-[11px] text-slate-500">Dapat mengunggah dan mengganti evaluasi RKPD triwulan. Hak ini tidak memberi izin untuk menonaktifkan berkas.</span></span>
        </label>
        <div class="flex justify-end border-t border-slate-100 pt-3 sm:col-span-2 xl:col-span-4">
          <button :disabled="saving || !newStaff.nama || !newStaff.username || !newStaff.password" class="rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            Tambah
          </button>
        </div>
      </form>
    </section>

    <section class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-bold text-slate-900">Staf aktif</h2>
        <span class="text-xs text-slate-500">{{ staffList.length }} pegawai</span>
      </div>

      <div v-if="loading" class="py-12 text-center text-xs text-slate-500">Memuat daftar penugasan...</div>
      <div v-else-if="!staffList.length" class="border-y border-slate-200 py-10 text-center text-xs text-slate-500">Belum ada staf Bapperida.</div>

      <article v-for="staff in staffList" :key="staff.id" class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
          <div class="min-w-0 p-4 sm:p-5">
            <div class="flex items-start gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">
                {{ staff.name.trim().charAt(0).toUpperCase() }}
              </div>
              <div class="min-w-0">
                <h3 class="truncate text-sm font-bold text-slate-900">{{ staff.name }}</h3>
                <p class="mt-1 text-xs text-slate-500">{{ staff.jabatan || 'Staf Bapperida' }}</p>
                <p class="mt-1 text-[11px] text-slate-400">@{{ staff.username }}</p>
              </div>
            </div>

            <div class="mt-4 border-t border-slate-100 pt-3">
              <div class="mb-2 flex items-center justify-between gap-2">
                <h4 class="text-[11px] font-bold uppercase tracking-wide text-slate-500">OPD Ditangani</h4>
                <span class="text-[10px] text-slate-400">{{ staff.penugasanOpd?.length || 0 }} penugasan</span>
              </div>
              <div v-if="staff.penugasanOpd?.length" class="flex flex-wrap gap-2">
                <div v-for="assignment in staff.penugasanOpd" :key="assignment.id" class="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 py-1 pl-2.5 pr-1 text-[10px]">
                  <span class="max-w-[240px] truncate font-semibold text-slate-700">{{ assignment.opdNama }}</span>
                  <span class="shrink-0 text-slate-400">T.A. {{ assignment.tahun }}</span>
                  <button type="button" @click="removeAssignment(staff.id, assignment.id)" :disabled="saving" class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-rose-100 hover:text-rose-700 disabled:opacity-50" :aria-label="`Hapus tugas ${assignment.opdNama}`" :title="`Hapus tugas ${assignment.opdNama}`">
                    <X class="h-3 w-3" />
                  </button>
                </div>
              </div>
              <p v-else class="text-[11px] text-slate-400">Belum ada OPD ditugaskan untuk tahun ini.</p>
            </div>
          </div>

          <div class="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-5 lg:border-l lg:border-t-0">
            <form class="space-y-3" @submit.prevent="assignOpds(staff.id)">
              <div>
                <h4 class="text-xs font-bold text-slate-800">Form Penugasan Baru</h4>
                <p class="mt-1 text-[10px] text-slate-500">Pilih satu atau beberapa OPD untuk tahun {{ selectedYear }}.</p>
              </div>
              <details class="group relative">
                <summary class="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none transition hover:border-blue-300 focus-visible:ring-2 focus-visible:ring-blue-200">
                  <span class="truncate font-medium">{{ selectedOpdByStaff[staff.id]?.length ? `${selectedOpdByStaff[staff.id].length} OPD dipilih` : 'Pilih OPD' }}</span>
                  <span class="text-slate-400 transition group-open:rotate-180">⌄</span>
                </summary>
                <div class="mt-1 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                  <label class="relative block">
                    <Search class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input v-model="assignmentSearchByStaff[staff.id]" type="search" :aria-label="`Cari OPD untuk ${staff.name}`" placeholder="Cari OPD..." class="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-2 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                  </label>
                  <div class="mt-2 max-h-44 space-y-0.5 overflow-y-auto">
                    <label v-for="opd in filteredAvailableOpdsFor(staff)" :key="opd.id" class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-[11px] text-slate-700 hover:bg-blue-50">
                      <input v-model="selectedOpdByStaff[staff.id]" type="checkbox" :value="opd.id" class="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <span>{{ opd.nama }}</span>
                    </label>
                    <p v-if="!filteredAvailableOpdsFor(staff).length" class="px-2 py-3 text-center text-[10px] text-slate-400">
                      {{ availableOpdsFor(staff).length ? 'OPD tidak ditemukan.' : `Semua OPD sudah ditugaskan untuk tahun ${selectedYear}.` }}
                    </p>
                  </div>
                </div>
              </details>
              <label class="block">
                <span class="mb-1 block text-[10px] font-semibold text-slate-500">Catatan penugasan (opsional)</span>
                <input v-model.trim="assignmentNoteByStaff[staff.id]" placeholder="Tambahkan catatan" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
              </label>
              <div class="flex items-center justify-between gap-2">
                <p v-if="!availableOpdsFor(staff).length" class="text-[10px] text-emerald-700">Semua OPD sudah ditugaskan untuk tahun {{ selectedYear }}.</p>
                <span v-else class="text-[10px] text-slate-400">Penugasan berlaku per tahun.</span>
                <button :disabled="saving || !selectedOpdByStaff[staff.id]?.length" class="ml-auto shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                  Tugaskan {{ selectedOpdByStaff[staff.id]?.length || '' }} OPD
                </button>
              </div>
            </form>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '../stores/appStore';
import { apiFetch } from '../lib/api';
import { Search, X } from '@lucide/vue';

interface StaffMember {
  id: string;
  name: string;
  username: string;
  jabatan?: string;
  role: string;
  penugasanOpd?: Array<{ id: string; opdId: string; opdNama: string; tahun: string; keterangan?: string }>;
}

const store = useAppStore();
const router = useRouter();
const staffList = ref<StaffMember[]>([]);
const selectedYear = ref(store.selectedTahun);
const loading = ref(true);
const saving = ref(false);
const newStaff = reactive({ nama: '', username: '', password: '', jabatan: '', penyusunRkpd: false });
const selectedOpdByStaff = reactive<Record<string, string[]>>({});
const assignmentSearchByStaff = reactive<Record<string, string>>({});
const assignmentNoteByStaff = reactive<Record<string, string>>({});
const externalOpds = computed(() => store.opds.filter(opd => opd.id !== 'bapperida'));
const availableOpdsFor = (staff: StaffMember) => externalOpds.value.filter(opd =>
  !staff.penugasanOpd?.some(assignment => assignment.opdId === opd.id && assignment.tahun === selectedYear.value)
);
const filteredAvailableOpdsFor = (staff: StaffMember) => {
  const query = assignmentSearchByStaff[staff.id]?.trim().toLocaleLowerCase('id-ID');
  return availableOpdsFor(staff).filter(opd => !query || opd.nama.toLocaleLowerCase('id-ID').includes(query));
};

const loadStaff = async () => {
  loading.value = true;
  try {
    const response = await apiFetch(`/api/staf?tahun=${selectedYear.value}`);
    if (!response.ok) throw new Error((await response.json()).error || 'Gagal memuat staf');
    staffList.value = await response.json();
    for (const staff of staffList.value) selectedOpdByStaff[staff.id] ??= [];
  } catch (error) {
    store.addToast(error instanceof Error ? error.message : 'Gagal memuat daftar staf', 'error');
  } finally {
    loading.value = false;
  }
};

const createStaff = async () => {
  saving.value = true;
  try {
    const response = await apiFetch('/api/staf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newStaff)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Gagal membuat akun staf');
    newStaff.nama = '';
    newStaff.username = '';
    newStaff.password = '';
    newStaff.jabatan = '';
    newStaff.penyusunRkpd = false;
    store.addToast('Akun staf Bapperida berhasil dibuat', 'success');
    await loadStaff();
  } catch (error) {
    store.addToast(error instanceof Error ? error.message : 'Gagal membuat akun staf', 'error');
  } finally {
    saving.value = false;
  }
};

const assignOpds = async (staffId: string) => {
  const opdIds = selectedOpdByStaff[staffId] || [];
  if (!opdIds.length) return;
  saving.value = true;
  try {
    for (const opdId of opdIds) {
      const response = await apiFetch(`/api/staf/${staffId}/penugasan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opdId, tahun: selectedYear.value, keterangan: assignmentNoteByStaff[staffId] || undefined })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Gagal menugaskan OPD ${opdId}`);
    }
    selectedOpdByStaff[staffId] = [];
    assignmentNoteByStaff[staffId] = '';
    store.addToast(`${opdIds.length} penugasan OPD berhasil disimpan`, 'success');
    await loadStaff();
  } catch (error) {
    await loadStaff();
    store.addToast(error instanceof Error ? error.message : 'Gagal menyimpan penugasan', 'error');
  } finally {
    saving.value = false;
  }
};

const removeAssignment = async (staffId: string, assignmentId: string) => {
  saving.value = true;
  try {
    const response = await apiFetch(`/api/staf/${staffId}/penugasan/${assignmentId}`, { method: 'DELETE' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Gagal menghapus penugasan');
    store.addToast('Penugasan OPD dihapus', 'info');
    await loadStaff();
  } catch (error) {
    store.addToast(error instanceof Error ? error.message : 'Gagal menghapus penugasan', 'error');
  } finally {
    saving.value = false;
  }
};

watch(selectedYear, () => {
  for (const staffId of Object.keys(selectedOpdByStaff)) selectedOpdByStaff[staffId] = [];
  loadStaff();
});

onMounted(async () => {
  if (!store.currentUser) await store.fetchCurrentUser();
  if (!store.isSuperAdmin) {
    router.replace('/');
    return;
  }
  if (!store.opds.length) await store.fetchOpds();
  await loadStaff();
});
</script>
