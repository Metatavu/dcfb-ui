(() => {
  "use strict";

  /**
   * Class for item page
   */
  class Item {

    /**
     * Constructor. 
     */
    constructor() {
      this.stripeDetails = JSON.parse($(".stripe-details").val());
      this.units = 0;

      this.stripeHandler = StripeCheckout.configure({
        key: this.stripeDetails.publicKey,
        image: "https://cdn.metatavu.io/assets/mansyns/logo-small.png",
        locale: getCurrentLocale(),
        token: this.onStripeToken.bind(this)
      });

      $(document).on("click", ".item-info .result-sm-img", this.onItemInfoSmallImageClick.bind(this));
      $(document).on("click", ".buy-btn", this.onItemBuyClick.bind(this));
      $(document).on("click", ".delete-item-button", this.onDeleteItemClick.bind(this));
      $(document).on("click", ".sell-item-button", this.onItemSoldClick.bind(this));
      $(document).on("change", ".product-units", this.onProductUnitsInputChange.bind(this));
      
    }

    async onStripeToken(token) {
      const processingMessage = this.stripeDetails.processingMessage || "Processing your payment...";
      const successMessage = this.stripeDetails.successMessage || "Thank you for your purchase";

      const loadNoty = new Noty({
        theme: "bootstrap-v4",
        text: `<div class="p-4"><i class="p-2 fas fa-spinner fa-spin"></i> ${processingMessage}</div>`,
        modal: true,
        layout: "center",
        type: "info",
        closeWith: []
      }).show();

      try {
        await postJSON(`/ajax/stripe/purchase/${this.stripeDetails.itemId}`, {
          token: token.id,
          units: this.units
        });

        loadNoty.close();

        new Noty({ 
          theme: "bootstrap-v4",
          text: `<div class="p-4">${successMessage}</div>`,
          layout: "center",
          type: "success",
          timeout: 3000,
          closeWith: ["click", "button"],
          callbacks: {
            onClose: () => {
              window.location.reload(true);
            }
          }
        }).show();

      } catch(e) {
        loadNoty.close();

        new Noty({ 
          theme: "bootstrap-v4",
          text: JSON.stringify(e),
          layout: "center",
          type: "error",
          closeWith: ["click", "button"]
        }).show();
      }
    }

    async onDeleteItemClick(e) {
      const buttonElement = $(e.target).closest(".delete-item-button");
      const itemId = buttonElement.attr("data-item-id");
      const promptText = buttonElement.attr("data-prompt-message");
      const successText = buttonElement.attr("data-success-message");
      const yesText = buttonElement.attr("data-yes-button-text");
      const noText = buttonElement.attr("data-no-button-text");
      const deletePrompt = new Noty({
        type: 'alert',
        text: promptText,
        buttons: [
          Noty.button(yesText, "btn btn-danger", async () => {
            try {
              await deleteJSON("/delete/item", itemId);
              deletePrompt.close();
              new Noty({
                timeout: 3000,
                text: successText,
                type: "info",
                callbacks: {
                  onClose: () => {
                    window.location.href = "/";
                  }
                }
              }).show();
            } catch (err) {
              deletePrompt.close();
              new Noty({
                timeout: 3000,
                text: "There was an error deleting item.",
                type: "error"
              }).show();
            }
          }),
          Noty.button(noText, "btn btn-default", () => {
            deletePrompt.close();
          })
        ]
      }).show();
    }

    async onItemSoldClick(e) {
      const buttonElement = $(e.target).closest(".sell-item-button");
      const itemId = buttonElement.attr("data-item-id");
      const promptText = buttonElement.attr("data-prompt-message");
      const yesText = buttonElement.attr("data-yes-button-text");
      const noText = buttonElement.attr("data-no-button-text");
      const sellPrompt = new Noty({
        type: "info",
        layout: "center",
        theme: "bootstrap-v4",
        closeWith: ["button"],
        text: promptText + "<br/><input type='number' step='1' name='sold-amount-input' />",
        buttons: [
          Noty.button(yesText, "btn btn-success", async () => {
            try {
              const response = await putJSON("/ajax/item/sell", itemId, {
                amount: $("input[name='sold-amount-input']").val()
              });
              sellPrompt.close();
              new Noty({
                timeout: 3000,
                text: response.message,
                type: "success",
                callbacks: {
                  onClose: () => {
                    window.location.reload()
                  }
                }
              }).show();
            } catch (err) {
              sellPrompt.close();
              new Noty({
                timeout: 3000,
                text: "There was an error updating item.",
                type: "error"
              }).show();
            }
          }),
          Noty.button(noText, "btn btn-default", () => {
            sellPrompt.close();
          })
        ]
      }).show();
    }

    onItemInfoSmallImageClick(event) {
      const smallImage = $(event.target);
      const image = $(smallImage).closest(".result-img");
      image.css("background-image", smallImage.css("background-image"));
    }

    onItemBuyClick(event) {
      event.preventDefault();

      this.units = $(".product-units").val();
      const amount = this.units * Math.round(parseFloat(this.stripeDetails.unitPrice.price) * 100);

      this.stripeHandler.open({
        name: "Mansyns",
        description: this.stripeDetails.productDescription,
        currency: this.stripeDetails.unitPrice.currency,
        amount: amount
      });

    }

    onProductUnitsInputChange(event) {
      event.preventDefault();
      const input = $(".product-units");
      let value = parseInt(input.val()) || 0;
      const max = input.attr("max");

      if (value > max) {
        value = max;
        input.val(value);
      }

      if (value > 0) {
        $(".buy-btn").removeAttr("disabled");
      } else {
        $(".buy-btn").attr("disabled", "disabled");
      }
    }

  }
  
  $(document).ready(() => {
    new Item();
  });

})();