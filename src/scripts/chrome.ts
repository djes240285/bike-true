import { INSTALL_KEY, NOTICE_KEY } from '../lib/device';

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function stored(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

function standalone() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

function ios() {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

function syncDock() {
  const stack = document.getElementById('bt-docks');
  const open = stack?.querySelector('.dock:not([hidden])');
  document.body.classList.toggle('has-dock', Boolean(open));
}

async function keepStored() {
  try {
    if (!navigator.storage?.persist) return;
    if (await navigator.storage.persisted()) return;
    await navigator.storage.persist();
  } catch {
    /* the browser decides */
  }
}

function show(id: string, visible: boolean) {
  const node = document.getElementById(id);
  if (!node) return;
  node.hidden = !visible;
  syncDock();
}

export function setupChrome() {
  const install = document.getElementById('bt-install');
  const installText = document.getElementById('bt-install-text');
  const installGo = document.getElementById('bt-install-go');
  let promptEvent: InstallPrompt | null = null;
  let noticeDone = stored(NOTICE_KEY) === '1';

  const offerInstall = () => {
    if (!install || standalone() || stored(INSTALL_KEY) === '1') return;
    if (ios()) {
      if (installText) installText.textContent = install.dataset.ios || '';
      if (installGo) installGo.hidden = true;
      show('bt-install', true);
      return;
    }
    if (!promptEvent) return;
    if (installText) installText.textContent = install.dataset.android || '';
    if (installGo) installGo.hidden = false;
    show('bt-install', true);
  };

  if (!noticeDone) show('bt-notice', true);
  else offerInstall();

  document.getElementById('bt-notice-ok')?.addEventListener('click', () => {
    store(NOTICE_KEY, '1');
    noticeDone = true;
    show('bt-notice', false);
    void keepStored();
    offerInstall();
  });

  document.getElementById('bt-install-dismiss')?.addEventListener('click', () => {
    store(INSTALL_KEY, '1');
    show('bt-install', false);
  });

  installGo?.addEventListener('click', async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    promptEvent = null;
    if (choice.outcome === 'accepted') store(INSTALL_KEY, '1');
    show('bt-install', false);
  });

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    promptEvent = event as InstallPrompt;
    if (noticeDone) offerInstall();
  });

  window.addEventListener('appinstalled', () => {
    store(INSTALL_KEY, '1');
    show('bt-install', false);
  });

  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  let reloading = false;
  let allowReload = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!allowReload || reloading) return;
    reloading = true;
    location.reload();
  });

  void navigator.serviceWorker.register('/sw.js').then((registration) => {
    const wake = (worker: ServiceWorker | null) => {
      if (!worker) return;
      if (!navigator.serviceWorker.controller) {
        worker.postMessage('skip-waiting');
        return;
      }
      show('bt-update', true);
    };
    if (registration.waiting) wake(registration.waiting);
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed') wake(registration.waiting);
      });
    });
    document.getElementById('bt-update-go')?.addEventListener('click', () => {
      allowReload = true;
      registration.waiting?.postMessage('skip-waiting');
    });
  }).catch(() => undefined);
}
