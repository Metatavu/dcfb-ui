/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const AbstractRoutes = require(`${__dirname}/abstract-routes`);
  const ApiClient = require(`${__dirname}/../api-client`);

  /**
   * Item routes
   */
  class ItemRoutes extends AbstractRoutes {
    
    /**
     * Constructor for item routes class
     * 
     * @param {Object} app Express app
     * @param {Object} keycloak keycloak
     */
    constructor (app, keycloak) {
      super(app, keycloak);
      
      app.get("/ajax/searchItems", [ ], this.catchAsync(this.searchItemsGet.bind(this)));
      app.get("/item/:id", [ ], this.catchAsync(this.itemGet.bind(this)));
      app.get("/add/item", [ ], this.catchAsync(this.addItemGet.bind(this)));
    }

    /**
     * Handles search items ajax request 
     * 
     * @param {http.ClientRequest} req client request object
     * @param {http.ServerResponse} res server response object
     **/
    async searchItemsGet(req, res) {
      const firstResult = req.query.firstResult|| 0;
      const maxResults = req.query.maxResults|| 12;

      const apiClient = new ApiClient(await this.getToken(req));
      const itemsApi = apiClient.getItemsApi();
      const items = await itemsApi.listItems({
        firstResult: firstResult,
        maxResults: maxResults
      });

      res.send(items);
    }
    
    /**
     * Handles / get request
     * 
     * @param {http.ClientRequest} req client request object
     * @param {http.ServerResponse} res server response object
     **/
    async itemGet(req, res) {
      const itemId = req.params.id;

      const apiClient = new ApiClient(await this.getToken(req));
      const categoriesApi = apiClient.getCategoriesApi();
      const itemsApi = apiClient.getItemsApi();
      const locationsApi = apiClient.getLocationsApi();
      const item = await itemsApi.findItem(itemId);
      const location = await locationsApi.findLocation(item.locationId);

      if (!item) {
        res.status(404).send("Item not found");
        return;
      }
      
      res.render("pages/item", Object.assign({ 
        item: item, 
        location: location 
      }, await this.getCategoryDatas(categoriesApi)));
    }
    
    /**
     * Handles / get request
     * 
     * @param {http.ClientRequest} req client request object
     * @param {http.ServerResponse} res server response object
     **/
    async addItemGet(req, res) {
      res.render("pages/add-item");
    }
    
  }

  module.exports = ItemRoutes;

})();

