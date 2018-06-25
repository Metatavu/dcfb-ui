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

  /**
   * Posts a JSON request into URL
   * 
   * @param {String} url url
   * @param {Object} data data
   * @returns {Promise} promise for JSON 
   */
  window.postJSON = (url, data) => {
    return new Promise((resolve, reject) => {
      $.ajax(url, {
        data: JSON.stringify(data),
        contentType: "application/json",
        type: "POST",
        success: (data) => {
          resolve(data);
        },
        error: (jqxhr, textStatus, error) => {
          const message = jqxhr.responseJSON && jqxhr.responseJSON.message ? jqxhr.responseJSON.message : null; 
          reject(message || error || textStatus || "Error");
        }
      });
    });
  }

})();