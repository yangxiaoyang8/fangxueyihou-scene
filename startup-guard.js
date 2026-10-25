(() => {
  const loading = document.querySelector('#loading');
  if (!loading) return;

  let reported = false;
  const showStartupProblem = () => {
    if (reported || !loading.isConnected) return;
    reported = true;
    loading.classList.add('load-failed');
    const spinner = loading.querySelector('.loader');
    if (spinner) spinner.hidden = true;
    const message = loading.querySelector('span');
    if (message) message.textContent = '街区没有成功启动';

    const details = document.createElement('small');
    details.textContent = '可能是当前浏览器内核或网络限制了 3D 资源。请复制链接到 Safari / Chrome 打开，或检查网络后重试。';
    loading.append(details);

    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = '重新加载';
    retry.addEventListener('click', () => location.reload());
    loading.append(retry);
  };

  window.addEventListener('error', event => {
    const target = event.target;
    const scriptError = target === window || (target && target.tagName === 'SCRIPT') || typeof event.message === 'string';
    if (scriptError) showStartupProblem();
  }, true);
  window.addEventListener('unhandledrejection', showStartupProblem);
  window.setTimeout(showStartupProblem, 20000);
})();
