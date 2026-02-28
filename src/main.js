// ── Styles ──
import './styles/main.css';

// ── Modules ──
import { sb } from './config.js';
import { state } from './state.js';
import { showToast, trDataErr, sanitizeCssUrl } from './utils.js';
import { initDarkMode, toggleDarkMode } from './darkmode.js';
import { navigateTo } from './navigation.js';
import { loadOnboardingData } from './onboarding.js';
import { loadAndApplyTypography, loadAndApplyColors } from './theme.js';
import {
  handleAuth, handleLogout, handleResetPassword,
  toggleAuthMode, handleForgotPassword, togglePasswordVisibility,
  postLogin, setupHeader, getAuthMode,
  loginWithPasskey, initAuthUI,
  checkBiometricLock, unlockApp,
} from './auth.js';
import { dismissOnboarding } from './onboarding.js';
import {
  saveQuestions, exportPDF, exportChapterPDF, exportCoursePDF,
  saveAndNextQuestion, goToNextExercise,
  showQuestionSummary, handleInput, handleChoice, handleScale,
} from './exercises.js';
import { openMobileMenu, closeMobileMenu, updateMobileDarkLabel, initBottomSheetGestures } from './mobile.js';
import { registerServiceWorker, updateOnlineStatus } from './sw.js';
import { initEventDelegation, registerActions } from './events.js';
import {
  renderJournal, saveJournalEntry, editJournalEntry,
  saveJournalEdit, cancelJournalEdit, deleteJournalEntry,
  updateJournalCounter, clearImpulseCache,
} from './journal.js';
import {
  renderFriendView, saveFriendEntry, editFriendEntry,
  saveFriendEdit, cancelFriendEdit, deleteFriendEntry,
  updateFriendCounter,
} from './friendview.js';
import {
  renderCheckin, onCheckinSelect, saveCheckin, redoCheckin,
  clearCheckinCache, switchCheckinRange,
} from './checkin.js';
import {
  renderBodyCheck, toggleBodyZone, toggleBodyFeeling,
  saveBodyCheck, deleteBodyEntry,
} from './bodycheck.js';
import {
  renderEnergyBalance, addEnergyItem, removeEnergyItem, toggleEnergyWord,
} from './energybalance.js';
import {
  renderMeditation, openMeditationDetail, closeMeditationDetail,
  togglePlayPause, seekMeditation, stopMeditation, clearMeditationCache,
} from './meditation.js';
import {
  renderWeeklyImpulse, renderImpulseView, clearWeeklyImpulseCache,
  exportImpulsePDF, shareImpulse,
  dismissImpulse, dismissImpulse30,
  getCurrentImpulseText, isImpulseMuted,
} from './weeklyimpulse.js';
import {
  renderContact, submitContactForm,
} from './contact.js';
import {
  renderPro, submitProQuestion,
} from './pro.js';
// Admin modules: lazy-loaded via dynamic import (code-splitting)
const _la = fn => (...a) => import('./admin.js').then(m => m[fn](...a));
const _lp = fn => (...a) => import('./pagebuilder.js').then(m => m[fn](...a));
const _lb = fn => (...a) => import('./bulkupload.js').then(m => m[fn](...a));
const _lt = fn => (...a) => import('./admin-tree.js').then(m => m[fn](...a));
const _lc = fn => (...a) => import('./admin-tree-crud.js').then(m => m[fn](...a));
import {
  renderPublicPage, renderBlogList, renderBlogPost,
  renderPublicContact, submitPublicContact,
} from './public.js';
import {
  loadNotificationCount, renderNotifications, markNotificationRead,
} from './notifications.js';
import {
  openDeleteAnswersModal,
  closeDeleteAnswersModal,
  onDeleteConfirmInput,
  confirmDeleteAllAnswers,
  openDeleteAccountModal,
  closeDeleteAccountModal,
  onDeleteAccountConfirmInput,
  confirmDeleteAccount,
  handleChangePassword,
  openStripePortal,
  saveProfileDetails,
  toggleImpulseSetting,
} from './profile.js';
// admin.js — no static import (lazy-loaded via _la helper above)

// ── Public mobile nav toggle ──
function togglePublicMobileNav() {
  const nav = document.getElementById('publicMobileNav');
  if (nav) nav.classList.toggle('open');
}
window.togglePublicMobileNav = togglePublicMobileNav;

