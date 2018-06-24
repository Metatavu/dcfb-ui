/*jshint esversion: 6 */
/* global __dirname, __filename */

(() => {
  "use strict";
  
  const Promise = require("bluebird");
  const log4js = require("log4js");
  const logger = log4js.getLogger(`${__dirname}/${__filename}`);
  const anonymousAuth = require(`${__dirname}/../anonymous-auth`);

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
     * Returns category data for rendering main views
     * 
     * @param {CategoriesApi} categoriesApi 
     * @return {Promise} promise for category datas
     */
    async getCategoryDatas(categoriesApi) {
      const allCategories = await categoriesApi.listCategories();

      const indexCategories = [];
      const footerMainCategories = [];
      const footerSideCategories = [];
      const childCategories = {};
      const categoryMap = {};

      allCategories.forEach((category) => {
        categoryMap[category.id] = category;

        if (!category.parentId) {
          const metas = category.meta||[];
          const indexCategory = metas.filter((meta) => { return meta.key === "ui-index-page" && meta.value === "true" }).length > 0;
          const sideCategory = metas.filter((meta) => { return meta.key === "ui-footer-side" && meta.value === "true" }).length > 0;

          if (indexCategory) {
            indexCategories.push(category);
          } 
          
          if (sideCategory) {
            footerSideCategories.push(category); 
          } else {
            footerMainCategories.push(category);
          }
        } else {
          childCategories[category.parentId] = childCategories[category.parentId] || [];
          childCategories[category.parentId].push(category);
        }
      });

      return {
        indexCategories: indexCategories,
        allCategories: allCategories,
        footerMainCategories: footerMainCategories,
        footerSideCategories: footerSideCategories,
        childCategories: childCategories,
        categoryMap: categoryMap
      };
    }

    /**
     * Gets bare access token from request
     * 
     * @param {object} req express request
     * @returns access token
     */
    getToken(req) {
      const accessToken = this.getAccessToken(req);
      return accessToken ? accessToken.token : anonymousAuth.getAccessToken();
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

