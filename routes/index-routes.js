/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const AbstractRoutes = require(`${__dirname}/abstract-routes`);
  const config = require("nconf");

  const mockupData = {
    categories: [
      {
        name: "metal",
        subcategories: [
          "pipes",
          "steel",
          "iron"
        ]
      },
      {
        name: "timber",
        subcategories: [
          "pipes",
          "steel",
          "iron"
        ]
      },
      {
        name: "composite",
        subcategories: [
          "pipes",
          "steel",
          "iron"
        ]
      },
      {
        name: "plastic",
        subcategories: [
          "pipes",
          "steel",
          "iron"
        ]
      }
    ],
    sidecategories: [
      "logistics",
      "service",
      "workforce"
    ],
    items: [
      {
        image: "/gfx/mock/iron.jpg",
        title: "Amazing iron",
        seller: "Iron company Co",
        location: "Mikkeli"
      }, {
        image: "/gfx/mock/steel-img.jpg",
        title: "Amazing steel",
        seller: "Steel company Co",
        location: "Helsinki"
      }, {
        image: "/gfx/mock/iron.jpg",
        title: "Amazing iron",
        seller: "Iron company Co",
        location: "Oulu"
      }, {
        image: "/gfx/mock/timber-img.jpg",
        title: "Amazing timber",
        seller: "Timber company Co",
        location: "Espoo"
      }, {
        image: "/gfx/mock/timber-img2.jpg",
        title: "Amazing timber",
        seller: "Timber company Co",
        location: "Tampere"
      }, {
        image: "/gfx/mock/steel-img.jpg",
        title: "Amazing steel",
        seller: "Steel company Co",
        location: "Kouvola"
      }, {
        image: "/gfx/mock/iron.jpg",
        title: "Amazing iron",
        seller: "Iron company Co",
        location: "Turku"
      }, {
        image: "/gfx/mock/timber-img.jpg",
        title: "Amazing timber",
        seller: "Timber company Co",
        location: "Rovaniemi"
      }, {
        image: "/gfx/mock/steel-img.jpg",
        title: "Amazing steel",
        seller: "Steel company Co",
        location: "Vantaa"
      }, {
        image: "/gfx/mock/steel-img.jpg",
        title: "Amazing steel",
        seller: "Steel company Co",
        location: "Savonlinna"
      }
    ]
  };

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
    }
    
    /**
     * Handles / get request
     * 
     * @param {http.ClientRequest} req client request object
     * @param {http.ServerResponse} res server response object
     **/
    async indexGet(req, res) {
      res.render('pages/index', mockupData);
    }
    
  }

  module.exports = IndexRoutes;

})();