// Public nav link helper (used by public.js CTA sections)
window.__pubNav = function(link) {
  if (!link) return;
  if (link.startsWith('http') || link.startsWith('//')) {
    window.open(link, '_blank');
    return;
  }
  const CLEAN_NAV = {
    '/': 'publicHome', '/about': 'publicAbout', '/kontakt': 'publicContact',
    '/blog': 'publicBlog', '/datenschutz': 'publicDatenschutz',
    '/agb': 'publicAgb', '/privacy': 'publicPrivacy',
  };
  const route = CLEAN_NAV[link];
  if (route) { navigateTo(route); return; }
  if (link.startsWith('/blog/')) { navigateTo('publicBlogPost', { slug: link.split('/blog/')[1] }); return; }
  if (link.match(/^\/kurs\/[^/]+\/reinhoeren$/)) { navigateTo('publicCoursePreview', { slug: link.split('/kurs/')[1].replace('/reinhoeren', '') }); return; }
  if (link.startsWith('/kurs/')) { navigateTo('publicCourseSales', { slug: link.split('/kurs/')[1] }); return; }
  if (link.startsWith('/seite/')) { navigateTo('publicPage', { slug: link.split('/seite/')[1] }); return; }
  navigateTo(link);
};

// ── Dark mode dock icon helper (legacy, kept for mobile drawer) ──
function updateDockDarkIcon() {}

// ── Dock user email helper (legacy) ──
function updateDockEmail() {}

