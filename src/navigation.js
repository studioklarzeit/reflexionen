import { state } from './state.js';
import { renderCoursesList } from './courses.js';
import { renderChaptersList } from './chapters.js';
import { renderExercisesList, renderQuestionsView } from './exercises.js';
import { switchAdminTab } from './admin.js';
import { renderOnboarding } from './onboarding.js';

export function navigateTo(view, params) {
  params = params || {};
  const oldView = document.querySelector('.view.active');

  if (oldView && state.currentView !== view) {
    oldView.classList.remove('active');
    oldView.classList.add('view-exit');
    setTimeout(() => { oldView.classList.remove('view-exit'); }, 260);
  } else {
    document.querySelectorAll('.view').forEach((v) => {
      v.classList.remove('active');
      v.classList.remove('view-exit');
    });
  }

  state.currentView = view;
  const hide = (view === 'auth' || view === 'loading' || view === 'resetPassword' || view === 'onboarding' || view === 'salesOverview' || view === 'salesDetail');
  document.getElementById('mainHeader').style.display = hide ? 'none' : 'flex';

  // Tab bar visibility & active state
  const tabBar = document.getElementById('tabBar');
  if (tabBar) {
    tabBar.style.display = hide ? 'none' : '';
    document.body.classList.toggle('has-dock', !hide);
    // Map views to their parent tab
    const tabMap = {
      courses: 'courses', coursePlayer: 'courses', chapterPlayer: 'courses', chapters: 'courses',
      exercises: 'courses', questions: 'courses',
      tools: 'tools', journal: 'tools', friendView: 'tools', checkin: 'tools',
      bodycheck: 'tools', energy: 'tools', impulse: 'tools',
      meditation: 'meditation',
    };
    const activeTab = tabMap[view] || 'courses';
    tabBar.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === activeTab);
    });
  }

  const delay = oldView && !hide ? 150 : 0;

  setTimeout(async () => {
    document.querySelectorAll('.view').forEach((v) => {
      if (!v.classList.contains('view-exit')) v.classList.remove('active');
    });

    switch (view) {
      case 'loading':
        document.getElementById('viewLoading').classList.add('active');
        break;
      case 'auth':
        document.getElementById('viewAuth').classList.add('active');
        break;
      case 'resetPassword':
        document.getElementById('viewResetPassword').classList.add('active');
        break;
      case 'onboarding':
        document.getElementById('viewOnboarding').classList.add('active');
        renderOnboarding();
        break;
      case 'impulse':
        document.getElementById('viewImpulse').classList.add('active');
        import('./weeklyimpulse.js').then(m => m.renderImpulseView());
        break;
      case 'salesOverview': {
        const { renderSalesOverview } = await import('./sales.js');
        document.getElementById('viewSalesOverview').classList.add('active');
        renderSalesOverview();
        break;
      }
      case 'salesDetail': {
        const { renderSalesDetail } = await import('./sales.js');
        document.getElementById('viewSalesDetail').classList.add('active');
        renderSalesDetail(params.slug);
        break;
      }
      case 'courses':
        document.getElementById('viewCourses').classList.add('active');
        renderCoursesList();
        break;
      case 'coursePlayer': {
        const { renderCoursePlayer, stopChapterAudio } = await import('./courseplayer.js');
        stopChapterAudio();
        state.currentCourseId = params.courseId;
        document.getElementById('viewCoursePlayer').classList.add('active');
        renderCoursePlayer();
        break;
      }
      case 'chapterPlayer': {
        const { renderChapterPlayer, stopChapterAudio: stopAudio } = await import('./courseplayer.js');
        stopAudio();
        state.currentCourseId = params.courseId;
        state.currentChapterId = params.chapterId;
        document.getElementById('viewChapterPlayer').classList.add('active');
        renderChapterPlayer();
        break;
      }
      case 'chapters':
        state.currentCourseId = params.courseId;
        document.getElementById('viewChapters').classList.add('active');
        renderChaptersList();
        break;
      case 'exercises':
        state.currentCourseId = params.courseId;
        state.currentChapterId = params.chapterId;
        document.getElementById('viewExercises').classList.add('active');
        renderExercisesList();
        break;
      case 'questions':
        state.currentCourseId = params.courseId;
        state.currentChapterId = params.chapterId;
        state.currentExerciseId = params.exerciseId;
        document.getElementById('viewQuestions').classList.add('active');
        renderQuestionsView();
        break;
      case 'admin':
        document.getElementById('viewAdmin').classList.add('active');
        switchAdminTab('courses');
        break;
      case 'profile': {
        const { renderProfile } = await import('./profile.js');
        document.getElementById('viewProfile').classList.add('active');
        renderProfile();
        break;
      }
      case 'pro': {
        const { renderPro } = await import('./pro.js');
        document.getElementById('viewPro').classList.add('active');
        renderPro();
        break;
      }
      case 'contact': {
        const { renderContact } = await import('./contact.js');
        document.getElementById('viewContact').classList.add('active');
        renderContact();
        break;
      }
      case 'journal': {
        const { renderJournal } = await import('./journal.js');
        document.getElementById('viewJournal').classList.add('active');
        renderJournal();
        break;
      }
      case 'tools': {
        document.getElementById('viewTools').classList.add('active');
        break;
      }
      case 'friendView': {
        const { renderFriendView } = await import('./friendview.js');
        document.getElementById('viewFriendView').classList.add('active');
        renderFriendView();
        break;
      }
      case 'checkin': {
        const { renderCheckin } = await import('./checkin.js');
        document.getElementById('viewCheckin').classList.add('active');
        renderCheckin();
        break;
      }
      case 'bodycheck': {
        const { renderBodyCheck } = await import('./bodycheck.js');
        document.getElementById('viewBodycheck').classList.add('active');
        renderBodyCheck();
        break;
      }
      case 'energy': {
        const { renderEnergyBalance } = await import('./energybalance.js');
        document.getElementById('viewEnergy').classList.add('active');
        renderEnergyBalance();
        break;
      }
      case 'meditation': {
        const { renderMeditation } = await import('./meditation.js');
        document.getElementById('viewMeditation').classList.add('active');
        renderMeditation();
        break;
      }
    }
  }, delay);

  // SEO meta update + tracking (lazy loaded)
  import('./seo.js').then(m => m.onNavigate(view, params));

  window.scrollTo({ top: 0, behavior: 'smooth' });
}
