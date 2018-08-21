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
        image: 'https://cdn.metatavu.io/assets/mansyns/logo.png',
        locale: getCurrentLocale(),
        token: this.onStripeToken.bind(this)
      });

      $(document).on("click", ".item-info .result-sm-img", this.onItemInfoSmallImageClick.bind(this));
      $(document).on("click", ".buy-btn", this.onItemBuyClick.bind(this));
    }

    async onStripeToken(token) {
      const processingMessage = this.stripeDetails.processingMessage || "Processing your payment...";
      const successMessage = this.stripeDetails.successMessage|| "Thank you for your purchase";

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
          text: `<div class="p-4"><i class="p-2 fas fa-thumbs-up"></i> ${successMessage}</div>`,
          layout: "center",
          type: "success",
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

  }
  
  $(document).ready(() => {
    new Item();
  });

})();