// ── Expose functions on window + action registry (events.js allowlist) ──
const _appActions = {
  // Navigation
  navigateTo,
  // Auth
  handleAuth, handleLogout, handleResetPassword,
  toggleAuthMode, handleForgotPassword, togglePasswordVisibility,
  loginWithPasskey, initAuthUI,
  unlockApp,
  // Dark mode
  toggleDarkMode, updateMobileDarkLabel, updateDockDarkIcon,
  // Onboarding
  dismissOnboarding,
  // Questions (user-facing)
  saveQuestions, exportPDF, exportChapterPDF, exportCoursePDF,
  saveAndNextQuestion, goToNextExercise,
  showQuestionSummary, handleInput, handleChoice, handleScale,
  // Mobile
  openMobileMenu, closeMobileMenu,
  // Profile
  openDeleteAnswersModal, closeDeleteAnswersModal, onDeleteConfirmInput, confirmDeleteAllAnswers,
  openDeleteAccountModal, closeDeleteAccountModal, onDeleteAccountConfirmInput, confirmDeleteAccount,
  handleChangePassword, openStripePortal, saveProfileDetails, toggleImpulseSetting,
  // Admin (lazy-loaded)
  switchAdminTab: _la('switchAdminTab'), toggleAdminGroup: _la('toggleAdminGroup'),
  saveCourse: _la('saveCourse'), editCourse: _la('editCourse'), deleteCourse: _la('deleteCourse'),
  resetCourseForm: _la('resetCourseForm'), toggleCourseSalesFields: _la('toggleCourseSalesFields'),
  populateParentCourseSelect: _la('populateParentCourseSelect'),
  saveChapter: _la('saveChapter'), editChapter: _la('editChapter'), deleteChapter: _la('deleteChapter'),
  resetChapterForm: _la('resetChapterForm'), handleChapterAudioSelect: _la('handleChapterAudioSelect'),
  toggleChapterOnlineFields: _la('toggleChapterOnlineFields'),
  saveExercise: _la('saveExercise'), editExercise: _la('editExercise'), deleteExercise: _la('deleteExercise'),
  resetExerciseForm: _la('resetExerciseForm'), updateExerciseChapterSelect: _la('updateExerciseChapterSelect'),
  saveQuestion: _la('saveQuestion'), editQuestion: _la('editQuestion'), deleteQuestion: _la('deleteQuestion'),
  resetQuestionForm: _la('resetQuestionForm'), onQuestionTypeChange: _la('onQuestionTypeChange'),
  addOptionRow: _la('addOptionRow'), updateQuestionExerciseSelect: _la('updateQuestionExerciseSelect'),
  renderAdminCourses: _la('renderAdminCourses'), manageInvites: _la('manageInvites'), createInvite: _la('createInvite'),
  toggleAdmin: _la('toggleAdmin'), showUserProgress: _la('showUserProgress'),
  openAdminDeleteUserModal: _la('openAdminDeleteUserModal'), closeAdminDeleteUserModal: _la('closeAdminDeleteUserModal'),
  confirmAdminDeleteUser: _la('confirmAdminDeleteUser'),
  openSendMessageModal: _la('openSendMessageModal'), closeSendMessageModal: _la('closeSendMessageModal'),
  confirmSendMessage: _la('confirmSendMessage'),
  // Notifications
  renderNotifications, markNotificationRead,
  addOnboardElement: _la('addOnboardElement'), saveOnboarding: _la('saveOnboarding'), previewOnboarding: _la('previewOnboarding'),
  handleImageFileSelect: _la('handleImageFileSelect'), removeCourseImage: _la('removeCourseImage'), removeChapterImage: _la('removeChapterImage'),
  saveLoginBg: _la('saveLoginBg'), removeLoginBgImage: _la('removeLoginBgImage'),
  loadToolImagesEditor: _la('loadToolImagesEditor'), handleToolImageSelect: _la('handleToolImageSelect'),
  removeToolImage: _la('removeToolImage'), saveToolImages: _la('saveToolImages'),
  saveTypography: _la('saveTypography'), previewTypography: _la('previewTypography'),
  addJournalImpulseRow: _la('addJournalImpulseRow'), removeJournalImpulseRow: _la('removeJournalImpulseRow'),
  updateJournalImpulse: _la('updateJournalImpulse'), saveJournalImpulses: _la('saveJournalImpulses'),
  saveColors: _la('saveColors'), previewColors: _la('previewColors'),
  addCheckinQuestion: _la('addCheckinQuestion'), removeCheckinQ: _la('removeCheckinQ'), updateCheckinQ: _la('updateCheckinQ'),
  addCheckinOption: _la('addCheckinOption'), removeCheckinOption: _la('removeCheckinOption'),
  updateCheckinOption: _la('updateCheckinOption'), saveCheckinQuestions: _la('saveCheckinQuestions'),
  saveWeeklyImpulses: _la('saveWeeklyImpulses'),
  saveMeditation: _la('saveMeditation'), editMeditation: _la('editMeditation'), deleteMeditation: _la('deleteMeditation'),
  resetMeditationForm: _la('resetMeditationForm'), handleMeditationAudioSelect: _la('handleMeditationAudioSelect'),
  handleMeditationImageSelect: _la('handleMeditationImageSelect'), removeMeditationImage: _la('removeMeditationImage'),
  loadAdminMessages: _la('loadAdminMessages'), filterMessages: _la('filterMessages'),
  deleteMessage: _la('deleteMessage'), loadAdminProQuestions: _la('loadAdminProQuestions'),
  saveContent: _la('saveContent'), editContent: _la('editContent'), deleteContent: _la('deleteContent'),
  resetContentForm: _la('resetContentForm'), onContentTypeChange: _la('onContentTypeChange'),
  saveElement: _la('saveElement'), resetElementForm: _la('resetElementForm'),
  onExerciseAddTypeChange: _la('onExerciseAddTypeChange'), renderAdminContent: _la('renderAdminContent'),
  onChapterContentAddTypeChange: _la('onChapterContentAddTypeChange'), saveChapterContent: _la('saveChapterContent'),
  editChapterContentBlock: _la('editChapterContentBlock'), deleteChapterContentBlock: _la('deleteChapterContentBlock'),
  resetChapterContentForm: _la('resetChapterContentForm'), renderAdminChapterContent: _la('renderAdminChapterContent'),
  // Journal
  renderJournal, saveJournalEntry, editJournalEntry,
  saveJournalEdit, cancelJournalEdit, deleteJournalEntry,
  updateJournalCounter,
  // Friend View
  renderFriendView, saveFriendEntry, editFriendEntry,
  saveFriendEdit, cancelFriendEdit, deleteFriendEntry,
  updateFriendCounter,
  // Check-In
  renderCheckin, onCheckinSelect, saveCheckin, redoCheckin, switchCheckinRange,
  // Body Check-In
  renderBodyCheck, toggleBodyZone, toggleBodyFeeling, saveBodyCheck, deleteBodyEntry,
  // Energy Balance
  renderEnergyBalance, addEnergyItem, removeEnergyItem, toggleEnergyWord,
  // Meditation
  renderMeditation, openMeditationDetail, closeMeditationDetail,
  togglePlayPause, seekMeditation, stopMeditation,
  // Contact
  renderContact, submitContactForm,
  // Pro
  renderPro, submitProQuestion,
  // Weekly Impulse
  exportImpulsePDF, shareImpulse, dismissImpulse, dismissImpulse30, renderImpulseView,
  dismissLoading, dismissLoading30,
  // Bulk Upload (lazy)
  toggleBulkUpload: _lb('toggleBulkUpload'), updateBulkChapterSelect: _lb('updateBulkChapterSelect'),
  downloadBulkTemplate: _lb('downloadBulkTemplate'), handleBulkFileSelect: _lb('handleBulkFileSelect'),
  executeBulkImport: _lb('executeBulkImport'), clearBulkUpload: _lb('clearBulkUpload'),
  openTreeBulkUpload: _lb('openTreeBulkUpload'), onBulkLevelChange: _lb('onBulkLevelChange'),
  // Course Tree View (lazy)
  renderCourseTree: _lt('renderCourseTree'), toggleTreeNode: _lt('toggleTreeNode'),
  expandAllTree: _lt('expandAllTree'), collapseAllTree: _lt('collapseAllTree'),
  editTreeNode: _lt('editTreeNode'), addChildNode: _lt('addChildNode'),
  closeTreeEditPanel: _lt('closeTreeEditPanel'), deleteTreeNode: _lt('deleteTreeNode'),
  searchTree: _lt('searchTree'),
  // Tree CRUD (lazy)
  treeSaveCourse: _lc('treeSaveCourse'), openNewCoursePanel: _lc('openNewCoursePanel'),
  treeSaveChapter: _lc('treeSaveChapter'), treeHandleChapterAudio: _lc('treeHandleChapterAudio'),
  treeSaveExercise: _lc('treeSaveExercise'),
  treeSaveQuestion: _lc('treeSaveQuestion'), treeAddOptionRow: _lc('treeAddOptionRow'),
  treeSaveContent: _lc('treeSaveContent'), treeSaveElement: _lc('treeSaveElement'),
  addTreeChapterContent: _lc('addTreeChapterContent'), treeSaveChapterContent: _lc('treeSaveChapterContent'),
  deleteTreeChapterContent: _lc('deleteTreeChapterContent'),
  // Course Player (lazy loaded, assigned dynamically)
  openChapterPlayer: (...a) => import('./courseplayer.js').then(m => m.openChapterPlayer(...a)),
  toggleChapterAudio: (...a) => import('./courseplayer.js').then(m => m.toggleChapterAudio(...a)),
  seekChapterAudio: (...a) => import('./courseplayer.js').then(m => m.seekChapterAudio(...a)),
  markChapterCompleteAndNext: (...a) => import('./courseplayer.js').then(m => m.markChapterCompleteAndNext(...a)),
  // Sales (lazy loaded)
  handlePurchase: (...a) => import('./sales.js').then(m => m.handlePurchase(...a)),
  // Course Preview audio (lazy loaded)
  togglePreviewAudio: (...a) => import('./public.js').then(m => m.togglePreviewAudio(...a)),
  seekPreviewAudio: (...a) => import('./public.js').then(m => m.seekPreviewAudio(...a)),
  // SEO & Tracking (lazy loaded)
  saveSeoSettings: (...a) => import('./seo.js').then(m => m.saveSeoSettings(...a)),
  loadSeoEditor: (...a) => import('./seo.js').then(m => m.loadSeoEditor(...a)),
  // Page Builder (lazy)
  loadPageEditor: _lp('loadPageEditor'), savePage: _lp('savePage'), editPage: _lp('editPage'),
  deletePage: _lp('deletePage'), resetPageForm: _lp('resetPageForm'),
  loadPageSections: _lp('loadPageSections'), loadCourseSalesSections: _lp('loadCourseSalesSections'),
  addSection: _lp('addSection'), saveSectionFields: _lp('saveSectionFields'),
  editSection: _lp('editSection'), deleteSection: _lp('deleteSection'),
  onSectionTypeChange: _lp('onSectionTypeChange'), initPageDragDrop: _lp('initPageDragDrop'),
  loadBlogEditor: _lp('loadBlogEditor'), saveBlogPost: _lp('saveBlogPost'),
  editBlogPost: _lp('editBlogPost'), deleteBlogPost: _lp('deleteBlogPost'),
  resetBlogForm: _lp('resetBlogForm'),
  loadBlogSections: _lp('loadBlogSections'), saveBlogSectionFields: _lp('saveBlogSectionFields'),
  editBlogSection: _lp('editBlogSection'), deleteBlogSection: _lp('deleteBlogSection'),
  onBlogSectionTypeChange: _lp('onBlogSectionTypeChange'), resetBlogSectionForm: _lp('resetBlogSectionForm'),
  removeBlogCoverImage: _lp('removeBlogCoverImage'),
  addDynamicItem: _lp('addDynamicItem'), removeDynamicItem: _lp('removeDynamicItem'),
  handlePbImageSelect: _lp('handlePbImageSelect'), removePbImage: _lp('removePbImage'),
  resetSectionForm: _lp('resetSectionForm'),
  // Public Website
  renderPublicPage, renderBlogList, renderBlogPost,
  renderPublicContact, submitPublicContact,
  // Utils
  showToast,
};
Object.assign(window, _appActions);
registerActions(_appActions);

