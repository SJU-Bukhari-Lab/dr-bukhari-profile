(() => {
  const closeResearchDetails = () => {
    document
      .querySelectorAll('.research-page details')
      .forEach((details) => {
        details.open = false;
      });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', closeResearchDetails, { once: true });
  } else {
    closeResearchDetails();
  }

  window.addEventListener('pageshow', closeResearchDetails);
})();
