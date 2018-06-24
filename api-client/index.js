(() => {
  "use strict";

  const config = require("nconf");
  const DcfbApiClient = require("dcfb-api-client");

  /**
   * Api client for Metaform API
   */
  class ApiClient {

    /**
     * Constructor
     * 
     * @param {String} accessToken access token 
     */
    constructor(accessToken) {
      this.apiUrl = config.get("api:url");
      this.accessToken = accessToken;
    }

    /**
     * Returns initialized PurchaseRequestsApi instance
     * 
     * @returns {Object} initialized PurchaseRequestsApi instance
     */
    getPurchaseRequestsApi() {
      return new DcfbApiClient.PurchaseRequestsApi(this.createClient());
    }

    /**
     * Returns initialized CategoriesApi instance
     * 
     * @returns {Object} initialized CategoriesApi instance
     */
    getCategoriesApi() {
      return new DcfbApiClient.CategoriesApi(this.createClient());
    }

    /**
     * Returns initialized ItemsApi instance
     * 
     * @returns {Object} initialized ItemsApi instance
     */
    getItemsApi() {
      return new DcfbApiClient.ItemsApi(this.createClient());
    }

    /**
     * Returns initialized LocationsApi instance
     * 
     * @returns {Object} initialized LocationsApi instance
     */
    getLocationsApi() {
      return new DcfbApiClient.LocationsApi(this.createClient());
    }

    /**
     * Creates initialized API client
     * 
     * @returns {Object} initialized API client instance
     */
    createClient() {
      const client = new DcfbApiClient.ApiClient();
      client.basePath = this.apiUrl;
      client.authentications.bearer = Object.assign({}, client.authentications.bearer, {
        apiKeyPrefix: "Bearer",
        apiKey: this.accessToken
      });

      return client;
    }
    
  }

  module.exports = ApiClient;

})();