// ── Styles ──
import './styles/main.css';

// ── Modules ──
import { sb } from './config.js';
import { state } from './state.js';
import { showToast, trDataErr } from './utils.js';
import { initDarkMode, toggleDarkMode } from './darkmode.js';
import { navigateTo } from './navigation.js';
import { loadOnboardingData } from './onboarding.js';
import {
  handleAuth, handleLogout, handleResetPassword,
  toggleAuthMode, handleForgotPassword, togglePasswordVisibility,
  postLogin, setupHeader, getAuthMode,
} from './auth.js';
import { dismissOnboarding } from './onboarding.js';
import {
  saveQuestions, exportPDF, exportChapterPDF, exportCoursePDF,
  saveAndNextQuestion, goToNextExercise,
  showQuestionSummary, handleInput, handleChoice, handleScale,
} from './exercises.js';
import { openMobileMenu, closeMobileMenu, updateMobileDarkLabel, initBottomSheetGestures } from './mobile.js';
import { registerServiceWorker, updateOnlineStatus } from './sw.js';
import { initEventDelegation } from './events.js';
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
} from './weeklyimpulse.js';
import {
  renderContact, submitContactForm,
} from './contact.js';
import {
  renderPro, submitProQuestion,
} from './pro.js';
import {
  toggleBulkUpload, updateBulkChapterSelect, downloadBulkTemplate,
  handleBulkFileSelect, executeBulkImport, clearBulkUpload,
} from './bulkupload.js';
import {
  loadPageEditor, savePage, editPage, deletePage, resetPageForm,
  loadPageSections, addSection, saveSectionFields, editSection, deleteSection,
  onSectionTypeChange, initPageDragDrop,
  loadBlogEditor, saveBlogPost, editBlogPost, deleteBlogPost, resetBlogForm,
  loadBlogSections, saveBlogSectionFields, editBlogSection, deleteBlogSection,
  onBlogSectionTypeChange, resetBlogSectionForm, removeBlogCoverImage,
  addDynamicItem, removeDynamicItem, handlePbImageSelect, removePbImage,
  resetSectionForm,
} from './pagebuilder.js';
import {
  renderPublicPage, renderBlogList, renderBlogPost,
  renderPublicContact, submitPublicContact,
} from './public.js';
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
} from './profile.js';
import {
  switchAdminTab, toggleAdminGroup, saveCourse, editCourse, deleteCourse, resetCourseForm, toggleCourseSalesFields, populateParentCourseSelect,
  saveChapter, editChapter, deleteChapter, resetChapterForm, handleChapterAudioSelect, toggleChapterOnlineFields,
  saveExercise, editExercise, deleteExercise, resetExerciseForm,
  updateExerciseChapterSelect,
  saveQuestion, editQuestion, deleteQuestion, resetQuestionForm,
  onQuestionTypeChange, addOptionRow, updateQuestionExerciseSelect,
  renderAdminCourses, manageInvites, createInvite,
  toggleAdmin, addOnboardElement, saveOnboarding, previewOnboarding,
  onboardElements, renderOnboardElements,
  handleImageFileSelect, removeCourseImage, removeChapterImage, initImageUploadZones,
  saveLoginBg, removeLoginBgImage,
  saveTypography, previewTypography, loadAndApplyTypography,
  addJournalImpulseRow, removeJournalImpulseRow, updateJournalImpulse, saveJournalImpulses,
  saveColors, previewColors, loadAndApplyColors,
  addCheckinQuestion, removeCheckinQ, updateCheckinQ,
  addCheckinOption, removeCheckinOption, updateCheckinOption, saveCheckinQuestions,
  saveWeeklyImpulses,
  saveMeditation, editMeditation, deleteMeditation, resetMeditationForm,
  handleMeditationAudioSelect, handleMeditationImageSelect, removeMeditationImage,
  loadAdminMessages, filterMessages, deleteMessage, loadAdminProQuestions,
  saveContent, editContent, deleteContent, resetContentForm,
  onContentTypeChange,
  saveElement, resetElementForm, onExerciseAddTypeChange,
  renderAdminContent,
  onChapterContentAddTypeChange, saveChapterContent,
  editChapterContentBlock, deleteChapterContentBlock,
  resetChapterContentForm, renderAdminChapterContent,
} from './admin.js';

