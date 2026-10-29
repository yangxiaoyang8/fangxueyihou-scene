const mobilePanel = document.querySelector('.panel');
const mobilePanelToggle = document.querySelector('#mobilePanelToggle');
const mobileQuery = matchMedia('(max-width: 680px)');

function setPanelExpanded(expanded) {
  mobilePanel.classList.toggle('is-collapsed', !expanded);
  if (expanded) mobilePanel.scrollTop = 0;
  mobilePanelToggle.setAttribute('aria-expanded', String(expanded));
  mobilePanelToggle.querySelector('.mobile-toggle-label').textContent = expanded ? '收起' : '展开';
  mobilePanelToggle.querySelector('.mobile-panel-chevron').textContent = expanded ? '⌄' : '⌃';
}

function syncMobilePanel() {
  const selectedTab = document.querySelector('[data-mobile-tab][aria-selected="true"]');
  document.querySelectorAll('[data-mobile-tab]').forEach(tab => { tab.tabIndex = tab === selectedTab ? 0 : -1; });
  if (mobileQuery.matches) setPanelExpanded(false);
  else {
    mobilePanel.classList.remove('is-collapsed');
    mobilePanelToggle.setAttribute('aria-expanded', 'true');
  }
}

mobilePanelToggle.addEventListener('click', () => {
  setPanelExpanded(mobilePanel.classList.contains('is-collapsed'));
});
if(mobileQuery.addEventListener)mobileQuery.addEventListener('change',syncMobilePanel);else mobileQuery.addListener(syncMobilePanel);
syncMobilePanel();

document.querySelectorAll('.mobile-quicknav button').forEach(button => {
  button.addEventListener('click', () => {
    if (mobilePanel.classList.contains('is-collapsed')) setPanelExpanded(true);
    const selectedView = button.dataset.mobileTab;
    if (!selectedView) return;
    document.querySelectorAll('[data-mobile-tab]').forEach(tab => {
      const selected = tab === button;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    document.querySelectorAll('[data-mobile-view]').forEach(view => {
      view.classList.toggle('is-active', view.dataset.mobileView === selectedView);
    });
    mobilePanel.dataset.activeMobileTab = selectedView;
    mobilePanel.scrollTop = 0;
  });
});

document.querySelector('.mobile-quicknav')?.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  const tabs = [...document.querySelectorAll('[data-mobile-tab]')];
  const current = tabs.indexOf(document.activeElement);
  if (current < 0) return;
  event.preventDefault();
  tabs[(current + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length].focus();
});
