(() => {
  "use strict";

  /**
   * Class for add item form
   */
  class AddItemForm {

    /**
     * Constructor. 
     */
    constructor() {
      flatpickr("#inputExpire", {
        dateFormat: "Z",
        altInput: true, 
        altFormat: "d.m.Y"
      });

      new Autocomplete($("#inputLocation"), {
        minLength: 1,
        source: this.searchLocations.bind(this) 
      });

      new Autocomplete($("#inputCategory"), {
        minLength: 1,
        source: this.searchCategories.bind(this) 
      });
    }

    async searchLocations(term) {
      const locations = await getJSON(`/ajax/searchLocations?search=${term}*`);
      return locations.map((location) => {
        return {
          label: getLocalized(location.name, "SINGLE"),
          value: location.id
        };
      });
    }

    async searchCategories(term) {
      const categories = await getJSON(`/ajax/searchCategories?search=${term}*`);
      return categories.map((category) => {
        return {
          label: getLocalized(category.title, "SINGLE"),
          value: category.id
        };
      });
    }
  }
  
  $(document).ready(() => {
    new AddItemForm();
  });

})();