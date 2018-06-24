/* global DCFB_CURRENT_LOCALE */

(() => {
  "use strict";
  
  /**
   * Class for handling search functions
   */
  class Search {

    /**
     * Constructor. 
     */
    constructor() {
      this.searchOffset = 0;
      this.maxResults = 4 * 3;

      this.previewContainer = $(".index-search-preview-container");
      this.previewContainer.isotope({
        itemSelector: ".sale-poster",
        layoutMode: "fitRows",
        fitRows: {
          gutter: 10
        }
      });

      this.previewContainer.on('layoutComplete', this.onLayoutComplete.bind(this));
      this.previewContainer.imagesLoaded().progress(this.onImagesLoadedProgress.bind(this));
      $(".load-more-btn").click(this.onLoadMoreButtonClick.bind(this));

      setTimeout(this.isotopeFailsafeTimeout.bind(this), 5000);

      this.resetSearchPreview();
    }

    /**
     * Executes search 
     * 
     * @return {Promise} Promise for response JSON
     */
    executeSearch() {
      return getJSON(`/ajax/searchItems?maxResults=${this.maxResults}&firstResult=${this.searchOffset}`);
    }

    /**
     * Performs search
     * 
     * @return {Promise} Promise without contents 
     */
    async search() {
      const result = await this.executeSearch();
      const items = this.renderSearchResult(result);
      this.searchOffset += items.length;
      this.previewContainer.append(items).isotope("appended", items);
      this.previewContainer.isotope('layout');
    }

    /**
     * Renders search results as HTML entities
     * 
     * @param {Array} items items as JSON objects
     * @return {Array} array of HTML elements 
     */
    renderSearchResult(items) {
      return items.map((item) => {
        return $(pugSalePoster(Object.assign(pugLocaleSupport(), {
          item: item
        })))[0];
      });
    }

    /**
     * Resets search preview
     */
    resetSearchPreview() {
      this.searchOffset = 0;
      this.previewContainer.empty();
      this.search();
    }

    /**
     * Event handler for load more button click
     */
    onLoadMoreButtonClick() {
      this.search();
    }

    /**
     * Failsafe layout for cases when isotope layout randomly fails
     */
    isotopeFailsafeTimeout() {
      this.previewContainer.isotope('layout');
    }

    /**
     * Event fired when isotope layout is complete
     * 
     * @param {Object} event 
     * @param {Array} laidOutItems 
     */
    onLayoutComplete(event, laidOutItems) {
      this.previewContainer.css('min-height', 'auto');
    }

    /**
     * Event fired when all container images have been loaded
     */
    onImagesLoadedProgress() {
      this.previewContainer.isotope('layout');
    }

  }
  
  $(document).ready(() => {
    new Search();
  });

})();