/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";
  
  const IndexRoutes = require(`${__dirname}/index-routes`);
  const ImageRoutes = require(`${__dirname}/image-routes`);
  const SearchRoutes = require(`${__dirname}/search-routes`);
  const ItemRoutes = require(`${__dirname}/item-routes`);
  const LocationRoutes = require(`${__dirname}/location-routes`);
  const CategoryRoutes = require(`${__dirname}/category-routes`);
  const MigrateRoutes = require(`${__dirname}/migrate-routes`);
  
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
      new ImageRoutes(app, keycloak);
      new SearchRoutes(app, keycloak);
      new ItemRoutes(app, keycloak);
      new LocationRoutes(app, keycloak);
      new CategoryRoutes(app, keycloak);
      new MigrateRoutes(app, keycloak);
    }
  }

  module.exports = Routes;

})();
