(() => {
  "use strict";
  
  $(document).ready(() => {
    const iso = $( ".index-search-preview-container").isotope({
      itemSelector: ".sale-poster",
      layoutMode: "fitRows",
      fitRows: {
        gutter: 10
      }
    });

    iso.on('layoutComplete', ( event, laidOutItems ) => {
      iso.css('min-height', 'auto');
    });

    iso.imagesLoaded().progress(() => {
      iso.isotope('layout');
    });

    $(".load-more-btn").click(() => {
      $.getJSON("/search/ajax", (results) => {
        const items = [];
        results.forEach((result) => {
          items.push($(pugSalePoster({item: result}))[0]);
        });

        iso
          .append(items)
          .isotope('appended', items);
      });
    });
  });

})();