// ── Public mobile nav toggle ──
function togglePublicMobileNav() {
  const nav = document.getElementById('publicMobileNav');
  if (nav) nav.classList.toggle('open');
}
window.togglePublicMobileNav = togglePublicMobileNav;

// Public nav link helper (used by public.js CTA sections)
// Supports both clean paths (/about) and legacy query params (?seite=about)
window.__pubNav = function(link) {
  if (!link) return;
  if (link.startsWith('http') || link.startsWith('//')) {
    window.open(link, '_blank');
    return;
  }
  // Clean path mapping
  const CLEAN_NAV = {
    '/': 'publicHome',
    '/about': 'publicAbout',
    '/kontakt': 'publicContact',
    '/blog': 'publicBlog',
    '/datenschutz': 'publicDatenschutz',
    '/agb': 'publicAgb',
    '/privacy': 'publicPrivacy',
  };
  const route = CLEAN_NAV[link];
  if (route) { navigateTo(route); return; }
  // Blog post: /blog/{slug}
  if (link.startsWith('/blog/')) {
    navigateTo('publicBlogPost', { slug: link.split('/blog/')[1] });
    return;
  }
  // Custom page: /seite/{slug}
  if (link.startsWith('/seite/')) {
    navigateTo('publicPage', { slug: link.split('/seite/')[1] });
    return;
  }
  // Legacy query params
  if (link.startsWith('?seite=')) {
    const slug = link.replace('?seite=', '');
    navigateTo('publicPage', { slug });
    return;
  }
  // Internal SPA view name (e.g. 'auth')
  navigateTo(link);
};

// ── Dark mode dock icon helper (legacy, kept for mobile drawer) ──
function updateDockDarkIcon() {}

// ── Dock user email helper (legacy) ──
function updateDockEmail() {}

// ── Expose functions on window for inline onclick handlers ──
Object.assign(window, {
  // Navigation
  navigateTo,
  // Auth
  handleAuth, handleLogout, handleResetPassword,
  toggleAuthMode, handleForgotPassword, togglePasswordVisibility,
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
  handleChangePassword, openStripePortal, saveProfileDetails,
  // Admin
  switchAdminTab, toggleAdminGroup, saveCourse, editCourse, deleteCourse, resetCourseForm, toggleCourseSalesFields, populateParentCourseSelect,
  saveChapter, editChapter, deleteChapter, resetChapterForm, handleChapterAudioSelect, toggleChapterOnlineFields,
  saveExercise, editExercise, deleteExercise, resetExerciseForm,
  updateExerciseChapterSelect,
  saveQuestion, editQuestion, deleteQuestion, resetQuestionForm,
  onQuestionTypeChange, addOptionRow, updateQuestionExerciseSelect,
  renderAdminCourses, manageInvites, createInvite,
  toggleAdmin, addOnboardElement, saveOnboarding, previewOnboarding,
  handleImageFileSelect, removeCourseImage, removeChapterImage,
  saveLoginBg, removeLoginBgImage,
  saveTypography, previewTypography,
  addJournalImpulseRow, removeJournalImpulseRow, updateJournalImpulse, saveJournalImpulses,
  saveColors, previewColors,
  addCheckinQuestion, removeCheckinQ, updateCheckinQ,
  addCheckinOption, removeCheckinOption, updateCheckinOption, saveCheckinQuestions,
  saveWeeklyImpulses,
  saveMeditation, editMeditation, deleteMeditation, resetMeditationForm,
  handleMeditationAudioSelect, handleMeditationImageSelect, removeMeditationImage,
  loadAdminMessages, filterMessages, deleteMessage, loadAdminProQuestions,
  saveContent, editContent, deleteContent, resetContentForm,
  onContentTypeChange,
  saveElement, resetElementForm, onExerciseAddTypeChange,
  renderAdminContent,
  onChapterContentAddTypeChange, saveChapterContent,
  editChapterContentBlock, deleteChapterContentBlock,
  resetChapterContentForm, renderAdminChapterContent,
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
  // Bulk Upload
  toggleBulkUpload, updateBulkChapterSelect, downloadBulkTemplate,
  handleBulkFileSelect, executeBulkImport, clearBulkUpload,
  // Course Player (lazy loaded, assigned dynamically)
  openChapterPlayer: (...a) => import('./courseplayer.js').then(m => m.openChapterPlayer(...a)),
  toggleChapterAudio: (...a) => import('./courseplayer.js').then(m => m.toggleChapterAudio(...a)),
  seekChapterAudio: (...a) => import('./courseplayer.js').then(m => m.seekChapterAudio(...a)),
  markChapterCompleteAndNext: (...a) => import('./courseplayer.js').then(m => m.markChapterCompleteAndNext(...a)),
  // Sales (lazy loaded)
  handlePurchase: (...a) => import('./sales.js').then(m => m.handlePurchase(...a)),
  // SEO & Tracking (lazy loaded)
  saveSeoSettings: (...a) => import('./seo.js').then(m => m.saveSeoSettings(...a)),
  loadSeoEditor: (...a) => import('./seo.js').then(m => m.loadSeoEditor(...a)),
  // Page Builder (CMS)
  loadPageEditor, savePage, editPage, deletePage, resetPageForm,
  loadPageSections, addSection, saveSectionFields, editSection, deleteSection,
  onSectionTypeChange, initPageDragDrop,
  loadBlogEditor, saveBlogPost, editBlogPost, deleteBlogPost, resetBlogForm,
  loadBlogSections, saveBlogSectionFields, editBlogSection, deleteBlogSection,
  onBlogSectionTypeChange, resetBlogSectionForm, removeBlogCoverImage,
  addDynamicItem, removeDynamicItem, handlePbImageSelect, removePbImage,
  resetSectionForm,
  // Public Website
  renderPublicPage, renderBlogList, renderBlogPost,
  renderPublicContact, submitPublicContact,
  // Utils
  showToast,
});