// Expose onboardElements + renderOnboardElements (lazy — admin only)
let _adminMod = null;
const _getAdminMod = () => { if (!_adminMod) { const p = import('./admin.js'); p.then(m => { _adminMod = m; }); return p; } return Promise.resolve(_adminMod); };
Object.defineProperty(window, 'onboardElements', {
  get: () => _adminMod ? _adminMod.onboardElements : [],
  set: () => {},
});
window.renderOnboardElements = (...a) => _getAdminMod().then(m => m.renderOnboardElements(...a));
window.__clearImpulseCache = clearImpulseCache;
window.__clearCheckinCache = clearCheckinCache;
window.__clearWeeklyImpulseCache = clearWeeklyImpulseCache;
window.__clearMeditationCache = clearMeditationCache;

// Register extra window functions in action registry
registerActions({
  togglePublicMobileNav,
  __pubNav: window.__pubNav,
  observeLazyBgs,
  setLoadProgress,
  finishLoading,
  dismissLoading,
  dismissLoading30,
  renderOnboardElements: window.renderOnboardElements,
});

// ── LAZY BACKGROUND IMAGES ──

const bgObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const bgUrl = sanitizeCssUrl(e.target.dataset.bg);
      if (bgUrl) e.target.style.backgroundImage = `url('${bgUrl}')`;
      e.target.classList.add('bg-loaded');
      bgObserver.unobserve(e.target);
    }
  });
}, { rootMargin: '200px' });

