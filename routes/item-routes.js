/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const config = require("nconf");
  const AbstractRoutes = require(`${__dirname}/abstract-routes`);
  const ApiClient = require(`${__dirname}/../api-client`);
  const DcfbApiClient = require("dcfb-api-client");
  const Item = DcfbApiClient.Item;
  const Meta = DcfbApiClient.Meta;
  const LocalizedValue = DcfbApiClient.LocalizedValue;
  const Price = DcfbApiClient.Price;
  const Image = DcfbApiClient.Image;
  const Location = DcfbApiClient.Location;
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
      
      if (!item) {
        res.status(404).send("Item not found");
        return;
      }

      const location = await locationsApi.findLocation(item.locationId);
      const itemsLeft = item.amount - (item.reservedAmount + item.soldAmount); 
      const itemMeta = item.meta || {};

      const allowPurchaseCreditCard = itemMeta['allow-purchase-credit-card'] === "true";
      const allowPurchaseContactSeller = itemMeta['allow-purchase-contact-seller'] === "true";
      
      const stripeDetails = {
        itemId: item.id,
        unitPrice: item.unitPrice,
        publicKey: config.get("stripe:public-key"),
        productDescription: res.locals._LS(item.title),
        processingMessage: res.__("item.purchase.processing-message"),
        successMessage:  res.__("item.purchase.success-message")
      };

      res.render("pages/item", Object.assign({ 
        item: item, 
        itemsLeft: itemsLeft,
        location: location,
        stripeDetails: JSON.stringify(stripeDetails),
        allowPurchaseCreditCard: allowPurchaseCreditCard,
        allowPurchaseContactSeller: allowPurchaseContactSeller,
        onlyContactSellerPurchases: !allowPurchaseCreditCard && allowPurchaseContactSeller
      }, await this.getCategoryDatas(categoriesApi, req)));
    }
    
    /**
     * Handles / get request
     * 
     * @param {http.ClientRequest} req client request object
     * @param {http.ServerResponse} res server response object
     **/
    async addItemGet(req, res) {
      const accessToken = this.getAccessToken(req);
      const apiClient = new ApiClient(await this.getToken(req));
      const categoriesApi = apiClient.getCategoriesApi();
      const stripe = accessToken["stripe"] || req.session.stripe || {};
      const stripeActive = !!stripe.accountId;

      res.render("pages/add-item", {
        maxFileSize: config.get("images:max-file-size") || 2097152,
        topMenuCategories: await this.getTopMenuCategories(categoriesApi, null),
        stripeActive: stripeActive
      });
    }

    /**
     * Handles /add/item post request
     * 
     * @param {http.ClientRequest} req client request object
     * @param {http.ServerResponse} res server response object
     */
    async addItemPost(req, res) {
      const requiredFields = ["category-id", "type", "title-fi", "description-fi", "unit-price", "unit", "amount"];
      const locationData = req.body.location;
      const categoryId = req.body["category-id"];
      const type = req.body["type"];
      const expiresAt = req.body["expires"];
      const unit = req.body["unit"];
      const unitPrice = req.body["unit-price"];
      const amount = req.body["amount"];
      const imageNames = req.body["images"];
      const visibilityLimited = req.body["visibilityLimited"] || false;
      const allowedUserIds = [];
      const purchaseMethods = req.body.purchaseMethod || [];

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

      if (!locationData) {
        return res.status(400).send({
          "message": "Location is required"
        });
      }

      const locationName = [{
        "language": "en",
        "value": locationData.name,
        "type": "SINGLE"
      }];

      const coordinates = {
        crs: "epsg4326",
        latitude: locationData.coordinates.lat,
        longitude: locationData.coordinates.lng
      };

      const address = this.parseAddress(locationData.addressComponents);
      const location = Location.constructFromObject({
        name: locationName,
        coordinate: coordinates,
        address: address
      });
      
      const apiClient = new ApiClient(await this.getToken(req));
      const locationsApi = apiClient.getLocationsApi();
      const createdLocation = await locationsApi.createLocation(location);
      const locationId = createdLocation.id;
      const title = this.constructLocalizedFromPostBody(req.body, "title");
      const description = this.constructLocalizedFromPostBody(req.body, "description");
      const itemsApi = apiClient.getItemsApi();
      const meta = purchaseMethods.map((purchaseMethod) => {
        return Meta.constructFromObject({
          "key": `allow-purchase-${purchaseMethod}`,
          "value": "true"
        });
      });

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
        "visibilityLimited": visibilityLimited,
        "sellerId": this.getLoggedUserId(req),
        "meta": meta
      });

      const createdItem = await itemsApi.createItem(item);
      if (!createdItem) {
        return res.status(500).send("Failed to create item");
      }

      res.send({
        "message": res.__("add-item.created-message"), 
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
    
    parseAddress(addressComponents) {
      if (!Array.isArray(addressComponents)) {
        return {};
      }

      return {
        streetAddress: `${this.getAddressComponent(addressComponents, "route")} ${this.getAddressComponent(addressComponents, "street_number")}`,
        postalCode: this.getAddressComponent(addressComponents, "postal_code"),
        postOffice: this.getAddressComponent(addressComponents, "locality"),
        country: this.getAddressComponent(addressComponents, "country")
      };
    }

    getAddressComponent(components, name) {
      if (!Array.isArray(components)) {
        return null;
      }

      for(let i = 0; i < components.length; i++) {
        let component = components[i];
        if (component.types.indexOf(name) > -1) {
          return component.long_name;
        }
      }

      return null;
    }

  }

  module.exports = ItemRoutes;

})();

