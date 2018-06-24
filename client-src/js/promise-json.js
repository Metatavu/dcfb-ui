(() => {
  "use strict";

  /**
   * Returns a JSON from URL
   * 
   * @param {String} url url
   * @returns {Promise} promise for JSON 
   */
  window.getJSON = (url) => {
    return new Promise((resolve, reject) => {
      $.getJSON(url, (data) => {
        resolve(data);
      })
      .fail((jqxhr, textStatus, error) => {
        reject(error || textStatus || "Error");
      })
    });
  }

})();