function observeLazyBgs() {
  document.querySelectorAll('[data-bg]:not(.bg-loaded)').forEach(el => bgObserver.observe(el));
}
window.observeLazyBgs = observeLazyBgs;

// ── LOADING PROGRESS ──

function setLoadProgress(pct) {
  const bar = document.getElementById('loadingBar');
  const txt = document.getElementById('loadingBarText');
  if (bar) bar.style.width = Math.min(pct, 100) + '%';
  if (txt) txt.textContent = Math.round(pct) + ' %';
}
window.setLoadProgress = setLoadProgress;

function showImpulseOnSplash(text) {
  if (!text) return;
  const q = document.getElementById('loadingSplashQuote');
  if (q) q.textContent = '\u00AB' + text + '\u00BB';
  // Cache for instant display on next load
  try { localStorage.setItem('klarzeit_last_impulse', text); } catch (_) {}
}

function finishLoading(showImpulse) {
  setLoadProgress(100);
  if (!showImpulse) {
    setTimeout(() => navigateTo('courses'), 300);
    return;
  }
  const barWrap = document.getElementById('loadingBarWrap');
  const doneBtn = document.getElementById('loadingDoneBtn');
  const muteBtn = document.getElementById('loadingMuteBtn');
  // Fade out bar, then show button (both absolute — no layout shift)
  if (barWrap) barWrap.classList.add('done');
  setTimeout(() => {
    if (doneBtn) doneBtn.style.display = '';
    if (muteBtn) muteBtn.style.display = '';
  }, 400);
}
window.finishLoading = finishLoading;

function dismissLoading() {
  navigateTo('courses');
}

function dismissLoading30() {
  const key = 'klarzeit_impulse_muted_' + (state.currentUser?.id || '');
  localStorage.setItem(key, String(Date.now() + 30 * 24 * 60 * 60 * 1000));
  navigateTo('courses');
}
window.dismissLoading = dismissLoading;
window.dismissLoading30 = dismissLoading30;

