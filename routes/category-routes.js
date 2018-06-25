/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const AbstractRoutes = require(`${__dirname}/abstract-routes`);
  const ApiClient = require(`${__dirname}/../api-client`);

  /**
   * Category routes
   */
  class CategoryRoutes extends AbstractRoutes {
    
    /**
     * Constructor for category routes class
     * 
     * @param {Object} app Express app
     * @param {Object} keycloak keycloak
     */
    constructor (app, keycloak) {
      super(app, keycloak);
      
      app.get("/ajax/searchCategories", [ ], this.catchAsync(this.ajaxSearchCategoriesGet.bind(this)));
    }

    /**
     * Handles search categories ajax request 
     * 
     * @param {http.ClientRequest} req client request object
     * @param {http.ServerResponse} res server response object
     **/
    async ajaxSearchCategoriesGet(req, res) {
      const search = req.query.search;
      const apiClient = new ApiClient(await this.getToken(req));
      const categoriesApi = apiClient.getCategoriesApi();
      const categories = await categoriesApi.listCategories({
        search: search
      });

      res.send(categories);
    }
    
  }

  module.exports = CategoryRoutes;

})();

