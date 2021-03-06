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
  const Location = DcfbApiClient.Location;
  const imageUploads = require(`${__dirname}/../images/uploads`);
  const stripeOnboard = require(`${__dirname}/../stripe/onboard-middleware`);
  const keycloakAdmin = require(`${__dirname}/../keycloak-admin`);

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
    constructor (app, keycloak, transactionLogger) {
      super(app, keycloak);
      this.transactionLogger = transactionLogger;
      app.get("/ajax/searchItems", [ ], this.catchAsync(this.searchItemsGet.bind(this)));
      app.put("/ajax/item/sell/:id", [ keycloak.protect() ], this.catchAsync(this.sellItemPut.bind(this)));
      app.get("/item/:id", [ ], this.catchAsync(this.itemGet.bind(this)));
      app.get("/add/item", [ keycloak.protect(), stripeOnboard ], this.catchAsync(this.addItemGet.bind(this)));
      app.post("/add/item", [ keycloak.protect(), stripeOnboard ], this.catchAsync(this.addItemPost.bind(this)));
      app.get("/update/item/:id", [ keycloak.protect() ], this.catchAsync(this.updateItemGet.bind(this)));
      app.put("/update/item/:id", [ keycloak.protect() ], this.catchAsync(this.updateItemPut.bind(this)));
      app.delete("/delete/item/:id", [ keycloak.protect() ], this.catchAsync(this.itemDelete.bind(this)));
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
      const locationsApi = apiClient.getLocationsApi();
      const items = await itemsApi.listItems({
        firstResult: firstResult,
        maxResults: maxResults,
        sort: ["CREATED_AT_DESC"]
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

      const sellers = await Promise.all(items
        .map((item) => item.sellerId)
        .filter((itemId, index, array) => index === array.indexOf(itemId))
        .map((sellerId) => {
          return keycloakAdmin.findUser(sellerId);
        }));

      const sellerMap = sellers.reduce((map, seller) => {
        map[seller.id] = seller;
        return map;
      }, {});

      items.forEach((item) => {
        item.typeOfBusinessText = item.typeOfBusiness === "SALE" ? res.__("item-type-of-business-selling-text") : res.__("item-type-of-business-bying-text")
        item.location = res.locals._LS(locationMap[item.locationId].name);
        const sellerObj = sellerMap[item.sellerId];
        item.seller = sellerObj.firstName && sellerObj.lastName ? `${sellerObj.firstName} ${sellerObj.lastName}` : sellerObj.username;
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

      const allowPurchaseCreditCard = item.paymentMethods.allowCreditCard;
      const allowPurchaseContactSeller = item.paymentMethods.allowContactSeller;
      
      const hasManagementPermission = item.resourceId ? await this.hasManagementPermission(req, item.resourceId) : false;
      const stripeDetails = {
        itemId: item.id,
        unitPrice: item.unitPrice,
        deliveryPrice: item.deliveryPrice ? Math.round(parseFloat(item.deliveryPrice.price) * 100) : 0,
        publicKey: config.get("stripe:public-key"),
        productDescription: res.locals._LS(item.title),
        processingMessage: res.__("item.purchase.processing-message"),
        successMessage:  res.__("item.purchase.success-message")
      };
      res.render("pages/item", Object.assign({ 
        item: item,
        hasManagementPermission: hasManagementPermission, 
        itemsLeft: itemsLeft,
        location: location,
        stripeDetails: JSON.stringify(stripeDetails),
        allowPurchaseCreditCard: allowPurchaseCreditCard,
        allowPurchaseContactSeller: allowPurchaseContactSeller,
        onlyContactSellerPurchases: !allowPurchaseCreditCard && allowPurchaseContactSeller
      }, await this.getCategoryDatas(categoriesApi, req)));
    }

    /**
     * Handles sell item ajax request
     * 
     * @param {object} req http request
     * @param {object} res http response
     */
    async sellItemPut(req, res) {
      const amount = parseInt(req.body.amount);
      const itemId = req.params.id;

      const apiClient = new ApiClient(await this.getToken(req));
      const item = await apiClient.findItemById(itemId);
      
      if (!amount) {
        return res.status(400).send({
          "message": "Amount is required"
        });
      }

      if (!item) {
        return res.status(404).send({
          "message": "Item not found"
        });
      }

      const sellerId = item.sellerId;
      if (!sellerId) {
        res.status(400).send("missing seller id");
        return;
      }

      const seller = await keycloakAdmin.findUser(sellerId);
      if (!seller) {
        res.status(400).send("missing seller");
        return;
      }

      const totalSoldAmount = item.soldAmount + item.reservedAmount + amount ;
      if (totalSoldAmount > item.amount) {
        return res.status(400).send({
          "message": "There is not that many items in stock"
        });
      }

      item.soldAmount = item.soldAmount + amount;
      try {
        const updatedItem = await apiClient.updateItem(item.id, item);
        if (!updatedItem) {
          return res.status(500).send({
            "message": "Failed to update item"
          });
        }
        let description = `${amount} ${item.unit} ${res.locals._LS(item.title)}`;
        this.transactionLogger.log(item, description, null, null, seller, sellerId, null);
        res.send({
          "message": res.__("sell-item.success-message") 
        });
      } catch (err) {
        console.error("Error selling item", err);
        return res.status(500).send({
          "message": "Failed to update item"
        });
      }
    }

    /**
     * Handles / get request
     * 
     * @param {http.ClientRequest} req client request object
     * @param {http.ServerResponse} res server response object
     **/
    async addItemGet(req, res) {
      const apiClient = new ApiClient(await this.getToken(req));
      const categoriesApi = apiClient.getCategoriesApi();
      const stripe = this.getStripe(req);
      const stripeActive = !!stripe.accountId;
      const businessDetails = this.getBusinessFromAccount(req);

      res.render("pages/add-item", {
        maxFileSize: config.get("images:max-file-size") || 2097152,
        topMenuCategories: await this.getTopMenuCategories(categoriesApi, null),
        stripeActive: stripeActive,
        businessDetails: businessDetails
      });
    }

    /**
     * Handles item update put request
     * 
     * @param {http.ClientRequest} req client request object
     * @param {http.ServerResponse} res server response object
     **/
    async updateItemPut(req, res) {
      const itemId = req.params.id;

      const apiClient = new ApiClient(await this.getToken(req));
      const item = await apiClient.findItemById(itemId);
      const typeOfBusiness = item.typeOfBusiness;
      if (!item) {
        return res.status(404).send({
          "message": "Item not found"
        });
      }

      const requiredFields = typeOfBusiness === "SALE" ? ["category-id", "title-fi", "description-fi", "unit-price", "unit", "amount"] : ["category-id", "title-fi", "description-fi"];
      const locationData = req.body.location;
      const categoryId = req.body["category-id"];
      const expiresAt = req.body["expires"];
      const unit = req.body["unit"];
      const unitPrice = req.body["unit-price"];
      const amount = req.body["amount"];
      const imageNames = req.body["images"];
      const contactEmail = req.body["contact-email"];
      const contactPhone = req.body["contact-phone"];
      const allowPickup = typeOfBusiness === "SALE" ? req.body["allow-pickup"] : false;
      const allowDelivery = typeOfBusiness === "SALE" ? req.body["allow-delivery"] : false;
      const deliveryPrice = typeOfBusiness === "SALE" ? req.body["delivery-price"] : null;
      const termsOfDelivery = typeOfBusiness === "SALE" ? req.body["terms-of-delivery"] : null;
      const businessName = req.body["contact-businessname"];
      const businessCode = req.body["contact-businesscode"];
      
      const visibilityLimited = req.body["visibilityLimited"] || false;
      const allowedUserIds = [];
      const purchaseMethods = typeOfBusiness === "SALE" ? req.body["purchase-method"] || [] : [];

      if (!businessCode) {
        return res.status(400).send({
          "message": "business code is required"
        });
      }

      let images = req.body.preservedImages || [];
      if (imageNames) {
        const newImages = imageNames.split(",").map((imageName) => {
          return Image.constructFromObject({
            "url": imageUploads.getUrl(imageName),
            "type": imageUploads.getType(imageName)
          });
        });

        images = images.concat(newImages);
      }

      for (let i = 0; i < requiredFields.length; i++) {
        if (!req.body[requiredFields[i]]) {
          return res.status(400).send({
            "message": `${requiredFields[i]} is required`
          });
        }
      }

      let locationId = item.locationId;
      if (locationData) {
        if (!locationData.name) {
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
        let createdLocation = null;
        try {
          createdLocation = await locationsApi.createLocation(location);
        } catch (error) {
          console.error("Error creating location", error);
        }

        if (!createdLocation || !createdLocation.id) {
          return res.status(400).send({
            "message": "Invalid location information"
          });
        }

        locationId = createdLocation.id;
      }

      const title = this.constructLocalizedFromPostBody(req.body, "title");
      const description = this.constructLocalizedFromPostBody(req.body, "description");
      const allowCreditCard = purchaseMethods.indexOf("credit-card") > -1;
      const allowContactSeller = purchaseMethods.indexOf("contact-seller") > -1;

      if (typeOfBusiness === "SALE" && !allowCreditCard && !allowContactSeller) {
        return res.status(400).send({
          "message": "At least one purchase method is required"
        });
      }

      item.title = title;
      item.description = description;
      item.categoryId = categoryId;
      item.locationId = locationId;
      item.expiresAt = expiresAt;
      item.unitPrice = unitPrice ? Price.constructFromObject({ "price": unitPrice, "currency": "EUR" }) : null;
      item.unit = unit;
      item.amount = amount;
      item.images = images;
      item.visibleToUsers = allowedUserIds;
      item.visibilityLimited = visibilityLimited;
      item.sellerId = this.getLoggedUserId(req);
      item.deliveryPrice = deliveryPrice ? Price.constructFromObject({ "price": deliveryPrice, "currency": "EUR" }) : null;
      item.contactEmail = contactEmail;
      item.contactPhone = contactPhone;
      item.allowDelivery = allowDelivery;
      item.allowPickup = allowPickup;
      item.termsOfDelivery = termsOfDelivery;
      item.businessName = businessName;
      item.businessCode = businessCode;
      item.paymentMethods = {
        allowCreditCard: allowCreditCard,
        allowContactSeller: allowContactSeller
      };

      const updatedItem = await apiClient.updateItem(item.id, item);
      if (!updatedItem) {
        return res.status(500).send("Failed to update item");
      }

      res.send({
        "message": res.__("update-item.created-message"), 
        "location": `/item/${updatedItem.id}`
      });
    }

    /**
     * Handles item update get request
     * 
     * @param {http.ClientRequest} req client request object
     * @param {http.ServerResponse} res server response object
     **/
    async updateItemGet(req, res) {
      const itemId = req.params.id;

      const apiClient = new ApiClient(await this.getToken(req));
      const locationsApi = apiClient.getLocationsApi();
      const item = await apiClient.findItemById(itemId);
      
      if (!item) {
        res.status(404).send("Item not found");
        return;
      }

      const hasManagementPermission = item.resourceId ? await this.hasManagementPermission(req, item.resourceId) : false;
      if (!hasManagementPermission) {
        res.status(404).send("Item not found");
        return;
      }

      const location = await locationsApi.findLocation(item.locationId);
      const itemsLeft = item.amount - (item.reservedAmount + item.soldAmount);

      const allowPurchaseCreditCard = item.paymentMethods.allowCreditCard;
      const allowPurchaseContactSeller = item.paymentMethods.allowContactSeller;

      const categoriesApi = apiClient.getCategoriesApi();
      const stripe = this.getStripe(req);
      const stripeActive = !!stripe.accountId;

      res.render("pages/update-item", {
        maxFileSize: config.get("images:max-file-size") || 2097152,
        topMenuCategories: await this.getTopMenuCategories(categoriesApi, null),
        stripeActive: stripeActive,
        item: item,
        itemCategory: await categoriesApi.findCategory(item.categoryId),
        hasManagementPermission: hasManagementPermission, 
        itemsLeft: itemsLeft,
        location: location,
        allowPurchaseCreditCard: allowPurchaseCreditCard,
        allowPurchaseContactSeller: allowPurchaseContactSeller,
        onlyContactSellerPurchases: !allowPurchaseCreditCard && allowPurchaseContactSeller
      });
    }

    /**
     * Handles /add/item post request
     * 
     * @param {http.ClientRequest} req client request object
     * @param {http.ServerResponse} res server response object
     */
    async addItemPost(req, res) {
      const typeOfBusiness = req.body["type-of-business"];

      const requiredFields = typeOfBusiness === "SALE" ? ["category-id", "title-fi", "description-fi", "unit-price", "unit", "amount"] : ["category-id", "title-fi", "description-fi"];
      const locationData = req.body.location;
      const categoryId = req.body["category-id"];
      const expiresAt = req.body["expires"];
      const unit = req.body["unit"];
      const unitPrice = req.body["unit-price"];
      const amount = req.body["amount"];
      const imageNames = req.body["images"];
      const visibilityLimited = req.body["visibilityLimited"] || false;
      const allowedUserIds = [];
      const purchaseMethods = typeOfBusiness === "SALE" ? req.body["purchase-method"] || [] : [];
      const contactEmail = req.body["contact-email"];
      const contactPhone = req.body["contact-phone"];
      const allowPickup = typeOfBusiness === "SALE" ? req.body["allow-pickup"] : false;
      const allowDelivery = typeOfBusiness === "SALE" ? req.body["allow-delivery"] : false;
      const deliveryPrice = typeOfBusiness === "SALE" ? req.body["delivery-price"] : null;
      const termsOfDelivery = typeOfBusiness === "SALE" ? req.body["terms-of-delivery"] : null;
      const businessName = req.body["contact-businessname"];
      const businessCode = req.body["contact-businesscode"];

      if (!businessCode) {
        return res.status(400).send({
          "message": "business code is required"
        });
      }

      const images = imageNames ? imageNames.split(",").map((imageName) => {
        return Image.constructFromObject({
          "url": imageUploads.getUrl(imageName),
          "type": imageUploads.getType(imageName)
        });
      }) : [];

      for (let i = 0; i < requiredFields.length; i++) {
        if (!req.body[requiredFields[i]]) {
          return res.status(400).send({
            "message": `${requiredFields[i]} is required`
          });
        }
      }

      if (!locationData || !locationData.name) {
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
      let createdLocation = null;
      try {
        createdLocation = await locationsApi.createLocation(location);
      } catch (error) {
        console.error("Error creating location", error);
      }

      if (!createdLocation || !createdLocation.id) {
        return res.status(400).send({
          "message": "Invalid location information"
        });
      }

      const locationId = createdLocation.id;
      const title = this.constructLocalizedFromPostBody(req.body, "title");
      const description = this.constructLocalizedFromPostBody(req.body, "description");
      const itemsApi = apiClient.getItemsApi();
      const allowCreditCard = purchaseMethods.indexOf("credit-card") > -1;
      const allowContactSeller = purchaseMethods.indexOf("contact-seller") > -1;

      if (typeOfBusiness === "SALE" && !allowCreditCard && !allowContactSeller) {
        return res.status(400).send({
          "message": "At least one purchase method is required"
        });
      }

      const item = Item.constructFromObject({
        "title": title,
        "typeOfBusiness": typeOfBusiness,
        "description": description,
        "categoryId": categoryId,
        "locationId": locationId,
        "expiresAt": expiresAt,
        "unitPrice": unitPrice ? Price.constructFromObject({ "price": unitPrice, "currency": "EUR" }) : null,
        "unit": unit,
        "amount": amount,
        "images": images,
        "deliveryPrice": deliveryPrice ? Price.constructFromObject({ "price": deliveryPrice, "currency": "EUR" }) : null,
        "contactEmail": contactEmail,
        "contactPhone": contactPhone,
        "allowDelivery": allowDelivery,
        "allowPickup": allowPickup,
        "termsOfDelivery": termsOfDelivery,
        "visibleToUsers": allowedUserIds,
        "visibilityLimited": visibilityLimited,
        "sellerId": this.getLoggedUserId(req),
        "businessName": businessName,
        "businessCode": businessCode,
        "paymentMethods": {
          allowCreditCard: allowCreditCard,
          allowContactSeller: allowContactSeller
        }
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
     * Handles item delete request
     * 
     * @param {http.ClientRequest} req client request object
     * @param {http.ServerResponse} res server response object
     **/
    async itemDelete(req, res) {
      const itemId = req.params.id;

      const apiClient = new ApiClient(await this.getToken(req));
      const item = await apiClient.findItemById(itemId);
      
      if (!item) {
        return res.status(404).send({
          "message": "Item not found"
        });
      }

      try {
        await apiClient.deleteItem(item.id);
        res.status(204).send();
      } catch (error) {
        console.error("Error deleting item", error);
        return res.status(400).send({
          "message": "Error deleting item"
        });
      }

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