// ── INIT ──

async function init() {
  initEventDelegation();
  initDarkMode();
  updateDockDarkIcon();
  initBottomSheetGestures();
  registerServiceWorker();
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();
  navigateTo('loading');
  setLoadProgress(5);

  // Show cached impulse text instantly
  try {
    const cached = localStorage.getItem('klarzeit_last_impulse');
    if (cached) showImpulseOnSplash(cached);
  } catch (_) {}

  // Load settings in parallel (login bg, typography, colors)
  await Promise.all([
    sb.from('settings').select('value').eq('key', 'login_bg').single().then(({ data }) => {
      const bgUrl = sanitizeCssUrl(data?.value);
      if (bgUrl) document.getElementById('authBg').style.backgroundImage = `url('${bgUrl}')`;
    }).catch(() => {}),
    loadAndApplyTypography(),
    loadAndApplyColors(),
  ]);
  setLoadProgress(15);

  // Load SEO settings & initialize tracking (non-blocking)
  import('./seo.js').then(async (seo) => {
    await seo.loadSeoSettings();
    seo.initGA4();
    seo.initMetaPixel();
  });

  const urlParams = new URLSearchParams(location.search);
  const inviteToken = urlParams.get('invite');
  if (inviteToken) state.pendingInvite = inviteToken;

  // ── Stripe success/cancel redirect ──
  const stripeSuccess = urlParams.get('purchase_success');
  const stripeCourseId = urlParams.get('course_id');
  if (stripeSuccess === '1' && stripeCourseId) {
    state.pendingStripeSuccess = stripeCourseId;
  }

  // ── Password recovery ──
  const hash = location.hash;
  if (hash && hash.includes('type=recovery')) {
    const { data } = await sb.auth.getSession();
    if (data?.session) {
      state.currentUser = data.session.user;
      navigateTo('resetPassword');
      return;
    }
  }

  // ── Auth check ──
  try {
    const { data: { session }, error } = await sb.auth.getSession();
    if (error) { navigateTo('auth'); return; }

    if (session && session.user) {
      // ── LOGGED IN → App ──
      await checkBiometricLock();
      state.currentUser = session.user;
      setLoadProgress(20);

      // Show impulse text on loading splash (non-blocking)
      getCurrentImpulseText().then(text => showImpulseOnSplash(text)).catch(() => {});

      try {
        const [,] = await Promise.all([
          loadOnboardingData(),
          postLogin(),
        ]);
        setLoadProgress(25);
        if (state.isAdmin) import('./admin.js').then(m => m.initImageUploadZones());
        updateDockEmail();
      } catch (e) {
        console.error(e);
        showToast(trDataErr(e, 'load'), 'error');
        setupHeader();
        updateDockEmail();
        navigateTo('courses');
      }
    } else {
      // ── NOT LOGGED IN → Public website or Auth ──
      if (state.pendingInvite || urlParams.get('login')) {
        if (state.pendingInvite) showToast('Bitte melde dich an, um den Einladungslink einzulösen.');
        navigateTo('auth');
        return;
      }

      // 404.html fallback: recover original path (validate to prevent URL spoofing)
      const fallbackPath = urlParams.get('__path');
      if (fallbackPath && /^\/[a-zA-Z0-9\/_-]*$/.test(fallbackPath)) {
        history.replaceState(null, '', fallbackPath);
      }

      const pathname = (fallbackPath || location.pathname).replace(/\/+$/, '') || '/';

      // Clean URL routing for public pages
      const CLEAN_ROUTES = {
        '/': 'publicHome', '/about': 'publicAbout', '/kontakt': 'publicContact',
        '/blog': 'publicBlog', '/datenschutz': 'publicDatenschutz',
        '/agb': 'publicAgb', '/privacy': 'publicPrivacy',
      };
      const cleanRoute = CLEAN_ROUTES[pathname];
      if (cleanRoute) { navigateTo(cleanRoute); return; }
      if (pathname.startsWith('/blog/')) { navigateTo('publicBlogPost', { slug: pathname.split('/blog/')[1] }); return; }
      if (pathname.match(/^\/kurs\/[^/]+\/reinhoeren$/)) { navigateTo('publicCoursePreview', { slug: pathname.split('/kurs/')[1].replace('/reinhoeren', '') }); return; }
      if (pathname.startsWith('/kurs/')) { navigateTo('publicCourseSales', { slug: pathname.split('/kurs/')[1] }); return; }
      if (pathname.startsWith('/seite/')) { navigateTo('publicPage', { slug: pathname.split('/seite/')[1] }); return; }

      // Legacy query params
      const publicPage = urlParams.get('seite');
      if (publicPage) {
        const pubRoutes = { home:'publicHome', about:'publicAbout', kontakt:'publicContact', blog:'publicBlog', datenschutz:'publicDatenschutz', agb:'publicAgb', privacy:'publicPrivacy' };
        navigateTo(pubRoutes[publicPage] || 'publicPage', pubRoutes[publicPage] ? undefined : { slug: publicPage });
        return;
      }
      const blogSlug = urlParams.get('blog');
      if (blogSlug) { navigateTo('publicBlogPost', { slug: blogSlug }); return; }

      // Sales pages (accessible without login)
      const salesSlug = urlParams.get('kurs');
      if (salesSlug) { navigateTo('salesDetail', { slug: salesSlug }); return; }
      if (urlParams.get('kurse') === '1') { navigateTo('salesOverview'); return; }

      // Default: public home
      navigateTo('publicHome');
    }
  } catch (e) {
    console.error(e);
    navigateTo('auth');
  }
}

