(() => {
  "use strict";

  class Common {

    constructor() {
      $(document).on('click', '#search-execute-btn', this.onSearchBtnClick.bind(this));
      this.locationAutocomplete = new google.maps.places.Autocomplete((document.getElementById('search-location-input')),{
        types: ['geocode']
      });
    }

    onSearchBtnClick() {
      const params = {};
      const place = this.locationAutocomplete.getPlace();
      if (place && place.geometry && place.geometry.location) {
        params.nearLat =  place.geometry.location.lat();
        params.nearLon = place.geometry.location.lng();
      }

      if ($("#search-category-input").val()) {
        params.category = $("#search-category-input").val();
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