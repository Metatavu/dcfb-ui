/*jshint esversion: 6 */
/* global __dirname, __filename */

(() => {
  "use strict";
  
  const Promise = require("bluebird");
  const log4js = require("log4js");
  const logger = log4js.getLogger(`${__dirname}/${__filename}`);
  const anonymousAuth = require(`${__dirname}/../anonymous-auth`);
  const localeHelpers = require(`${__dirname}/../util/locale-helpers`);

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
     * @param {Object} http request
     * @return {Promise} promise for category datas
     */
    async getCategoryDatas(categoriesApi, req) {
      const allCategories = await categoriesApi.listCategories({
        maxResults: 1000
      });

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
        categoryMap: categoryMap,
        categoryTree: await this.getCategoryTree(null, allCategories, "title", "subs", req)
      };
    }

    /**
     * Created tree presentation from categories, either categoriesApi or List of categories must be provided
     * If both are provided, categoryList will be ignored and new list fetched from api
     *  
     * @param {DcfbApiClient.CategoriesApi} categoriesApi initialized categories api, if specified categories will be listed from api and category list parameter is ignored
     * @param {[DcfbApiClient.Category]} categoryList if categoriesApi parameter is not displayed category list parameter is expected to be ready list of categories.
     * @param {string} nameProperty property that name should be displayed
     * @param {string} childrenProperty property that category children should be displayed
     * @param {object} req http request
     */
    async getCategoryTree(categoriesApi, categoryList, nameProperty, childrenProperty, req) {
      let allCategories = null;
      if (categoriesApi) {
        allCategories = await categoriesApi.listCategories({
          maxResults: 1000
        });
      } else {
        allCategories = categoryList;
      }

      const rootCategories = [];
      const childCategories = {};
      allCategories.forEach((category) => {
        if (!category.parentId) {
          rootCategories.push(category);
        } else {
          childCategories[category.parentId] = childCategories[category.parentId] || [];
          childCategories[category.parentId].push(category);
        }
      });

      return rootCategories.map(rootCategory => this.processCategoryData(rootCategory, childCategories, nameProperty, childrenProperty, req));
    }

    /**
     * Helper function for get category tree
     * 
     * @param {DcfbApiClient.Category} category category object
     * @param {object} childCategories child category map
     * @param {string} nameProperty property that category name should be displayed
     * @param {string} childrenProperty property that category children should be displayed
     * @param {object} req http request
     */
    processCategoryData(category, childCategories, nameProperty, childrenProperty, req) {
      return {
        id: category.id,
        [nameProperty]: localeHelpers._LP(category.title, req),
        category: category,
        [childrenProperty]: childCategories[category.id] ? childCategories[category.id].map(childCategory => this.processCategoryData(childCategory, childCategories, nameProperty, childrenProperty, req)) : []
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

