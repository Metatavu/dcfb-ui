(() => {
  "use strict";

  /**
   * Class that handles autocomplete fields
   */
  class Autocomplete {

    /**
     * Constructor
     * 
     * @param {jQuery} input original input
     * @param {Object} options options 
     */
    constructor(input, options) {
      this.input = input;
      this.options = options;
      this.input.attr('type', 'hidden');

      const required = !!this.input.attr("required");
      
      this.input.removeAttr("required");

      this.altInput = $('<input>')
        .attr({ "type": "text", "class": this.input.attr("class") })
        .insertBefore(this.input)
        .autocomplete({
          minLength: this.options.minLength || 2,
          source: this.onInputSource.bind(this),
          select: this.onInputSelect.bind(this),
          open: this.onInputOpen.bind(this)
        });

      if (required) {
        this.altInput.attr("required", "required");
      }
    }

    /**
     * Event handler for reading values from input source
     * 
     * @param {Object} request request object
     * @param {Function} response response callback
     */
    onInputSource(request, response) {
      this.options.source(request.term)
        .then((values) => {
          response(values);
        });
    }

    /**
     * Event handler for input select
     * 
     * @param {Object} event event object
     * @param {Object} ui ui object
     */
    onInputSelect(event, ui) {
      event.preventDefault();
      this.input.val(ui.item.value);
      this.altInput.val(ui.item.label);
    }

    /**
     * Event handler for input open
     * 
     * @param {Object} event event object
     * @param {Object} ui ui object
     */
    onInputOpen(event, ui) {
      const input = $(event.target);
      const inputWidth = input.width();
      $(".ui-autocomplete").width(inputWidth);
    }

  }

  window.Autocomplete = Autocomplete;

})();