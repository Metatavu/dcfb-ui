/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const AbstractRoutes = require(`${__dirname}/abstract-routes`);
  const config = require("nconf");
  const mockupData = require(`${__dirname}/mockup-data`);

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
      
      app.get("/item/:id", [ ], this.catchAsync(this.itemGet.bind(this)));
      app.get("/add/item", [ ], this.catchAsync(this.addItemGet.bind(this)));
    }
    
    /**
     * Handles / get request
     * 
     * @param {http.ClientRequest} req client request object
     * @param {http.ServerResponse} res server response object
     **/
    async itemGet(req, res) {
      const itemId = req.params.id;
      
      const categories = mockupData.categories;
      const sidecategories = mockupData.sidecategories;
      const item = mockupData.items.find(item => item.id == itemId);
      
      if (!item) {
        res.status(404).send('Item not found');
        return;
      }
      
      res.render('pages/item', {
        categories: categories,
        sidecategories: sidecategories,
        item: item
      });
    }
    
    /**
     * Handles / get request
     * 
     * @param {http.ClientRequest} req client request object
     * @param {http.ServerResponse} res server response object
     **/
    async addItemGet(req, res) {
      res.render('pages/add-item');
    }
    
  }

  module.exports = ItemRoutes;

})();

