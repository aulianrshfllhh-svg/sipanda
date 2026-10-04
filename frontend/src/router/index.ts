import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import DokumenPerencanaan from '../views/DokumenPerencanaan.vue';
import ArsipDokumen from '../views/ArsipDokumen.vue';
import MonitoringOpd from '../views/MonitoringOpd.vue';
import StatusVerifikasi from '../views/StatusVerifikasi.vue';
import ManajemenPenugasan from '../views/ManajemenPenugasan.vue';
import DocumentEditor from '../components/editor/DocumentEditor.vue';

const routes = [
  { path: '/template', name: 'TemplateManager', component: () => import('../views/TemplateManager.vue') },
  { path: '/pengaturan', name: 'DocumentSettings', component: () => import('../views/DocumentSettings.vue') },
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
    name: 'Lampiran',
    component: () => import('../views/LampiranView.vue'),
  },
  {
    path: '/monitoring',
    name: 'MonitoringOpd',
    component: MonitoringOpd,
  },
  {
    path: '/verifikasi',
    name: 'StatusVerifikasi',
    component: StatusVerifikasi,
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

export default router;
