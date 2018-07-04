/** global Noty */
(() => {
  "use strict";

  /**
   * Class for uploading images
   */
  class ImageUpload {

    /**
     * Constructor.
     * 
     * @param {Object} options options
     * @param {int} options.maxFileSize maximum upload size. Defaults to 2097152 (2 MB)
     * @param {String} options.progressBar progress bar element selector
     * @param {String} options.fileInput file input element selector
     * @param {String} options.addFileButton add file button element selector
     * @param {String} options.filesContainer uploaded files container element selector
     */
    constructor(options) {
      this.options = options;

      $(this.options.progressBar).hide();
      $(this.options.addFileButton).click(this.onAddFileButtonClick.bind(this));
      $(this.options.filesContainer).on("click", ".remove-file-button", this.onRemoveFileButtonClick.bind(this));
      $(this.options.fileInput)
        .hide()
        .css({ opacity: 0 })
        .fileupload(Object.assign({
          maxFileSize: this.options.maxFileSize || 2097152,
          dataType: "json",
          url: "/images",
          acceptFileTypes: /(\.|\/)(gif|jpe?g|png)$/i,
          add : this.onUploadAdd.bind(this),
          fail: this.onUploadFail.bind(this),
          done : this.onUploadDone.bind(this),
          stop: this.onUploadStop.bind(this),
          progressall : this.onProgressAll.bind(this) 
        }));
    }

    /**
     * Disables the add file button
     */
    disableAddFileButton() {
      $(this.options.addFileButton)
        .attr("disabled", "disabled")
        .prop("disabled", true)
        .addClass("disabled");
    }

    /**
     * Enables the add file button
     */
    enableAddFileButton() {
      $(this.options.addFileButton)
        .removeAttr("disabled")
        .prop("disabled", false)
        .removeClass("disabled");
    }

    /**
     * Refresh files list into the hidden input
     */
    refreshHiddenInput() {
      const files = $(this.options.filesContainer).find("button").map((index, button) => {
        return $(button).attr("data-filename");
      }).get().join(",");

      $(this.options.hiddenInput).val(files);
    }
    
    /**
     * Event hander triggered when file is added to the filecomponent
     * 
     * @param {Object} event 
     * @param {Object} data 
     */
    onUploadAdd(event, data) {
      const maxFileSize = $(this.options.fileInput).fileupload("option", "maxFileSize");
      const acceptFileTypes = $(this.options.fileInput).fileupload("option", "acceptFileTypes");
      const validationErrors = [];

      const files = data.originalFiles;
      for (let i = 0; i < files.length; i++) {
        if (files[i].type && !acceptFileTypes.test(files[i].type)) {
          validationErrors.push($(this.options.fileInput).attr("data-invalid-file-type"));
        }

        if (files[i].size && files[i].size > maxFileSize) {
          validationErrors.push($(this.options.fileInput).attr("data-file-size-too-big"));
        }
      }

      if (validationErrors.length) {
        new Noty({
          timeout: 5000,
          text: validationErrors.join(", "),
          type: "error"
        }).show();  
      } else {
        $(this.options.progressBar)
          .removeClass("bg-danger bg-success progress-bar-animated")
          .css({ "width": "0%" })
          .addClass("progress-bar-animated progress-bar-striped")
          .show();

        this.disableAddFileButton();
        data.submit();
      }
    }

    /**
     * Event hander triggered when file uploading has failed
     */
    onUploadFail() {
      $(this.options.progressBar)
        .removeClass("progress-bar-animated progress-bar-striped")
        .addClass("bg-danger");

      new Noty({
        timeout: 5000,
        text: $(this.options.fileInput).attr("data-upload-fail-message"),
        type: "error"
      }).show();

      this.enableAddFileButton();
    } 

    /**
     * Event hander triggered when all files are uploaded
     * 
     * @param {Object} event 
     * @param {Object} data 
     */
    onUploadStop() {
      this.enableAddFileButton();
 
      $(this.options.progressBar)
        .removeClass("progress-bar-animated progress-bar-striped")
        .addClass("bg-success")
        .css({ "width": "100%" });
    }

    /**
     * Event hander triggered when single file is uploaded
     * 
     * @param {Object} event 
     * @param {Object} data 
     */
    onUploadDone(event, data) {
      data.result.forEach((file) => {
        const row = $("<div>")
          .addClass("file row mt-1")
          .appendTo(this.options.filesContainer);

        const cell = $("<div>")
          .addClass("col-12")
          .appendTo(row);

        $("<a>")
          .attr({
            "href": file.url,
            "target": "blank"
          })
          .text(file.originalname)
          .appendTo(cell);

        $("<button>")
          .addClass("remove-file-button btn btn-danger btn-sm float-right")
          .attr("data-filename", file.filename)
          .text($(this.options.fileInput).attr("data-remove-button-text"))
          .appendTo(cell);

        this.refreshHiddenInput();
      });
    }

    /**
     * Event hander triggered when uploading progress updates
     * 
     * @param {Object} event 
     * @param {Object} data 
     */
    onProgressAll(event, data) {
      const progress = parseInt(data.loaded / data.total * 100, 10);
      $(this.options.progressBar).css({ "width": progress + "%" });
    }
    
    /**
     * Event hander for add file button click
     * 
     * @param {Object} event 
     */
    onAddFileButtonClick(event) {
      event.preventDefault();
      $(this.options.fileInput).click();
    }

    /**
     * Event hander for remove file button click
     * 
     * @param {Object} event 
     */
    onRemoveFileButtonClick(event) {
      event.preventDefault();
      
      const button = $(event.target).closest(".remove-file-button");
      const filename = button.attr("data-filename");
      
      $.ajax({
        url: `/images/${filename}`,
        method: "DELETE",
        success: () => {
          $(button).closest(".file").remove();
          this.refreshHiddenInput();
        }
      });
    }

  }

  window.ImageUpload = ImageUpload;

})();