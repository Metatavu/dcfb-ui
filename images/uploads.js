(() => {
  "use strict";

  const config = require("nconf");
  const multer = require("multer");
  const path = require("path");
  const fs = require("fs");
  const slugify = require("slugify");
  const mime = require('mime');

  /**
   * Class for handling image uploads
   */
  class ImageUploads {

    /**
     * Constructor
     */
    constructor() {
      this.allowedExtensions = [".png", ".jpg", ".gif", ".jpeg"];

      this.path = config.get("images:store-path");
      this.storage = multer.diskStorage({
        destination: this.storageDestination.bind(this),
        filename: this.storageFilename.bind(this)
      });

      this.upload = multer({
        storage: this.storage, 
        fileFilter: this.uploadFileFilter.bind(this),
        limits: {
          fileSize: config.get("images:max-file-size") || 2097152,
          files: 1
        } 
      });
    }

    /**
     * Middleware for uploading single file. The file will be stored in req.file
     * 
     * @param {String} fieldName file's field name in request
     * @return {Object} middleware 
     */
    uploadSingleMiddleware(fieldName) {
      return this.upload.single(fieldName);
    }

    /**
     * Returns URL for a file
     * 
     * @param {String} filename filename
     * @return {String} file URL
     */
    getUrl(filename) {
      return `${config.get("images:base-url")}/${filename}`;
    }

    /**
     * Returns path for a file
     * 
     * @param {String} filename filename
     * @return {String} file path
     */
    getPath(filename) {
      return `${this.path}/${filename.replace(/\//g, "")}`;
    }

    /**
     * Returns mime type for a file
     * 
     * @param {String} filename filename
     * @return {String} file type
     */
    getType(filename) {
      return mime.getType(path.extname(filename));
    }

    /**
     * Deletes previously uploaded image
     * 
     * @param {String} filename filename 
     */
    deleteImage(filename) {
      return new Promise((resolve, reject) => {
        fs.unlink(this.getPath(filename), (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }

    /**
     * Filter for incoming files. Prevents other file types than images from beign uploadeds
     * 
     * @param {Express.Request} req client request object
     * @param {Express.Multer.File} file file
     * @param {Function} callback callback
     */
    uploadFileFilter(req, file, callback) {
      const ext = path.extname(file.originalname);

      if (this.allowedExtensions.includes(ext)) {
        return callback(null, true);
      }

      callback(new Error("Only images are allowed"));
    }

    /**
     * Resolves storage destination
     * 
     * @param {Express.Request} req client request object
     * @param {Express.Multer.File} file file
     * @param {Function} callback callback
     */
    storageDestination(req, file, callback) {
      callback(this.path === null ? "Image path is null" : null, this.path);
    }

    /**
     * Resolves storage filename
     * 
     * @param {Express.Request} req client request object
     * @param {Express.Multer.File} file file
     * @param {Function} callback callback
     */
    storageFilename(req, file, callback) {
      let fileName = slugify(file.originalname, {
        replacement: "-",
        lower: true
      });

      let fileCount = 0;
      let filePath = this.getPath(fileName);
      let nameWithoutExtension = fileName;
      let extension = '';

      if (fileName.lastIndexOf(".") > -1 ){
        nameWithoutExtension = fileName.substring(0, fileName.lastIndexOf("."));
        extension = fileName.substring(fileName.lastIndexOf("."));
      }

      while (fs.existsSync(filePath)) {
        fileCount++;
        fileName = nameWithoutExtension + '_' + fileCount + extension;
        filePath = this.getPath(fileName);
      }

      callback(null, fileName);
    }

  }

  module.exports = new ImageUploads();

})();