import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import DokumenPerencanaan from '../views/DokumenPerencanaan.vue';
import ArsipDokumen from '../views/ArsipDokumen.vue';
import MonitoringOpd from '../views/MonitoringOpd.vue';
import StatusVerifikasi from '../views/StatusVerifikasi.vue';
import ManajemenPenugasan from '../views/ManajemenPenugasan.vue';
import DocumentEditor from '../components/editor/DocumentEditor.vue';

const routes = [
  { path: '/pengaturan', name: 'AppSettings', component: () => import('../views/AppSettings.vue') },
  { path: '/pengaturan/dokumen', redirect: { name: 'AppSettings', query: { bagian: 'dokumen' } } },
  { path: '/template', redirect: { name: 'AppSettings', query: { bagian: 'template' } } },
  {
    path: '/',
    name: 'Dashboard',
    component: DashboardView,
  },
  {
    path: '/dokumen',
    name: 'DokumenPerencanaan',
    component: DokumenPerencanaan,
  },
  {
    path: '/editor/:id',
    name: 'DocumentEditor',
    component: DocumentEditor,
  },
  {
    path: '/arsip',
    name: 'ArsipDokumen',
    component: ArsipDokumen,
  },
  {
    path: '/lampiran',
    name: 'Format Lampiran Perbup/Kepbup',
    component: () => import('../views/LampiranView.vue'),
  },
  { path:'/evaluasi-renja-triwulan',name:'Evaluasi Renja Triwulan',component:()=>import('../views/EvaluasiTriwulan.vue') },
  { path:'/evaluasi-rkpd-triwulan',name:'Evaluasi RKPD Triwulan',component:()=>import('../views/EvaluasiTriwulan.vue'),meta:{adminOnly:true} },
  {
    path: '/monitoring',
    name: 'MonitoringOpd',
    component: MonitoringOpd,
    meta: { bapperidaOnly: true },
  },
  {
    path: '/verifikasi',
    name: 'StatusVerifikasi',
    component: StatusVerifikasi,
  },
  {
    path: '/verifikasi/:id',
    name: 'StatusVerifikasiDetail',
    component: StatusVerifikasi,
  },
  {
    path: '/verifikasi-final',
    name: 'VerifikasiFinal',
    component: () => import('../views/VerifikasiFinalView.vue'),
  },
  {
    path: '/verifikasi-final/:id',
    name: 'VerifikasiFinalDetail',
    component: () => import('../views/VerifikasiFinalView.vue'),
  },
  {
    path: '/penugasan-staf',
    name: 'ManajemenPenugasan',
    component: ManajemenPenugasan,
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(to => {
  if (to.name === 'Login') return true;
  if (!localStorage.getItem('sipanda_token')) {
    return {
      name: 'Login',
      query: { redirect: to.fullPath }
    };
  }
  if (to.meta.adminOnly) {
    try {
      const user = JSON.parse(localStorage.getItem('sipanda_user') || 'null');
      const allowed = user?.role === 'admin' || user?.role === 'staf' ||
        user?.roleKodes?.includes('penyusun_rkpd');
      if (!allowed) return { name: 'DokumenPerencanaan' };
    } catch {
      return { name: 'DokumenPerencanaan' };
    }
  }
  if (to.meta.bapperidaOnly) {
    try {
      const user = JSON.parse(localStorage.getItem('sipanda_user') || 'null');
      if (!['admin', 'staf'].includes(user?.role)) return { name: 'DokumenPerencanaan' };
    } catch { return { name: 'DokumenPerencanaan' }; }
  }
  return true;
});

export default router;
