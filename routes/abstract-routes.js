/*jshint esversion: 6 */
/* global __dirname, __filename */

(() => {
  "use strict";
  
  const Promise = require("bluebird");
  const log4js = require("log4js");
  const logger = log4js.getLogger(`${__dirname}/${__filename}`);

  /**
   * Abstract base class for all route classes
   */
  class AbstractRoutes {
    
    /**
     * Constructor for abstract routes class
     * 
     * @param {Object} app Express app
     * @param {Object} keycloak keycloak
     */
    constructor (app, keycloak) {
      this.app = app;
      this.keycloak = keycloak;
    }

    /**
     * Gets accesstoken from request
     * 
     * @param {object} req express request
     * @returns access token
     */
    getAccessToken(req) {
      const kauth = req.kauth;
      if (kauth && kauth.grant && kauth.grant.access_token) {
        return kauth.grant.access_token;
      }
      
      return null;   
    }

    /**
     * Gets user id from request
     * 
     * @param {object} req express request
     * @returns user id
     */
    getLoggedUserId(req) {
      const accessToken = this.getAccessToken(req);
      return accessToken && accessToken.content ? accessToken.content.sub : null;
    }

    /**
     * Returns whether user has specified realm role or not 
     * 
     * @param {object} req express request
     * @param {String} role realm role 
     */
    hasRealmRole(req, role) {
      const accessToken = this.getAccessToken(req);
      return accessToken.hasRealmRole(role);
    }
    
    /**
     * Catch unhandled promise errors
     * 
     * @param {function} handler handler function
     * @return {Function} decorated handler function
     */
    catchAsync(handler) {
      return (req, res) => {
        return Promise.resolve(handler(req, res)).catch((err) => {
          logger.error(err);
          res.status(500).send(err);
        });
      };
    }
    
  }

  module.exports = AbstractRoutes;

})();

