/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const AbstractRoutes = require(`${__dirname}/abstract-routes`);
  const ApiClient = require(`${__dirname}/../api-client`);

  /**
   * Search routes
   */
  class SearchRoutes extends AbstractRoutes {
    
    /**
     * Constructor for abstract routes class
     * 
     * @param {Object} app Express app
     * @param {Object} keycloak keycloak
     */
    constructor (app, keycloak) {
      super(app, keycloak);
      
      app.get("/search", [ ], this.catchAsync(this.searchGet.bind(this)));
    }
    
    /**
     * Handles / get request
     * 
     * @param {http.ClientRequest} req client request object
     * @param {http.ServerResponse} res server response object
     **/
    async searchGet(req, res) {
      const categoryIds = req.query.category ? [ req.query.category ] : null;
      const search = req.query.search || null;
      const nearLat = req.query.nearLat || null;
      const nearLon = req.query.nearLon || null;

      const apiClient = new ApiClient(await this.getToken(req));
      const categoriesApi = apiClient.getCategoriesApi();
      const itemsApi = apiClient.getItemsApi();
      const locationsApi = apiClient.getLocationsApi();
      const items = await itemsApi.listItems({
        search: search,
        nearLat: nearLat,
        nearLon: nearLon,
        categoryIds: categoryIds
      });

      const locations = await Promise.all(items
        .map((item) => item.locationId)
        .filter((itemId, index, array) => index === array.indexOf(itemId))
        .map((locationId) => {
          return locationsApi.findLocation(locationId);
        }));

      const locationMap = locations.reduce((map, location) => {
        map[location.id] = location;
        return map;
      }, {});

      res.render("pages/results", Object.assign({ 
        items: items,
        locationMap: locationMap
      }, await this.getCategoryDatas(categoriesApi)));
    }
    
  }

  module.exports = SearchRoutes;

})();

