(() => {
  "use strict";

  class Common {

    constructor() {
      $(document).on("click", "#search-execute-btn", this.onSearchBtnClick.bind(this));
      this.locationAutocomplete = new google.maps.places.Autocomplete((document.getElementById("search-location-input")),{
        types: ["geocode"]
      });

      this.categorySelect = $("#search-category-input").comboTree({
        source : JSON.parse($("#search-category-input").attr("data-source")),
        isMultiple: false
      });
    }

    onSearchBtnClick() {
      const params = {};
      const place = this.locationAutocomplete.getPlace();
      if (place && place.geometry && place.geometry.location) {
        params.nearLat =  place.geometry.location.lat();
        params.nearLon = place.geometry.location.lng();
      }

      if (this.categorySelect.getSelectedItemsId()) {
        const categoryFilter = this.categorySelect.getSelectedItemsId();
        
        params.category = Array.isArray(categoryFilter) ? categoryFilter.join(",") : categoryFilter;
      }

      if ($("#search-freetext-input").val()) {
        params.search = $("#search-freetext-input").val();
      }

      window.location.href = `/search?${$.param(params)}`;
    }
  }

  $(document).ready(() => {
    new Common();
  });

})();