<template>
  <div class="space-y-6">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-[10px] font-bold uppercase tracking-widest text-blue-600">PPEPD · Administrasi akses</p>
        <h1 class="mt-1 text-2xl font-bold text-slate-900">Pegawai & Penugasan OPD</h1>
        <p class="mt-1 text-xs text-slate-500">Kelola pegawai Bapperida dan pembagian OPD untuk asistensi.</p>
      </div>
      <label class="text-xs font-semibold text-slate-600">
        Tahun penugasan
        <select v-model="selectedYear" class="ml-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-bold text-slate-800">
          <option v-for="year in store.availableYears" :key="year" :value="year">{{ year }}</option>
        </select>
      </label>
    </header>

    <section class="border-y border-slate-200 py-5">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h2 class="text-sm font-bold text-slate-900">Tambah pegawai Bapperida</h2>
          <p class="mt-1 text-xs text-slate-500">Akun baru mendapat role staf. Hanya Super Admin PPEPD yang dapat mengelolanya.</p>
        </div>
      </div>
      <form class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" @submit.prevent="createStaff">
        <input v-model.trim="newStaff.nama" required placeholder="Nama pegawai" class="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
        <input v-model.trim="newStaff.username" required placeholder="Username" class="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
        <input v-model.trim="newStaff.password" required type="password" placeholder="Password awal" class="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
        <div class="flex gap-2">
          <input v-model.trim="newStaff.jabatan" placeholder="Bidang / jabatan" class="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs" />
          <button :disabled="saving || !newStaff.nama || !newStaff.username || !newStaff.password" class="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
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

      <article v-for="staff in staffList" :key="staff.id" class="border-y border-slate-200 py-4">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="min-w-48">
            <h3 class="text-sm font-bold text-slate-900">{{ staff.name }}</h3>
            <p class="mt-0.5 text-xs text-slate-500">{{ staff.username }} · {{ staff.jabatan || 'Staf Bapperida' }}</p>
          </div>

          <form class="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" @submit.prevent="assignOpd(staff.id)">
            <select v-model="selectedOpdByStaff[staff.id]" required class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
              <option value="">Pilih OPD untuk asistensi</option>
              <option v-for="opd in externalOpds" :key="opd.id" :value="opd.id">{{ opd.nama }}</option>
            </select>
            <input v-model.trim="assignmentNoteByStaff[staff.id]" placeholder="Catatan penugasan (opsional)" class="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
            <button :disabled="saving || !selectedOpdByStaff[staff.id]" class="rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50">
              Tugaskan
            </button>
          </form>
        </div>

        <div class="mt-3 flex flex-wrap gap-2">
          <div v-for="assignment in staff.penugasanOpd || []" :key="assignment.id" class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px]">
            <span class="font-semibold text-slate-700">{{ assignment.opdNama }}</span>
            <span class="text-slate-400">T.A. {{ assignment.tahun }}</span>
            <button @click="removeAssignment(staff.id, assignment.id)" :disabled="saving" class="font-bold text-red-600 hover:text-red-800" :aria-label="`Hapus tugas ${assignment.opdNama}`">Hapus</button>
          </div>
          <span v-if="!staff.penugasanOpd?.length" class="text-[11px] text-slate-400">Belum ada OPD ditugaskan untuk tahun ini.</span>
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
const newStaff = reactive({ nama: '', username: '', password: '', jabatan: '' });
const selectedOpdByStaff = reactive<Record<string, string>>({});
const assignmentNoteByStaff = reactive<Record<string, string>>({});
const externalOpds = computed(() => store.opds.filter(opd => opd.id !== 'bapperida'));

const loadStaff = async () => {
  loading.value = true;
  try {
    const response = await apiFetch(`/api/staf?tahun=${selectedYear.value}`);
    if (!response.ok) throw new Error((await response.json()).error || 'Gagal memuat staf');
    staffList.value = await response.json();
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
    store.addToast('Akun staf Bapperida berhasil dibuat', 'success');
    await loadStaff();
  } catch (error) {
    store.addToast(error instanceof Error ? error.message : 'Gagal membuat akun staf', 'error');
  } finally {
    saving.value = false;
  }
};

const assignOpd = async (staffId: string) => {
  const opdId = selectedOpdByStaff[staffId];
  if (!opdId) return;
  saving.value = true;
  try {
    const response = await apiFetch(`/api/staf/${staffId}/penugasan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opdId, tahun: selectedYear.value, keterangan: assignmentNoteByStaff[staffId] || undefined })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Gagal menyimpan penugasan');
    selectedOpdByStaff[staffId] = '';
    assignmentNoteByStaff[staffId] = '';
    store.addToast('Penugasan OPD berhasil disimpan', 'success');
    await loadStaff();
  } catch (error) {
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

watch(selectedYear, loadStaff);

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
