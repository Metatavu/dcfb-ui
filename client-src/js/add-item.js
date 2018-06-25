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

      $("form").submit(this.onFormSubmit.bind(this));
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

    async onFormSubmit(event) {
      event.preventDefault();
      const form = $(event.target);
      
      form.find(".btn").attr("disabled", "disabled");
      const data = form.serializeArray().reduce((map, item) => {
        map[item.name] = item.value;
        return map;
      }, {});


      try {
        const response = await postJSON("/add/item", data);
        const location = response.location;
        const message = response.message;

        new Noty({
          timeout: 5000,
          text: message,
          type: "success",
          callbacks: {
            onClose: () => {
              window.location.href = location;
            }
          }
        }).show();
      } catch (e) {
        form.find(".btn").removeAttr("disabled");

        new Noty({
          timeout: 5000,
          text: e || "Failed to send the form",
          type: "error"
        }).show();
      }
    }
  }
  
  $(document).ready(() => {
    new AddItemForm();
  });

})();