// Expose onboardElements + renderOnboardElements for inline onchange handlers
Object.defineProperty(window, 'onboardElements', {
  get: () => onboardElements,
  set: () => {},
});
window.renderOnboardElements = renderOnboardElements;
window.__clearImpulseCache = clearImpulseCache;
window.__clearCheckinCache = clearCheckinCache;
window.__clearWeeklyImpulseCache = clearWeeklyImpulseCache;
window.__clearMeditationCache = clearMeditationCache;

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
  document.getElementById('loadingText').textContent = 'Verbindung wird hergestellt …';

  // Load login background image
  try {
    const { data: bgData } = await sb.from('settings').select('value').eq('key', 'login_bg').single();
    if (bgData?.value) {
      document.getElementById('authBg').style.backgroundImage = `url(${bgData.value})`;
    }
  } catch (e) { /* no login bg set */ }

  // Load typography settings
  await loadAndApplyTypography();
  await loadAndApplyColors();

  // Load SEO settings & initialize tracking (non-blocking)
  import('./seo.js').then(async (seo) => {
    await seo.loadSeoSettings();
    seo.initGA4();
    seo.initMetaPixel();
  });

  const urlParams = new URLSearchParams(location.search);
  const inviteToken = urlParams.get('invite');
  if (inviteToken) state.pendingInvite = inviteToken;

  // ── 404.html fallback: recover original path from __path param ──
  const fallbackPath = urlParams.get('__path');
  if (fallbackPath) {
    // Replace current URL with the clean path (remove __path param)
    history.replaceState(null, '', fallbackPath);
  }

  // ── Clean URL routing (pathname-based) ──
  const pathname = (fallbackPath || location.pathname).replace(/\/+$/, '') || '/';
  const CLEAN_ROUTES = {
    '/': 'publicHome',
    '/about': 'publicAbout',
    '/kontakt': 'publicContact',
    '/blog': 'publicBlog',
    '/datenschutz': 'publicDatenschutz',
    '/agb': 'publicAgb',
    '/privacy': 'publicPrivacy',
  };

  // Only route via clean paths if pathname is not root OR there are no query params
  // (Root "/" with query params like ?login=1 or ?kurs=slug should fall through to legacy routing)
  if (pathname !== '/' || (!urlParams.has('seite') && !urlParams.has('blog') && !urlParams.has('kurs') && !urlParams.has('kurse') && !urlParams.has('purchase_success') && !urlParams.has('login') && !urlParams.has('invite') && !location.hash)) {
    const cleanRoute = CLEAN_ROUTES[pathname];
    if (cleanRoute && pathname !== '/') {
      navigateTo(cleanRoute);
      return;
    }
    // Blog post: /blog/{slug}
    if (pathname.startsWith('/blog/')) {
      navigateTo('publicBlogPost', { slug: pathname.split('/blog/')[1] });
      return;
    }
    // Custom page: /seite/{slug}
    if (pathname.startsWith('/seite/')) {
      navigateTo('publicPage', { slug: pathname.split('/seite/')[1] });
      return;
    }
  }

  // ── Public sales routes (no auth required) ──
  const salesSlug = urlParams.get('kurs');
  const salesOverview = urlParams.get('kurse');
  if (salesSlug) {
    navigateTo('salesDetail', { slug: salesSlug });
    return;
  }
  if (salesOverview === '1') {
    navigateTo('salesOverview');
    return;
  }

  // ── Public website routes (legacy query params, backward compat) ──
  const publicPage = urlParams.get('seite');
  if (publicPage) {
    const publicRoutes = {
      home: 'publicHome',
      about: 'publicAbout',
      kontakt: 'publicContact',
      blog: 'publicBlog',
      datenschutz: 'publicDatenschutz',
      agb: 'publicAgb',
      privacy: 'publicPrivacy',
    };
    const route = publicRoutes[publicPage];
    if (route) {
      navigateTo(route);
      return;
    }
    // Generic page by slug
    navigateTo('publicPage', { slug: publicPage });
    return;
  }
  const blogSlug = urlParams.get('blog');
  if (blogSlug) {
    navigateTo('publicBlogPost', { slug: blogSlug });
    return;
  }

  // ── Stripe success/cancel redirect ──
  const stripeSuccess = urlParams.get('purchase_success');
  const stripeCourseId = urlParams.get('course_id');
  if (stripeSuccess === '1' && stripeCourseId) {
    state.pendingStripeSuccess = stripeCourseId;
  }

  const hash = location.hash;
  if (hash && hash.includes('type=recovery')) {
    const { data } = await sb.auth.getSession();
    if (data?.session) {
      state.currentUser = data.session.user;
      navigateTo('resetPassword');
      return;
    }
  }

  try {
    const { data: { session }, error } = await sb.auth.getSession();
    if (error) { navigateTo('auth'); return; }
    if (session && session.user) {
      state.currentUser = session.user;
      document.getElementById('loadingText').textContent = 'Daten werden geladen …';
      try {
        await loadOnboardingData();
        await postLogin();
        initImageUploadZones();
        updateDockEmail();
      } catch (e) {
        console.error(e);
        showToast(trDataErr(e, 'load'), 'error');
        setupHeader();
        updateDockEmail();
        navigateTo('courses');
      }
    } else {
      if (state.pendingInvite) showToast('Bitte melde dich an, um den Einladungslink einzulösen.');
      // If on root "/" with no special params, show public home
      const hasLoginParam = urlParams.get('login');
      if (!state.pendingInvite && !hasLoginParam && pathname === '/') {
        navigateTo('publicHome');
      } else {
        navigateTo('auth');
      }
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
    state.cacheAnswers = {};
    state.cacheAccess = [];
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
  window.parent.postMessage({ type: 'klarzeit_height', height: document.body.scrollHeight }, '*');
}
new ResizeObserver(() => sendHeight()).observe(document.body);

// ── POPSTATE (browser back/forward for public pages) ──

window.addEventListener('popstate', (e) => {
  if (e.state?.view) {
    navigateTo(e.state.view, e.state.params);
  }
});

// ── START ──
init();
