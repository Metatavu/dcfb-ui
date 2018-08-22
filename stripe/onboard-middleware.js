(() => {
  "use strict";
  
  /**
   * Middleware that ensures that user has onboarded to Stripe
   * 
   * @param {Express.Request} req client request object
   * @param {Express.Response} res server response object
   * @param {Function} next next callback
   **/
  module.exports = (req, res, next) => {
    const kauth = req.kauth;
    if (!kauth || !kauth.grant || !kauth.grant.access_token) {
      res.sendStatus(403);
      return;
    }

    const accessToken = kauth.grant.access_token.content || {};
    const stripe = accessToken["stripe"] || req.session.stripe || {};

    if (!stripe.accountId) {
      res.redirect("/stripe/onboard");
      return;
    }
    
    next();
  };

})();