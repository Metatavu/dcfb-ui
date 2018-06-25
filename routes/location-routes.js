/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const AbstractRoutes = require(`${__dirname}/abstract-routes`);
  const ApiClient = require(`${__dirname}/../api-client`);

  /**
   * Location routes
   */
  class LocationRoutes extends AbstractRoutes {
    
    /**
     * Constructor for location routes class
     * 
     * @param {Object} app Express app
     * @param {Object} keycloak keycloak
     */
    constructor (app, keycloak) {
      super(app, keycloak);
      
      app.get("/ajax/searchLocations", [ ], this.catchAsync(this.ajaxSearchLocationsGet.bind(this)));
    }

    /**
     * Handles search locations ajax request 
     * 
     * @param {http.ClientRequest} req client request object
     * @param {http.ServerResponse} res server response object
     **/
    async ajaxSearchLocationsGet(req, res) {
      const search = req.query.search;
      const apiClient = new ApiClient(await this.getToken(req));
      const locationsApi = apiClient.getLocationsApi();
      const locations = await locationsApi.listLocations({
        search: search
      });

      res.send(locations);
    }
    
  }

  module.exports = LocationRoutes;

})();

