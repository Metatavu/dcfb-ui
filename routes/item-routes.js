/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const config = require("nconf");
  const AbstractRoutes = require(`${__dirname}/abstract-routes`);
  const ApiClient = require(`${__dirname}/../api-client`);
  const DcfbApiClient = require("dcfb-api-client");
  const Item = DcfbApiClient.Item;
  const LocalizedValue = DcfbApiClient.LocalizedValue;
  const Price = DcfbApiClient.Price;
  const Image = DcfbApiClient.Image;
  const i18n = require("i18n");
  const imageUploads = require(`${__dirname}/../images/uploads`);
  const stripeOnboard = require(`${__dirname}/../stripe/onboard-middleware`);

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
      app.get("/add/item", [ keycloak.protect(), stripeOnboard ], this.catchAsync(this.addItemGet.bind(this)));
      app.post("/add/item", [ keycloak.protect(), stripeOnboard ], this.catchAsync(this.addItemPost.bind(this)));
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
      const locationsApi = apiClient.getLocationsApi();
      const item = await apiClient.findItemById(itemId);
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
      res.render("pages/add-item", {
        maxFileSize: config.get("images:max-file-size") || 2097152
      });
    }

    /**
     * Handles /add/item post request
     * 
     * @param {http.ClientRequest} req client request object
     * @param {http.ServerResponse} res server response object
     */
    async addItemPost(req, res) {
      const requiredFields = ["location-id", "category-id", "type", "title-fi", "description-fi", "unit-price", "unit", "amount"];

      const locationId = req.body["location-id"];
      const categoryId = req.body["category-id"];
      const type = req.body["type"];
      const expiresAt = req.body["expires"];
      const unit = req.body["unit"];
      const unitPrice = req.body["unit-price"];
      const amount = req.body["amount"];
      const imageNames = req.body["images"];
      const visibilityLimited = req.body["visibilityLimited"] || false;
      const allowedUserIds = [];

      if (!imageNames) {
        return res.status(400).send({
          "message": "At least one image is required"
        });
      }

      const images = imageNames.split(",").map((imageName) => {
        return Image.constructFromObject({
          "url": imageUploads.getUrl(imageName),
          "type": imageUploads.getType(imageName)
        });
      });

      for (let i = 0; i < requiredFields.length; i++) {
        if (!req.body[requiredFields[i]]) {
          return res.status(400).send({
            "message": `${requiredFields[i]} is required`
          });
        }
      }

      if (type !== "selling") {
        return res.status(400).send({
          "message": `Unknown type ${type}`
        });
      }

      const title = this.constructLocalizedFromPostBody(req.body, "title");
      const description = this.constructLocalizedFromPostBody(req.body, "description");
      const apiClient = new ApiClient(await this.getToken(req));
      const itemsApi = apiClient.getItemsApi();
      const item = Item.constructFromObject({
        "title": title,
        "description": description,
        "categoryId": categoryId,
        "locationId": locationId,
        "expiresAt": expiresAt,
        "unitPrice": Price.constructFromObject({ "price": unitPrice, "currency": "EUR" }),
        "unit": unit,
        "amount": amount,
        "images": images,
        "visibleToUsers": allowedUserIds,
        "visibilityLimited": visibilityLimited
      });

      const createdItem = await itemsApi.createItem(item);
      if (!createdItem) {
        return res.status(500).send("Failed to create item");
      }

      res.send({
        "message": i18n.__('add-item.created-message'), 
        "location": `/item/${createdItem.id}`
      });
    }

    /**
     * Constructs localized value from post body
     * 
     * @param {Object} body post body
     * @param {String} prefix value prefix 
     */
    constructLocalizedFromPostBody(body, prefix) {
      return ["fi", "sv", "en"]
        .map((language) => {
          const value = body[`${prefix}-${language}`];
          if (!value) {
            return null;
          }

          return LocalizedValue.constructFromObject({
            "language": language,
            "value": value,
            "type": "SINGLE"
          });
        })
        .filter((value) => !!value);
    }
    
  }

  module.exports = ItemRoutes;

})();

