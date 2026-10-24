const mobilePanel = document.querySelector('.panel');
document.querySelectorAll('.mobile-quicknav button').forEach(button => {
  button.addEventListener('click', () => {
    const target = document.getElementById(button.dataset.scrollTo);
    if (!target) return;
    const panelTop = mobilePanel.getBoundingClientRect().top;
    const targetTop = target.getBoundingClientRect().top;
    mobilePanel.scrollTo({top: mobilePanel.scrollTop + targetTop - panelTop - 58});
  });
});