// ── AUTH STATE LISTENER ──

sb.auth.onAuthStateChange(async (event, session) => {
  if (event === 'PASSWORD_RECOVERY') {
    state.currentUser = session?.user || null;
    navigateTo('resetPassword');
  } else if (event === 'SIGNED_OUT') {
    state.currentUser = null;
    state.isAdmin = false;
    state.cacheData = { courses: [], chapters: [], exercises: [], questions: [] };
    state.cacheAnswers = {};
    state.cacheAnswerDates = {};
    state.cacheAccess = [];
    state.cacheAccessFull = [];
    state.chapterProgress = {};
    state.toolImages = {};
    if (state.currentView !== 'auth') navigateTo('auth');
  } else if (event === 'TOKEN_REFRESHED' && session?.user) {
    state.currentUser = session.user;
  }
});

// ── KEYBOARD SHORTCUTS ──

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    if (state.currentView === 'auth') {
      const f = document.activeElement;
      if (f && (f.id === 'emailInput' || f.id === 'passwordInput' || f.id === 'passwordConfirm')) handleAuth();
    }
    if (state.currentView === 'resetPassword') {
      const f = document.activeElement;
      if (f && (f.id === 'resetPasswordInput' || f.id === 'resetPasswordConfirm')) handleResetPassword();
    }
  }
});

// ── IFRAME HEIGHT REPORTING ──

function sendHeight() {
  window.parent.postMessage({ type: 'klarzeit_height', height: document.body.scrollHeight }, location.origin);
}
new ResizeObserver(() => sendHeight()).observe(document.body);

// ── POPSTATE (browser back/forward for public pages) ──

function routeByPath() {
  const pathname = location.pathname.replace(/\/+$/, '') || '/';
  const CLEAN_ROUTES = {
    '/': 'publicHome', '/about': 'publicAbout', '/kontakt': 'publicContact',
    '/blog': 'publicBlog', '/datenschutz': 'publicDatenschutz',
    '/agb': 'publicAgb', '/privacy': 'publicPrivacy',
  };
  const cleanRoute = CLEAN_ROUTES[pathname];
  if (cleanRoute) { navigateTo(cleanRoute); return; }
  if (pathname.startsWith('/blog/')) { navigateTo('publicBlogPost', { slug: pathname.split('/blog/')[1] }); return; }
  if (pathname.match(/^\/kurs\/[^/]+\/reinhoeren$/)) { navigateTo('publicCoursePreview', { slug: pathname.split('/kurs/')[1].replace('/reinhoeren', '') }); return; }
  if (pathname.startsWith('/kurs/')) { navigateTo('publicCourseSales', { slug: pathname.split('/kurs/')[1] }); return; }
  if (pathname.startsWith('/seite/')) { navigateTo('publicPage', { slug: pathname.split('/seite/')[1] }); return; }
  navigateTo('publicHome');
}

window.addEventListener('popstate', (e) => {
  if (e.state?.view) {
    navigateTo(e.state.view, e.state.params);
  } else {
    // No state (initial page load URL) — re-route by current path
    routeByPath();
  }
});

// ── START ──
init();
