(() => {
  "use strict";

  const config = require("nconf");
  const KeycloakAdminClient = require("keycloak-admin-client");
  const log4js = require("log4js");
  const logger = log4js.getLogger(__filename);

  /**
   * Keycloak admin client
   */
  class KeycloakAdmin {

    /**
     * Constructor
     * 
     * @param {String} accessToken access token 
     */
    constructor() {
      this.client = null;
      this.requireFreshClient = true;
      setInterval(() => {
        this.requireFreshClient = true;
      }, 45 * 1000);
    }

    /**
     * Finds single user from Keycloak.
     * 
     * @param {String} id user id
     * @return {Promise} promise for a user or null if not found
     */
    async findUser(id) {
      const client = await this.getClient();
      return client.users.find(config.get("keycloak-admin:realm"), { userId: id });
    }    

    /**
     * Sets single user attribute
     * 
     * @param {Object} user Keycloak user
     * @param {String} name name of the attribute
     * @param {String} value value
     */
    setSingleAttribute(user, name, value) {
      if (!user.attributes) {
        user.attributes = {};
      }
      
      if (value) {
        user.attributes[name] = value;
      } else {
        delete user.attributes[name];
      }
    }

    /**
     * Updates user into Keycloak
     * 
     * @param {Object} user user object
     * @return {Promise} promise that resolves on success and rejects on failure
     */
    async updateUser(user) {
      const client = await this.getClient();
      const result = await client.users.update(config.get("keycloak-admin:realm"), user);
      return result;
    }

    /**
     * Returns Keycloak admin client
     * 
     * @return Keycloak admin client
     */
    async getClient() {
      if (!this.client || this.requireFreshClient) {
        this.client = await KeycloakAdminClient(config.get("keycloak-admin"));
        this.requireFreshClient = false;
        logger.info("Getting fresh keycloak client...");
      }
      
      return this.client; 
    }
    
  }

  module.exports = new KeycloakAdmin();

})();