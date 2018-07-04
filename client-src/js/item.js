/* global window,$ */

(() => {
  "use strict";

  /**
   * Class for item page
   */
  class Item {

    /**
     * Constructor. 
     */
    constructor() {
      $(document).on("click", ".item-info .result-sm-img", this.onItemInfoSmallImageClick.bind(this));
    }

    onItemInfoSmallImageClick(event) {
      const smallImage = $(event.target);
      const image = $(smallImage).closest(".result-img");
      image.css("background-image", smallImage.css("background-image"));
    }
  }
  
  $(document).ready(() => {
    new Item();
  });

})();