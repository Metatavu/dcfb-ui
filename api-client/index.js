(() => {
  "use strict";

  const config = require("nconf");
  const DcfbApiClient = require("dcfb-api-client");
  const fetch = require("node-fetch");
  const { URLSearchParams } = require("url");
  const log4js = require("log4js");
  const logger = log4js.getLogger(__filename);

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
     * Finds item by id and retries request if 401 or 403 response is received with www-authenticate header
     * 
     * @param {string} itemId uuid of item to find
     * @param {boolean} isRetryParam is current method call retry, defaults to false
     */
    async findItemById(itemId, isRetryParam) {
      const isRetry =  isRetryParam ? isRetryParam : false;
      const itemsApi = this.getItemsApi();
      try {
        return await itemsApi.findItem(itemId);
      } catch (err) {
        if (!(err.status === 401 || err.status === 403) || isRetry) {
          return Promise.reject(err);
        }

        const rpt = await this.getRPT(err);
        if (!rpt) {
          return Promise.reject(err);
        }

        this.accessToken = rpt;
        return this.findItemById(itemId, true);
      }
    }

    /**
     * Creates category and retries request if 401 or 403 response is received with www-authenticate header
     * 
     * @param {DcfbApiClient.Category} category category object
     * @param {boolean} isRetryParam is current method call retry, defaults to false
     */
    async createCategory(category, isRetryParam) {
      const isRetry =  isRetryParam ? isRetryParam : false;
      const categoriesApi = this.getCategoriesApi();
      try {
        return await categoriesApi.createCategory(category);
      } catch (err) {
        if (!(err.status === 401 || err.status === 403) || isRetry) {
          return Promise.reject(err);
        }

        const rpt = await this.getRPT(err);
        if (!rpt) {
          return Promise.reject(err);
        }

        this.accessToken = rpt;
        return this.createCategory(category, true);
      }
    }

    /**
     * Updates category and retries request if 401 or 403 response is received with www-authenticate header
     * 
     * @param {String} categoryId id of the category to update
     * @param {DcfbApiClient.Category} category category object
     * @param {boolean} isRetryParam is current method call retry, defaults to false
     */
    async updateCategory(categoryId, category, isRetryParam) {
      const isRetry =  isRetryParam ? isRetryParam : false;
      const categoriesApi = this.getCategoriesApi();
      try {
        return await categoriesApi.updateCategory(categoryId, category);
      } catch (err) {
        if (!(err.status === 401 || err.status === 403) || isRetry) {
          return Promise.reject(err);
        }

        const rpt = await this.getRPT(err);
        if (!rpt) {
          return Promise.reject(err);
        }

        this.accessToken = rpt;
        return this.updateCategory(categoryId, category, true);
      }
    }

    /**
     * Deletes category and retries request if 401 or 403 response is received with www-authenticate header
     * 
     * @param {String} categoryId id of the category to delete
     * @param {boolean} isRetryParam is current method call retry, defaults to false
     */
    async deleteCategory(categoryId, isRetryParam) {
      const isRetry =  isRetryParam ? isRetryParam : false;
      const categoriesApi = this.getCategoriesApi();
      try {
        return await categoriesApi.deleteCategory(categoryId);
      } catch (err) {
        if (!(err.status === 401 || err.status === 403) || isRetry) {
          return Promise.reject(err);
        }

        const rpt = await this.getRPT(err);
        if (!rpt) {
          return Promise.reject(err);
        }

        this.accessToken = rpt;
        return this.deleteCategory(categoryId, true);
      }
    }

    /**
     * Returns UMA ticket from www-authenticate header or null if not found
     * 
     * @param {object} errorResponse 401 or 403 error response from api call
     * 
     * @returns {string} returns uma ticket or null
     */
    getUMATicket(errorResponse) {
      const response = errorResponse.response && errorResponse.response.res ? errorResponse.response.res : null;
      if (!response) {
        return null;
      }

      const wwwAuthenticateHeader = response.headers ? response.headers["www-authenticate"] : null;
      if (!wwwAuthenticateHeader) {
        return null;
      }

      const headerComponents = wwwAuthenticateHeader.split(",");
      let ticket = null;
      headerComponents.forEach((component) => {
        if (component.startsWith("ticket")) {
          ticket = component.split("=")[1].replace(/"/g, "");
        }
      });

      return ticket;
    }

    /**
     * Queries RPT token from authorization server by error response containing www-authenticate header
     * 
     * @param {object} errorResponse error response containing www-authenticate header 
     */
    async getRPT(errorResponse) {
      const ticket = this.getUMATicket(errorResponse);

      const keycloak = config.get("keycloak");
      const realm = keycloak.realm;
      const authServerUrl = keycloak["auth-server-url"];
      const headers = {
        "Authorization": `Bearer ${this.accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded"
      };
      const url = `${authServerUrl}/realms/${realm}/protocol/openid-connect/token`;
      const params = new URLSearchParams();
      params.append("grant_type", "urn:ietf:params:oauth:grant-type:uma-ticket");
      params.append("ticket", ticket);
      try {
        const res = await fetch(url, { method: "POST", headers: headers, body: params });
        if (res.status !== 200) {
          return null;
        }
        const data = await res.json();
        return data["access_token"];
      } catch(err) {
        logger.error("Error requesting RPT token", err);
        return null;
      }
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