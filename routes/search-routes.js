/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const AbstractRoutes = require(`${__dirname}/abstract-routes`);
  const mockupData = require(`${__dirname}/mockup-data`);

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
      const selectedCategory = req.query.category || null;
      
      const categories = mockupData.categories;
      const sidecategories = mockupData.sidecategories;
      const items = selectedCategory ? mockupData.items.filter(item => item.category === selectedCategory) : mockupData.items;
      
      res.render('pages/results', {
        categories: categories,
        sidecategories: sidecategories,
        items: items
      });
    }
    
  }

  module.exports = SearchRoutes;

})();

