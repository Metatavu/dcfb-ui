/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const AbstractRoutes = require(`${__dirname}/abstract-routes`);
  const ApiClient = require(`${__dirname}/../api-client`);
  const DcfbApiClient = require("dcfb-api-client");
  const Category = DcfbApiClient.Category;
  /**
   * Category routes
   */
  class CategoryRoutes extends AbstractRoutes {
    
    /**
     * Constructor for category routes class
     * 
     * @param {Object} app Express app
     * @param {Object} keycloak keycloak
     */
    constructor (app, keycloak) {
      super(app, keycloak);
      
      app.get("/ajax/searchCategories", [ ], this.catchAsync(this.ajaxSearchCategoriesGet.bind(this)));
      app.get("/ajax/admin/categories", [ keycloak.protect() ], this.catchAsync(this.adminAjaxCategoriesGet.bind(this)));
      app.post("/ajax/admin/categoryform", [ keycloak.protect() ], this.catchAsync(this.adminAjaxCategogyFormPost.bind(this)));
      app.post("/ajax/admin/categories", [ keycloak.protect() ], this.catchAsync(this.adminAjaxCategoriesPost.bind(this)));
      app.put("/ajax/admin/categories/:id", [ keycloak.protect() ], this.catchAsync(this.adminAjaxCategoriesPut.bind(this)));
      app.delete("/ajax/admin/categories/:id", [ keycloak.protect() ], this.catchAsync(this.adminAjaxCategoriesDelete.bind(this)));
      app.get("/admin/categories", [ keycloak.protect() ], this.catchAsync(this.categoryManagementGet.bind(this)));
    }

    /**
     * Handles search categories ajax request 
     * 
     * @param {http.ClientRequest} req client request object
     * @param {http.ServerResponse} res server response object
     **/
    async ajaxSearchCategoriesGet(req, res) {
      const search = req.query.search;
      const apiClient = new ApiClient(await this.getToken(req));
      const categoriesApi = apiClient.getCategoriesApi();
      const categories = await categoriesApi.listCategories({
        search: search
      });

      res.send(categories);
    }
    /**
     * Handles category form ajax request
     * 
     * @param {http.ClientRequest} req client request object
     * @param {http.ServerResponse} res server response object
     **/
    adminAjaxCategogyFormPost(req, res) {
      const data = req.body.data;
      res.render("fragments/category-form", {data: data});
    }

    /**
     * Handles category admin request 
     * 
     * @param {http.ClientRequest} req client request object
     * @param {http.ServerResponse} res server response object
     **/
    async adminAjaxCategoriesGet(req, res) {
      const apiClient = new ApiClient(await this.getToken(req));
      const categoriesApi = apiClient.getCategoriesApi();

      res.send(await this.getCategoryTree(categoriesApi, null, "name", "children", req));
    }

    /**
     * Handles category post request 
     * 
     * @param {http.ClientRequest} req client request object
     * @param {http.ServerResponse} res server response object
     **/
    async adminAjaxCategoriesPost(req, res) {
      const category = Category.constructFromObject(req.body);
      const apiClient = new ApiClient(await this.getToken(req));

      res.send(await apiClient.createCategory(category));
    }

    /**
     * Handles category post request 
     * 
     * @param {http.ClientRequest} req client request object
     * @param {http.ServerResponse} res server response object
     **/
    async adminAjaxCategoriesPut(req, res) {
      const categoryId = req.params.id;
      const category = Category.constructFromObject(req.body);
      const apiClient = new ApiClient(await this.getToken(req));

      res.send(await apiClient.updateCategory(categoryId, category));
    }
    /**
     * Handles category delete request
     * 
     * @param {http.ClientRequest} req 
     * @param {http.ServerResponse} res 
     */
    async adminAjaxCategoriesDelete(req, res) {
      const categoryId = req.params.id;
      const apiClient = new ApiClient(await this.getToken(req));
      await apiClient.deleteCategory(categoryId);
      res.send(204);
    }

    categoryManagementGet(req, res) {
      res.render("pages/category-management");
    }
  }

  module.exports = CategoryRoutes;

})();

