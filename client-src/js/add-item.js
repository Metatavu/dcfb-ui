/*global ImageUpload, Autocomplete */
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

      this.locationAutocomplete = new google.maps.places.Autocomplete((document.getElementById("inputLocation")),{
        types: ["geocode"]
      });

      new Autocomplete($("#inputCategory"), {
        minLength: 1,
        source: this.searchCategories.bind(this) 
      });

      new ImageUpload({
        maxFileSize: parseInt($("#images").attr("data-max-file-size")), 
        progressBar: ".upload-progress .progress-bar",
        fileInput: "#images",
        filesContainer: ".upload-files",
        addFileButton: ".upload-add-file-button",
        hiddenInput: "[name='images']"
      });

      $("form").submit(this.onFormSubmit.bind(this));
      $("input[name='type-of-business']").change(this.onTypeOfBusinessChange.bind(this));
    }

    onTypeOfBusinessChange () {
      if ($("#sellingInput").is(":checked")) {
        $(".terms-of-delivery-container").show();
        $(".delivery-time-container").show();
        $(".delivery-price-container").show();
        $(".delivery-methods-container").show();
        $(".purchase-method-container").show();
        $("#inputPricePerUnit").attr("required", "required");
      } else if ($("#byingInput").is(":checked")) {
        $(".terms-of-delivery-container").hide();
        $(".delivery-time-container").hide();
        $(".delivery-price-container").hide();
        $(".delivery-methods-container").hide();
        $(".purchase-method-container").hide();
        $("#inputPricePerUnit").removeAttr("required", "required");

        $(".terms-of-delivery-container input").val("");
        $(".delivery-time-container input").val("");
        $(".delivery-price-container input").val("");
        $(".delivery-methods-container input").val("");
        $(".purchase-method-container input").val("");
      }
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
      
      const place = this.locationAutocomplete.getPlace();
      if (!place) {
        return;
      }
      
      const locationName = place.formatted_address;
      const addressComponents = place.address_components;
      const latitude = place.geometry.location.lat();
      const longitude = place.geometry.location.lng();

      if (!locationName) {
        return;
      }

      form.find(".btn").attr("disabled", "disabled");
      const data = form.serializeArray().reduce((map, item) => {
        const name = item.name;
        const value = item.value;

        if (name === "purchase-method") {
          map[name] = map[name] || [];
          map[name].push(value);
        } else {
          map[name] = value;
        }

        return map;
      }, {});

      data.location = {
        name: locationName,
        addressComponents: addressComponents,
        coordinates: {
          lat: latitude,
          lng: longitude
        }
      };

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
    $(window).keydown(function(event){
      if(event.keyCode == 13) {
        event.preventDefault();
        return false;
      }
    });
  });

})();