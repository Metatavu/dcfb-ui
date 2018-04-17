(() => {
  "use strict";
  
  $(document).ready(() => {
    const iso = new Isotope( ".search-results-container", {
      itemSelector: ".sale-poster",
      layoutMode: "fitRows",
      fitRows: {
        gutter: 10
      }
    });
  });
  
})();