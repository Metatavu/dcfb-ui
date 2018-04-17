/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";
  
  const IndexRoutes = require(`${__dirname}/index-routes`);
  
  /**
   * Routes
   */
  class Routes {
    
    /**
     * Constructor for routes
     * 
     * @param {Object} app Express app
     * @param {Object} keycloak keycloak
     */
    constructor (app, keycloak) {
      new IndexRoutes(app, keycloak);
    }
    
  }


  module.exports = Routes;

})();
