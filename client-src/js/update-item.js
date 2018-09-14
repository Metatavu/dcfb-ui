/*global ImageUpload, Autocomplete */
(() => {
  "use strict";

  /**
   * Class for add item form
   */
  class UpdateItemForm {

    /**
     * Constructor. 
     */
    constructor() {
      flatpickr("#inputExpire", {
        dateFormat: "Z",
        altInput: true, 
        altFormat: "d.m.Y"
      });

      this.locationAutocompleteInitialized = false;
      $("#inputLocation").focus(this.onLocationfocus.bind(this));

      this.categoryAutocomplete = new Autocomplete($("#inputCategory"), {
        minLength: 1,
        source: this.searchCategories.bind(this) 
      });

      const initialCategory = JSON.parse($("#inputCategory").attr("data-initial-value"));
      this.categoryAutocomplete.setValue(getLocalized(initialCategory.title, "SINGLE"), initialCategory.id);

      new ImageUpload({
        maxFileSize: parseInt($("#images").attr("data-max-file-size")), 
        progressBar: ".upload-progress .progress-bar",
        fileInput: "#images",
        filesContainer: ".upload-files",
        addFileButton: ".upload-add-file-button",
        hiddenInput: "[name='images']"
      });

      $(document).on("click", ".remove-existing-img", this.onRemoveExistingImage.bind(this));
      $("form").submit(this.onFormSubmit.bind(this));
    }

    onLocationfocus() {
      if (!this.locationAutocompleteInitialized) {
        this.locationAutocompleteInitialized = true;
        this.locationAutocomplete = new google.maps.places.Autocomplete((document.getElementById("inputLocation")),{
          types: ["geocode"]
        });
      }
    }

    onRemoveExistingImage(e) {
      $(e.target).closest("li").remove();
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

    getPreservedImages() {
      const result = [];
      $(".item-previous-image-container").each((index, element) => {
        result.push(JSON.parse($(element).attr("data-image")));
      });
      return result;
    }

    parseLocationValue() {
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

      return {
        name: locationName,
        addressComponents: addressComponents,
        coordinates: {
          lat: latitude,
          lng: longitude
        }
      };
    }

    async onFormSubmit(event) {
      event.preventDefault();
      const form = $(event.target);
      


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

      if (this.locationAutocompleteInitialized) {
        data.location = this.parseLocationValue();
        if (!data.location) {
          return;
        }
      }

      data.preservedImages = this.getPreservedImages();

      try {
        const itemId = $("#itemIdInput").val();
        const response = await putJSON("/update/item", itemId, data);
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
    new UpdateItemForm();
  });

})();