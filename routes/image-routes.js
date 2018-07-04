/*jshint esversion: 6 */
/* global __dirname */

(() => {
  "use strict";

  const AbstractRoutes = require(`${__dirname}/abstract-routes`);
  const imageUploads = require(`${__dirname}/../images/uploads`);

  /**
   * Image routes
   */
  class ImageRoutes extends AbstractRoutes {
    
    /**
     * Constructor for image routes class
     * 
     * @param {Object} app Express app
     * @param {Object} keycloak keycloak
     */
    constructor (app, keycloak) {
      super(app, keycloak);
      
      app.post("/images", [ keycloak.protect(), imageUploads.uploadSingleMiddleware("file") ], this.catchAsync(this.imagesPost.bind(this)));
      app.delete("/images/:filename", [ keycloak.protect() ], this.catchAsync(this.imagesIdDelete.bind(this)));
    }
    
    /**
     * Handles /images post request
     * 
     * @param {Express.Request} req client request object
     * @param {Express.Response} res server response object
     **/
    async imagesPost(req, res) {
      res.send([{
        filename: req.file.filename,
        originalname: req.file.filename,
        url: imageUploads.getUrl(req.file.filename)
      }]);
    }

    /**
     * Handles /images/:id delete request
     * 
     * @param {Express.Request} req client request object
     * @param {Express.Response} res server response object
     **/
    async imagesIdDelete(req, res) {
      await imageUploads.deleteImage(req.params.filename);
      res.status(204).send(); 
    }
    
  }

  module.exports = ImageRoutes;

})();

