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
  };

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
          reject(message || error || textStatus || "Error");
        }
      });
    });
  };

  /**
   * Puts a JSON request into URL
   * 
   * @param {String} url url
   * @param {String} id id
   * @param {Object} data data
   * @returns {Promise} promise for JSON 
   */
  window.putJSON = (url, id, data) => {
    return new Promise((resolve, reject) => {
      $.ajax(`${url}/${id}`, {
        data: JSON.stringify(data),
        contentType: "application/json",
        type: "PUT",
        success: (data) => {
          resolve(data);
        },
        error: (jqxhr, textStatus, error) => {
          const message = jqxhr.responseJSON && jqxhr.responseJSON.message ? jqxhr.responseJSON.message : null; 
          reject(message || error || textStatus || "Error");
        }
      });
    });
  };

  /**
   * Sends delete request a JSON request into URL
   * 
   * @param {String} url url
   * @param {Object} id id
   * @returns {Promise} promise for JSON 
   */
  window.deleteJSON = (url, id) => {
    return new Promise((resolve, reject) => {
      $.ajax(`${url}/${id}`, {
        contentType: "application/json",
        type: "DELETE",
        success: (data) => {
          resolve(data);
        },
        error: (jqxhr, textStatus, error) => {
          const message = jqxhr.responseJSON && jqxhr.responseJSON.message ? jqxhr.responseJSON.message : null; 
          reject(message || error || textStatus || "Error");
        }
      });
    });
  };
})();