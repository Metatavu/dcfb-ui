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
  const StripeRoutes = require(`${__dirname}/stripe-routes`);
  const TransactionLogRoutes = require(`${__dirname}/transactionlog-routes`);
  
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
    constructor (app, keycloak, transactionLogger) {
      new IndexRoutes(app, keycloak);
      new ImageRoutes(app, keycloak);
      new SearchRoutes(app, keycloak);
      new ItemRoutes(app, keycloak, transactionLogger);
      new LocationRoutes(app, keycloak);
      new CategoryRoutes(app, keycloak);
      new MigrateRoutes(app, keycloak);
      new StripeRoutes(app, keycloak, transactionLogger);
      new TransactionLogRoutes(app, keycloak, transactionLogger);
    }
  }

  module.exports = Routes;

})();
