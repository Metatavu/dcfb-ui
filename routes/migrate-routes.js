/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const AbstractRoutes = require(`${__dirname}/abstract-routes`);
  const mockupData = require(`${__dirname}/mockup-data`);
  const ApiClient = require(`${__dirname}/../api-client`);
  const DcfbApiClient = require("dcfb-api-client");
  const LocalizedValue = DcfbApiClient.LocalizedValue;
  const Meta = DcfbApiClient.Meta;
  const Item = DcfbApiClient.Item;
  const Image = DcfbApiClient.Image;
  const Price = DcfbApiClient.Price;
  const Address = DcfbApiClient.Address;
  const Location = DcfbApiClient.Location;
  const i18n = require("i18n");

  /**
   * Index routes
   */
  class MigrateRoutes extends AbstractRoutes {
    
    /**
     * Constructor for abstract routes class
     * 
     * @param {Object} app Express app
     * @param {Object} keycloak keycloak
     */
    constructor (app, keycloak) {
      super(app, keycloak);
      
      app.get("/migrateTestLocations", keycloak.protect(), this.catchAsync(this.getMigrateTestLocations.bind(this)));
      app.get("/migrateTestCategories", keycloak.protect(), this.catchAsync(this.getMigrateTestCategories.bind(this)));
      app.get("/migrateTestItems", keycloak.protect(), this.catchAsync(this.getMigrateTestItems.bind(this)));
    }

    async getMigrateTestLocations(req, res) {
      const apiClient = new ApiClient(await this.getToken(req));
      const locationsApi = apiClient.getLocationsApi();
      
      try {
        const locations = {};

        mockupData.items.forEach((item) => {
          locations[`${item.location}-${item.seller}`] = {
            location: item.location,
            seller: item.seller
          };
        });

        const locationDatas = Object.values(locations);

        for (let i = 0; i < locationDatas.length; i++) {
          const locationData = locationDatas[i];

          const name = LocalizedValue.constructFromObject({
            "language": "fi",
            "value": `${locationData.seller} - ${locationData.location}`,
            "type": "SINGLE"
          });

          const address = Address.constructFromObject({
            postOffice: locationData.location, 
            country: "Finland"
          });

          await locationsApi.createLocation(Location.constructFromObject({
            name: [ name ],
            address: address
          }));
        }

      } catch (e) {
        res.status(500).send(e);
      }

      res.sendStatus(200);
    }

    async getMigrateTestCategories(req, res) {
      const apiClient = new ApiClient(await this.getToken(req));
      const categoriesApi = apiClient.getCategoriesApi();

      try {
        for (let i = 0; i < mockupData.categories.length; i++) {
          const category = mockupData.categories[i];
          const createdParent = await this.createTestCategory(categoriesApi, null, category.name, category.icon, true, false);

          for (let j = 0; j < category.subcategories.length; j++) {
            const subcategory = category.subcategories[j];
            await this.createTestCategory(categoriesApi, createdParent.id, subcategory, null, false, false);
          }
        }

        for (let i = 0; i < mockupData.sidecategories.length; i++) {
          const categoryName = mockupData.sidecategories[i];
          await this.createTestCategory(categoriesApi, null, categoryName, null, false, true);
        }
      } catch (e) {
        res.status(500).send(e);
      }

      res.sendStatus(200);
    }

    async getMigrateTestItems(req, res) {
      const apiClient = new ApiClient(await this.getToken(req));
      const categoriesApi = apiClient.getCategoriesApi();
      const itemsApi = apiClient.getItemsApi();
      const locationsApi = apiClient.getLocationsApi();
     
      try {
        for (let i = 0; i < mockupData.items.length; i++) {
          const item = mockupData.items[i];

          const title = item.title.map((itemTitle) => {
            return LocalizedValue.constructFromObject({
              "language": itemTitle.locale,
              "value": itemTitle.value,
              "type": "SINGLE"
            })
          });

          const location = (await locationsApi.listLocations({
            "search": `${item.seller} - ${item.location}`
          }))[0];

          const locationId = location ? location.id : null;

          const categorySlug = item.category;
          const category = (await categoriesApi.listCategories({
            slug: categorySlug
          })).splice(0, 1)[0];
          const categoryId = category ? category.id : null;
          
          const images = item.image ? [ Image.constructFromObject({url: `https://mansyns.fi${item.image}`, type: "image/jpeg" }) ] : null;
          const unitPrice = Price.constructFromObject({
            "price": item.price.toFixed(2),
            "currency": "EUR"
          });

          const unit = "kg";
          const amount = Math.round(Math.random() * 100);
          const payloadData = {
            title: title,
            description: null,
            categoryId: categoryId,
            locationId: locationId,
            images: images,
            unitPrice: unitPrice,
            unit: unit,
            amount: amount
          };
          
          const payload = Item.constructFromObject(payloadData);

          await itemsApi.createItem(payload);
        }

      } catch (e) {
        res.status(500).send(e);
      }

      res.sendStatus(200);
    }
    
    async createTestCategory(categoriesApi, parentId, name, icon, index, side) {
      const meta = [];

      if (icon) {
        meta.push(Meta.constructFromObject({
          "key": "ui-icon",
          "value": icon
        }));
      }

      if (index) {
        meta.push(Meta.constructFromObject({
          "key": "ui-index-page",
          "value": "true"
        }));
      }

      if (side) {
        meta.push(Meta.constructFromObject({
          "key": "ui-footer-side",
          "value": "true"
        }));
      }

      const title = [];
      const localeCatalog = i18n.getCatalog();
      
      ["en", "fi"].forEach((locale) => {
        const singleLocale = localeCatalog[locale][`materials.categories.${name}.single`];
        const pluralLocale = localeCatalog[locale][`materials.categories.${name}.plural`];
        
        if (singleLocale) {
          title.push(LocalizedValue.constructFromObject({
            "language": locale,
            "value": singleLocale,
            "type": "SINGLE"
          }));
        }

        if (pluralLocale) {
          title.push(LocalizedValue.constructFromObject({
            "language": locale,
            "value": pluralLocale,
            "type": "PLURAL"
          }));
        }
      });

      return categoriesApi.createCategory({
        parentId: parentId,
        title: title,
        meta: meta
      });
    }
    
  }

  module.exports = MigrateRoutes;

})();

