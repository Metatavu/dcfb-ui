/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const AbstractRoutes = require(`${__dirname}/abstract-routes`);
  const config = require("nconf");
  const mockupData = require(`${__dirname}/mockup-data`);

  /**
   * Index routes
   */
  class IndexRoutes extends AbstractRoutes {
    
    /**
     * Constructor for abstract routes class
     * 
     * @param {Object} app Express app
     * @param {Object} keycloak keycloak
     */
    constructor (app, keycloak) {
      super(app, keycloak);
      
      app.get("/", [ ], this.catchAsync(this.indexGet.bind(this)));
      app.get("/login", keycloak.protect(), this.catchAsync(this.loginGet.bind(this)));
    }
    
    /**
     * Handles / get request
     * 
     * @param {http.ClientRequest} req client request object
     * @param {http.ServerResponse} res server response object
     **/
    async indexGet(req, res) {
      res.render("pages/index", mockupData);
    }
    
    /**
     * Handles / get request
     * 
     * @param {http.ClientRequest} req client request object
     * @param {http.ServerResponse} res server response object
     **/
    async loginGet(req, res) {
      res.redirect("/");
    }
    
  }

  module.exports = IndexRoutes;

})();

